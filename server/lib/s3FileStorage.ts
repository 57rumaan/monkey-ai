import type { FileStorageProvider } from '../lib/fileStorage.js';

interface S3Config {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle?: boolean;
}

function getEnvOrThrow(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

function validatePathComponent(value: string, label: string): void {
  if (!value || value.includes('..') || value.includes('/') || value.includes('\\')) {
    throw new Error(`Invalid ${label}`);
  }
}

export class S3FileStorage implements FileStorageProvider {
  private config: S3Config;
  private baseUrl: string;

  constructor(config?: S3Config) {
    this.config = config || {
      endpoint: getEnvOrThrow('S3_ENDPOINT'),
      region: process.env.S3_REGION || 'us-east-1',
      bucket: getEnvOrThrow('S3_BUCKET'),
      accessKeyId: getEnvOrThrow('S3_ACCESS_KEY_ID'),
      secretAccessKey: getEnvOrThrow('S3_SECRET_ACCESS_KEY'),
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    };

    const endpoint = this.config.endpoint.replace(/\/+$/, '');
    this.baseUrl = `${endpoint}/${this.config.bucket}`;
  }

  private getKey(userId: string, filename: string): string {
    return `uploads/${userId}/${filename}`;
  }

  private async s3Request(method: string, key: string, body?: Buffer, contentType?: string): Promise<Response> {
    const { createHmac } = await import('crypto');
    const date = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = date.slice(0, 8);
    const amzDate = date;

    const url = new URL(`${this.baseUrl}/${key}`);
    const path = url.pathname;

    const payloadHash = body ? await this.sha256Hex(body) : 'UNSIGNED-PAYLOAD';

    const headers: Record<string, string> = {
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
    };

    if (contentType) {
      headers['content-type'] = contentType;
    }

    const signedHeaderKeys = Object.keys(headers).sort().join(';');
    const canonicalHeaders = Object.keys(headers).sort()
      .map(k => `${k}:${headers[k]}`)
      .join('\n') + '\n';

    const canonicalRequest = [
      method,
      path,
      '',
      canonicalHeaders,
      signedHeaderKeys,
      payloadHash,
    ].join('\n');

    const canonicalRequestHash = await this.sha256Hex(canonicalRequest);
    const credentialScope = `${dateStamp}/${this.config.region}/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      canonicalRequestHash,
    ].join('\n');

    const signingKey = await this.getSigningKey(this.config.secretAccessKey, dateStamp, this.config.region);
    const signature = await this.hmacHex(signingKey, stringToSign);

    const authHeader = `AWS4-HMAC-SHA256 Credential=${this.config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaderKeys}, Signature=${signature}`;

    const allHeaders: Record<string, string> = {
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      'Authorization': authHeader,
    };

    if (contentType) {
      allHeaders['Content-Type'] = contentType;
    }

    if (body) {
      allHeaders['Content-Length'] = String(body.length);
    }

    const res = await fetch(url.toString(), {
      method,
      headers: allHeaders,
      body: body || undefined,
    });

    return res;
  }

  private async sha256Hex(data: string | Buffer): Promise<string> {
    const { createHash } = await import('crypto');
    return createHash('sha256').update(data).digest('hex');
  }

  private async hmacHex(key: string | Buffer, data: string): Promise<string> {
    const { createHmac } = await import('crypto');
    return createHmac('sha256', key).update(data).digest('hex');
  }

  private async getSigningKey(secret: string, dateStamp: string, region: string): Promise<Buffer> {
    const { createHmac } = await import('crypto');
    const kDate = createHmac('sha256', `AWS4${secret}`).update(dateStamp).digest();
    const kRegion = createHmac('sha256', kDate).update(region).digest();
    const kService = createHmac('sha256', kRegion).update('s3').digest();
    const kSigning = createHmac('sha256', kService).update('aws4_request').digest();
    return kSigning;
  }

  async upload(userId: string, filename: string, buffer: Buffer): Promise<void> {
    validatePathComponent(userId, 'userId');
    validatePathComponent(filename, 'filename');
    const key = this.getKey(userId, filename);
    const res = await this.s3Request('PUT', key, buffer, 'application/octet-stream');
    if (!res.ok) {
      throw new Error('S3 upload failed');
    }
  }

  async download(userId: string, filename: string): Promise<Buffer> {
    validatePathComponent(userId, 'userId');
    validatePathComponent(filename, 'filename');
    const key = this.getKey(userId, filename);
    const res = await this.s3Request('GET', key);
    if (!res.ok) {
      throw new Error('S3 download failed');
    }
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async delete(userId: string, filename: string): Promise<void> {
    validatePathComponent(userId, 'userId');
    validatePathComponent(filename, 'filename');
    const key = this.getKey(userId, filename);
    const res = await this.s3Request('DELETE', key);
    if (!res.ok && res.status !== 404) {
      throw new Error('S3 delete failed');
    }
  }

  async exists(userId: string, filename: string): Promise<boolean> {
    validatePathComponent(userId, 'userId');
    validatePathComponent(filename, 'filename');
    const key = this.getKey(userId, filename);
    const res = await this.s3Request('HEAD', key);
    return res.ok;
  }

  async listFiles(userId: string): Promise<string[]> {
    validatePathComponent(userId, 'userId');
    const prefix = `uploads/${userId}/`;
    const { createHmac } = await import('crypto');
    const date = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = date.slice(0, 8);
    const amzDate = date;

    const url = new URL(`${this.baseUrl}?list-type=2&prefix=${encodeURIComponent(prefix)}`);
    const host = url.host;
    const pathWithQuery = url.pathname + url.search;

    const headers: Record<string, string> = {
      'Host': host,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
    };

    const signedHeaderKeys = Object.keys(headers).sort().join(';');
    const canonicalHeaders = Object.keys(headers).sort()
      .map(k => `${k.toLowerCase()}:${headers[k]}`)
      .join('\n') + '\n';

    const canonicalRequest = [
      'GET',
      pathWithQuery,
      '',
      canonicalHeaders,
      signedHeaderKeys,
      'UNSIGNED-PAYLOAD',
    ].join('\n');

    const canonicalRequestHash = await this.sha256Hex(canonicalRequest);
    const credentialScope = `${dateStamp}/${this.config.region}/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      canonicalRequestHash,
    ].join('\n');

    const signingKey = await this.getSigningKey(this.config.secretAccessKey, dateStamp, this.config.region);
    const signature = await this.hmacHex(signingKey, stringToSign);

    const authHeader = `AWS4-HMAC-SHA256 Credential=${this.config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaderKeys}, Signature=${signature}`;

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Host': host,
        'x-amz-date': amzDate,
        'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
        'Authorization': authHeader,
      },
    });

    if (!res.ok) return [];

    const xml = await res.text();
    const keys: string[] = [];
    const keyRegex = /<Key>([^<]+)<\/Key>/g;
    let match;
    while ((match = keyRegex.exec(xml)) !== null) {
      const fullKey = match[1];
      if (fullKey.startsWith(prefix)) {
        keys.push(fullKey.slice(prefix.length));
      }
    }
    return keys;
  }
}

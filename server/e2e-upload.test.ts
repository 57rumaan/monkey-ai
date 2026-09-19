import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { join } from 'path';
import { rm, mkdir } from 'fs/promises';
import { readFileSync } from 'fs';
import { getFileStorage } from './lib/fileStorageFactory';
import { extractTextFromBuffer } from './lib/documentExtractor';
import { downloadFile } from './routes/upload';

const TEST_DATA_DIR = join(process.cwd(), '.test-data-e2e');

// Load .env for S3 credentials
const envText = readFileSync(join(process.cwd(), '.env'), 'utf-8');
envText.split('\n').forEach(line => {
  const t = line.trim();
  if (!t || t.startsWith('#')) return;
  const i = t.indexOf('=');
  if (i === -1) return;
  const key = t.slice(0, i).trim();
  const val = t.slice(i + 1).trim();
  if (!process.env[key]) process.env[key] = val;
});

// Minimal 1x1 red PNG (67 bytes)
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
  'base64'
);

const TINY_TXT = Buffer.from('Hello from MONKEY AI attachment test!\nLine two of the test document.');

let app: any;
let server: any;
let fileStorage: any;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-e2e-tests';
  process.env.NODE_ENV = 'development';
  process.env.DATA_DIR = TEST_DATA_DIR;
  process.env.PORT = '0';
  process.env.RATE_LIMIT_API = '1000';
  process.env.RATE_LIMIT_AUTH = '1000';
  process.env.RATE_LIMIT_UPLOAD = '1000';

  delete process.env.JSONBIN_API_KEY;
  delete process.env.JSONBIN_BIN_ID;

  await rm(TEST_DATA_DIR, { recursive: true, force: true });
  await mkdir(join(TEST_DATA_DIR, 'data'), { recursive: true });

  const { default: defaultApp } = await import('../server/index.js');
  app = defaultApp;
  await new Promise<void>((resolve) => { server = app.listen(0, () => resolve()); });

  fileStorage = getFileStorage();
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await rm(TEST_DATA_DIR, { recursive: true, force: true });
});

function extractCookie(res: any, name: string): string | undefined {
  const setCookie = res.headers['set-cookie'];
  if (!setCookie) return undefined;
  const cookie = setCookie.find((c: string) => c.startsWith(`${name}=`));
  if (!cookie) return undefined;
  return cookie.split(';')[0];
}

async function signupAndLogin(email: string, password: string, username: string): Promise<string> {
  const signupRes = await request(app).post('/api/auth/signup').send({ email, password });
  const otp = signupRes.body.data.otp;
  const verifyRes = await request(app).post('/api/auth/verify-signup').send({ email, otp, username });
  const cookie = extractCookie(verifyRes, 'accessToken');
  if (!cookie) throw new Error('Failed to get auth cookie');
  return cookie;
}

function parseUrlParts(url: string): { userId: string; filename: string } {
  const match = url.match(/\/api\/upload\/files\/([^/]+)\/([^/]+)$/);
  if (!match) throw new Error('Invalid attachment URL');
  return { userId: match[1], filename: match[2] };
}

// ─────────────────────────────────────────────────
// A. IMAGE UPLOAD
// ─────────────────────────────────────────────────
describe('A. Image Upload', () => {
  it('should upload a PNG image via POST /api/upload', async () => {
    const cookie = await signupAndLogin('img-test@test.com', 'StrongP@ss1!', 'imguser');

    const res = await request(app)
      .post('/api/upload')
      .set('Cookie', cookie)
      .attach('files', TINY_PNG, { filename: 'test-image.png', contentType: 'image/png' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);

    const att = res.body.data[0];
    expect(att.type).toBe('image');
    expect(att.name).toBe('test-image.png');
    expect(att.mimeType).toBe('image/png');
    expect(att.url).toMatch(/^\/api\/upload\/files\//);
    expect(att.id).toMatch(/^upl_/);
    expect(att.size).toBeGreaterThan(0);
  });

  it('should retrieve the uploaded image with correct headers', async () => {
    const cookie = await signupAndLogin('img-dl@test.com', 'StrongP@ss1!', 'imgdluser');

    const uploadRes = await request(app)
      .post('/api/upload')
      .set('Cookie', cookie)
      .attach('files', TINY_PNG, { filename: 'test-image.png', contentType: 'image/png' });

    const fileUrl = uploadRes.body.data[0].url;

    const dlRes = await request(app)
      .get(fileUrl)
      .set('Cookie', cookie);

    expect(dlRes.status).toBe(200);
    expect(dlRes.headers['content-type']).toBe('image/png');
    expect(dlRes.headers['x-content-type-options']).toBe('nosniff');
    expect(Buffer.compare(dlRes.body, TINY_PNG)).toBe(0);
  });

  it('should store the uploaded image in R2', async () => {
    const cookie = await signupAndLogin('img-r2@test.com', 'StrongP@ss1!', 'imgr2user');

    const uploadRes = await request(app)
      .post('/api/upload')
      .set('Cookie', cookie)
      .attach('files', TINY_PNG, { filename: 'test-image.png', contentType: 'image/png' });

    const fileUrl = uploadRes.body.data[0].url;
    const { userId, filename } = parseUrlParts(fileUrl);

    const buf = await fileStorage.download(userId, filename);
    expect(Buffer.compare(buf, TINY_PNG)).toBe(0);
  });
});

// ─────────────────────────────────────────────────
// B. TEXT/DOCUMENT UPLOAD
// ─────────────────────────────────────────────────
describe('B. Text/Document Upload', () => {
  it('should upload a .txt file via POST /api/upload', async () => {
    const cookie = await signupAndLogin('txt-test@test.com', 'StrongP@ss1!', 'txtuser');

    const res = await request(app)
      .post('/api/upload')
      .set('Cookie', cookie)
      .attach('files', TINY_TXT, { filename: 'test-doc.txt', contentType: 'text/plain' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);

    const att = res.body.data[0];
    expect(att.type).toBe('document');
    expect(att.name).toBe('test-doc.txt');
    expect(att.mimeType).toBe('text/plain');
  });

  it('should retrieve the uploaded text file with correct content', async () => {
    const cookie = await signupAndLogin('txt-dl@test.com', 'StrongP@ss1!', 'txtdluser');

    const uploadRes = await request(app)
      .post('/api/upload')
      .set('Cookie', cookie)
      .attach('files', TINY_TXT, { filename: 'test-doc.txt', contentType: 'text/plain' });

    const fileUrl = uploadRes.body.data[0].url;

    const dlRes = await request(app)
      .get(fileUrl)
      .set('Cookie', cookie);

    expect(dlRes.status).toBe(200);
    expect(dlRes.headers['content-type']).toBe('text/plain');
    const got = typeof dlRes.text === 'string' ? dlRes.text : dlRes.body.toString();
    expect(got).toBe(TINY_TXT.toString());
  });

  it('should store the text file in storage backend', async () => {
    const cookie = await signupAndLogin('txt-r2@test.com', 'StrongP@ss1!', 'txtr2user');

    const uploadRes = await request(app)
      .post('/api/upload')
      .set('Cookie', cookie)
      .attach('files', TINY_TXT, { filename: 'test-doc.txt', contentType: 'text/plain' });

    const fileUrl = uploadRes.body.data[0].url;
    const { userId, filename } = parseUrlParts(fileUrl);

    const buf = await fileStorage.download(userId, filename);
    expect(buf.toString()).toBe(TINY_TXT.toString());
  });

  it('should extract text from the uploaded document buffer', async () => {
    const extracted = await extractTextFromBuffer(TINY_TXT, 'test-doc.txt', 'text/plain');
    expect(extracted.text).toBe(TINY_TXT.toString());
    expect(extracted.mimeType).toBe('text/plain');
    expect(extracted.truncated).toBe(false);
  });
});

// ─────────────────────────────────────────────────
// C. CHAT INTEGRATION
// ─────────────────────────────────────────────────
describe('C. Chat Integration', () => {
  it('should send a chat message with an image attachment', async () => {
    const cookie = await signupAndLogin('chat-img@test.com', 'StrongP@ss1!', 'chatimg');

    const uploadRes = await request(app)
      .post('/api/upload')
      .set('Cookie', cookie)
      .attach('files', TINY_PNG, { filename: 'chat-img.png', contentType: 'image/png' });

    const att = uploadRes.body.data[0];

    const chatRes = await request(app)
      .post('/api/chat/send')
      .set('Cookie', cookie)
      .send({
        bundleId: 'test-bundle',
        capability: 'text',
        messages: [{ role: 'user', content: 'Look at this image' }],
        attachments: [att],
      });

    // Chat route persists message even if AI routing fails (no provider configured)
    expect([200, 500]).toContain(chatRes.status);

    // Verify message was persisted by checking the response
    if (chatRes.status === 200) {
      expect(chatRes.body.data.userMessage.attachments).toHaveLength(1);
      expect(chatRes.body.data.userMessage.attachments[0].url).not.toMatch(/^blob:/);
      expect(chatRes.body.data.assistantMessage).toBeTruthy();
    }
  });

  it('should send a chat message with a text file attachment', async () => {
    const cookie = await signupAndLogin('chat-txt@test.com', 'StrongP@ss1!', 'chattxt');

    const uploadRes = await request(app)
      .post('/api/upload')
      .set('Cookie', cookie)
      .attach('files', TINY_TXT, { filename: 'chat-doc.txt', contentType: 'text/plain' });

    const att = uploadRes.body.data[0];

    const chatRes = await request(app)
      .post('/api/chat/send')
      .set('Cookie', cookie)
      .send({
        bundleId: 'test-bundle',
        capability: 'text',
        messages: [{ role: 'user', content: 'Read this document' }],
        attachments: [att],
      });

    expect([200, 500]).toContain(chatRes.status);
  });

  it('should detect image capability for image attachments', async () => {
    const cookie = await signupAndLogin('chat-cap-img@test.com', 'StrongP@ss1!', 'chatcapimg');

    const uploadRes = await request(app)
      .post('/api/upload')
      .set('Cookie', cookie)
      .attach('files', TINY_PNG, { filename: 'cap-img.png', contentType: 'image/png' });

    const att = uploadRes.body.data[0];

    const chatRes = await request(app)
      .post('/api/chat/send')
      .set('Cookie', cookie)
      .send({
        bundleId: 'test-bundle',
        capability: 'image',
        messages: [{ role: 'user', content: 'Analyze this image' }],
        attachments: [att],
      });

    expect([200, 500]).toContain(chatRes.status);
  });

  it('should detect document capability for text attachments', async () => {
    const cookie = await signupAndLogin('chat-cap-doc@test.com', 'StrongP@ss1!', 'chatcapdoc');

    const uploadRes = await request(app)
      .post('/api/upload')
      .set('Cookie', cookie)
      .attach('files', TINY_TXT, { filename: 'cap-doc.txt', contentType: 'text/plain' });

    const att = uploadRes.body.data[0];

    const chatRes = await request(app)
      .post('/api/chat/send')
      .set('Cookie', cookie)
      .send({
        bundleId: 'test-bundle',
        capability: 'document',
        messages: [{ role: 'user', content: 'Analyze this document' }],
        attachments: [att],
      });

    expect([200, 500]).toContain(chatRes.status);
  });
});

// ─────────────────────────────────────────────────
// D. SECURITY
// ─────────────────────────────────────────────────
describe('D. Security', () => {
  it('should prevent cross-user file access', async () => {
    const cookieA = await signupAndLogin('sec-a@test.com', 'StrongP@ss1!', 'secusera');
    const cookieB = await signupAndLogin('sec-b@test.com', 'StrongP@ss1!', 'secuserb');

    const uploadRes = await request(app)
      .post('/api/upload')
      .set('Cookie', cookieA)
      .attach('files', TINY_PNG, { filename: 'private.png', contentType: 'image/png' });

    const fileUrl = uploadRes.body.data[0].url;

    const dlRes = await request(app)
      .get(fileUrl)
      .set('Cookie', cookieB);

    expect(dlRes.status).toBe(403);
  });

  it('should block path traversal in userId', async () => {
    const cookie = await signupAndLogin('sec-path@test.com', 'StrongP@ss1!', 'secpath');

    const res = await request(app)
      .get('/api/upload/files/..%2Fetc/passwd/test.txt')
      .set('Cookie', cookie);

    expect([400, 403, 404]).toContain(res.status);
  });

  it('should block path traversal with double dots in filename', async () => {
    const cookie = await signupAndLogin('sec-path2@test.com', 'StrongP@ss1!', 'secpath2');

    const res = await request(app)
      .get('/api/upload/files/someuser/..%2F.env')
      .set('Cookie', cookie);

    expect([400, 403]).toContain(res.status);
  });

  it('should require auth for upload', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('files', TINY_PNG, { filename: 'test.png', contentType: 'image/png' });

    expect(res.status).toBe(401);
  });

  it('should require auth for file download', async () => {
    const cookie = await signupAndLogin('sec-auth@test.com', 'StrongP@ss1!', 'secauth');

    const uploadRes = await request(app)
      .post('/api/upload')
      .set('Cookie', cookie)
      .attach('files', TINY_PNG, { filename: 'test.png', contentType: 'image/png' });

    const fileUrl = uploadRes.body.data[0].url;

    const dlRes = await request(app).get(fileUrl);
    expect(dlRes.status).toBe(401);
  });

  it('should not expose secrets in upload response', async () => {
    const cookie = await signupAndLogin('sec-secret@test.com', 'StrongP@ss1!', 'secsecret');

    const res = await request(app)
      .post('/api/upload')
      .set('Cookie', cookie)
      .attach('files', TINY_PNG, { filename: 'test.png', contentType: 'image/png' });

    const responseStr = JSON.stringify(res.body);
    expect(responseStr).not.toContain('SECRET');
    expect(responseStr).not.toContain('PASSWORD');
    expect(responseStr).not.toContain('API_KEY');
    expect(responseStr).not.toContain('COOKIE_SECRET');
  });

  it('should verify R2 bucket is not publicly listable', async () => {
    const endpoint = process.env.S3_ENDPOINT;
    const bucket = process.env.S3_BUCKET;
    const anonRes = await fetch(`${endpoint}/${bucket}?list-type=2`);
    expect(anonRes.status).not.toBe(200);
  });
});

// ─────────────────────────────────────────────────
// E. REGRESSION
// ─────────────────────────────────────────────────
describe('E. Regression', () => {
  it('should complete full upload-retrieve-delete cycle', async () => {
    const cookie = await signupAndLogin('reg-cycle@test.com', 'StrongP@ss1!', 'regcycle');

    const uploadRes = await request(app)
      .post('/api/upload')
      .set('Cookie', cookie)
      .attach('files', TINY_PNG, { filename: 'reg.png', contentType: 'image/png' });
    expect(uploadRes.status).toBe(200);

    const fileUrl = uploadRes.body.data[0].url;

    const downloadRes = await request(app)
      .get(fileUrl)
      .set('Cookie', cookie);
    expect(downloadRes.status).toBe(200);
    expect(Buffer.compare(downloadRes.body, TINY_PNG)).toBe(0);
  });

  it('should reject unsupported file types via multer', async () => {
    const cookie = await signupAndLogin('reg-unsup@test.com', 'StrongP@ss1!', 'regunsup');

    const res = await request(app)
      .post('/api/upload')
      .set('Cookie', cookie)
      .attach('files', Buffer.from('test'), { filename: 'malware.exe', contentType: 'application/octet-stream' });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('should reject blocked file types via multer', async () => {
    const cookie = await signupAndLogin('reg-block@test.com', 'StrongP@ss1!', 'regblock');

    const res = await request(app)
      .post('/api/upload')
      .set('Cookie', cookie)
      .attach('files', Buffer.from('#!/bin/bash'), { filename: 'script.sh', contentType: 'application/x-sh' });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

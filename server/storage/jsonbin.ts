import type { StorageAdapter } from '../storage';

const JSONBIN_API_BASE = 'https://api.jsonbin.io/v3';
const FETCH_TIMEOUT_MS = 10_000;

interface JsonBinConfig {
  apiKey: string;
  binId: string;
}

function getEnvOrThrow(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export class JsonBinStorageAdapter implements StorageAdapter {
  private apiKey: string;
  private binId: string;
  private cache: Record<string, any> | null = null;
  private lastFetchAt = 0;
  private readonly CACHE_TTL_MS = 5_000;

  constructor(config?: JsonBinConfig) {
    this.apiKey = config?.apiKey || getEnvOrThrow('JSONBIN_API_KEY');
    this.binId = config?.binId || getEnvOrThrow('JSONBIN_BIN_ID');
  }

  private async fetchBin(): Promise<Record<string, any>> {
    const now = Date.now();
    if (this.cache && (now - this.lastFetchAt) < this.CACHE_TTL_MS) {
      return this.cache;
    }

    const res = await fetchWithTimeout(`${JSONBIN_API_BASE}/b/${this.binId}/latest`, {
      headers: { 'X-Master-Key': this.apiKey },
    });

    if (!res.ok) throw new Error(`JSONBin read failed: ${res.status}`);
    const body = await res.json() as { record?: Record<string, any> };
    const record = body.record || {};
    this.cache = record;
    this.lastFetchAt = now;
    return record;
  }

  private async writeBin(data: Record<string, any>): Promise<void> {
    const res = await fetchWithTimeout(`${JSONBIN_API_BASE}/b/${this.binId}`, {
      method: 'PUT',
      headers: {
        'X-Master-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) throw new Error(`JSONBin write failed: ${res.status}`);

    this.cache = data;
    this.lastFetchAt = Date.now();
  }

  private async getCollection(collection: string): Promise<Record<string, any>> {
    const root = await this.fetchBin();
    return root[collection] || {};
  }

  private async setCollection(collection: string, data: Record<string, any>): Promise<void> {
    const root = { ...await this.fetchBin() };
    root[collection] = data;
    await this.writeBin(root);
  }

  async get<T>(collection: string, id: string): Promise<T | null> {
    try {
      const col = await this.getCollection(collection);
      const val = col[id];
      return val !== undefined ? (val as T) : null;
    } catch (e) {
      console.error(`[JsonBin] get(${collection}/${id}) failed:`, e);
      throw e;
    }
  }

  async set<T>(collection: string, id: string, data: T): Promise<void> {
    try {
      const col = await this.getCollection(collection);
      col[id] = data;
      await this.setCollection(collection, col);
    } catch (e) {
      this.cache = null;
      console.error(`[JsonBin] set(${collection}/${id}) failed:`, e);
      throw e;
    }
  }

  async delete(collection: string, id: string): Promise<void> {
    try {
      const col = await this.getCollection(collection);
      delete col[id];
      await this.setCollection(collection, col);
    } catch (e) {
      this.cache = null;
      console.error(`[JsonBin] delete(${collection}/${id}) failed:`, e);
      throw e;
    }
  }

  async list<T>(collection: string): Promise<T[]> {
    try {
      const col = await this.getCollection(collection);
      return Object.values(col) as T[];
    } catch (e) {
      console.error(`[JsonBin] list(${collection}) failed:`, e);
      throw e;
    }
  }

  async query<T>(collection: string, filter: Partial<T>): Promise<T[]> {
    const all = await this.list<T>(collection);
    return all.filter(item => {
      return Object.entries(filter).every(([key, value]) => (item as any)[key] === value);
    });
  }

  async getPaginated<T>(
    collection: string,
    page: number,
    pageSize: number,
    filter?: Partial<T>
  ): Promise<{ items: T[]; total: number; page: number; pageSize: number; totalPages: number }> {
    let items = await this.list<T>(collection);

    if (filter) {
      items = items.filter(item => {
        return Object.entries(filter).every(([key, value]) => (item as any)[key] === value);
      });
    }

    const total = items.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const paged = items.slice(start, start + pageSize);

    return { items: paged, total, page, pageSize, totalPages };
  }

  invalidateCache(): void {
    this.cache = null;
    this.lastFetchAt = 0;
  }
}

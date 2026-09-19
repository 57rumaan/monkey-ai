import type { StorageAdapter } from '../storage.js';

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

function safeBinFingerprint(binId: string): string {
  if (binId.length <= 8) return '****';
  return `${binId.slice(0, 4)}...${binId.slice(-4)}`;
}

function safeRootKeys(root: Record<string, any>): string {
  const keys = Object.keys(root);
  return keys.length > 0 ? keys.join(',') : '<empty>';
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function collectionEntryCount(col: unknown): number {
  if (!col) return 0;
  if (Array.isArray(col)) return col.length;
  if (typeof col === 'object') return Object.keys(col).length;
  return 0;
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

let loggedStartup = false;

type WriteTask = () => Promise<void>;

export class JsonBinStorageAdapter implements StorageAdapter {
  private apiKey: string;
  private binId: string;
  private cache: Record<string, any> | null = null;
  private lastFetchAt = 0;
  private readonly CACHE_TTL_MS = 5_000;
  private putCount = 0;
  private writeQueue: WriteTask[] = [];
  private writeRunning = false;

  constructor(config?: JsonBinConfig) {
    this.apiKey = config?.apiKey || getEnvOrThrow('JSONBIN_API_KEY');
    this.binId = config?.binId || getEnvOrThrow('JSONBIN_BIN_ID');

    if (!loggedStartup) {
      loggedStartup = true;
      console.log(`[JsonBin] INIT adapter=JsonBinStorageAdapter bin=${safeBinFingerprint(this.binId)} cache_ttl=${this.CACHE_TTL_MS}ms`);
    }
  }

  private enqueueWrite(task: WriteTask): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.writeQueue.push(async () => {
        try {
          await task();
          resolve();
        } catch (e) {
          reject(e);
        }
      });
      this.processWriteQueue();
    });
  }

  private async processWriteQueue(): Promise<void> {
    if (this.writeRunning) return;
    this.writeRunning = true;
    while (this.writeQueue.length > 0) {
      const task = this.writeQueue.shift()!;
      await task();
    }
    this.writeRunning = false;
  }

  private async fetchBin(forceRefresh = false): Promise<Record<string, any>> {
    const now = Date.now();
    if (!forceRefresh && this.cache && (now - this.lastFetchAt) < this.CACHE_TTL_MS) {
      return this.cache;
    }

    const cacheAge = this.lastFetchAt > 0 ? `${now - this.lastFetchAt}ms` : 'never';
    const reason = forceRefresh ? 'bypass' : (this.cache === null ? 'cold' : `ttl_expired(age=${cacheAge})`);
    console.log(`[JsonBin] GET /latest reason=${reason}`);

    const res = await fetchWithTimeout(`${JSONBIN_API_BASE}/b/${this.binId}/latest`, {
      headers: { 'X-Master-Key': this.apiKey },
    });

    if (!res.ok) {
      console.error(`[JsonBin] GET /latest FAILED status=${res.status} statusText=${res.statusText}`);
      throw new Error(`JSONBin read failed: ${res.status}`);
    }

    const body = await res.json() as { record?: Record<string, any>; id?: string; version?: number };
    const record = body.record || {};

    const rootKeys = Object.keys(record);
    const usersCount = record.users ? collectionEntryCount(record.users) : 0;
    console.log(`[JsonBin] GET /latest OK status=200 root_keys=[${safeRootKeys(record)}] users_count=${usersCount} version=${body.version ?? 'n/a'}`);

    this.cache = record;
    this.lastFetchAt = now;
    return record;
  }

  private async writeBin(data: Record<string, any>): Promise<void> {
    this.putCount++;
    const usersCount = data.users ? collectionEntryCount(data.users) : 0;
    console.log(`[JsonBin] PUT /b/{bin} #${this.putCount} root_keys=[${safeRootKeys(data)}] users_count=${usersCount}`);

    const res = await fetchWithTimeout(`${JSONBIN_API_BASE}/b/${this.binId}`, {
      method: 'PUT',
      headers: {
        'X-Master-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      console.error(`[JsonBin] PUT FAILED #${this.putCount} status=${res.status} statusText=${res.statusText}`);
      throw new Error(`JSONBin write failed: ${res.status}`);
    }

    let resBody: any = null;
    try {
      resBody = await res.json();
    } catch {
      // response body may not be JSON
    }

    const resVersion = resBody?.version ?? 'n/a';
    const resId = resBody?.id ?? 'n/a';
    const resRecordKeys = resBody?.record ? Object.keys(resBody.record).length : 'no_record_field';
    console.log(`[JsonBin] PUT OK #${this.putCount} status=${res.status} resVersion=${resVersion} resId=${resId} resRecordKeys=${resRecordKeys}`);

    this.cache = deepClone(data);
    this.lastFetchAt = Date.now();
  }

  async get<T>(collection: string, id: string): Promise<T | null> {
    try {
      const root = await this.fetchBin(false);
      const col = root[collection] || {};
      const val = col[id];
      return val !== undefined ? (val as T) : null;
    } catch (e) {
      console.error(`[JsonBin] get(${collection}/${id}) failed:`, e);
      throw e;
    }
  }

  async set<T>(collection: string, id: string, data: T): Promise<void> {
    return this.enqueueWrite(async () => {
      try {
        const root = await this.fetchBin(false);
        const existingCol = root[collection] || {};
        const updatedCol = deepClone(existingCol);
        updatedCol[id] = data;

        const keysBefore = safeRootKeys(root);
        const entriesBefore = collectionEntryCount(existingCol);
        const entriesAfter = collectionEntryCount(updatedCol);

        const newRoot = deepClone(root);
        newRoot[collection] = updatedCol;

        console.log(`[JsonBin] set ${collection}/${id}: keys=[${keysBefore}] entries_before=${entriesBefore} entries_after=${entriesAfter}`);

        await this.writeBin(newRoot);

        const usersCount = collection === 'users' ? collectionEntryCount(updatedCol) : undefined;
        console.log(`[JsonBin] set OK: ${collection}/${id} users_count=${usersCount ?? 'n/a'}`);
      } catch (e) {
        this.cache = null;
        console.error(`[JsonBin] set(${collection}/${id}) failed:`, e);
        throw e;
      }
    });
  }

  async delete(collection: string, id: string): Promise<void> {
    return this.enqueueWrite(async () => {
      try {
        const root = await this.fetchBin(false);
        const existingCol = root[collection] || {};
        const updatedCol = deepClone(existingCol);
        delete updatedCol[id];

        const newRoot = deepClone(root);
        newRoot[collection] = updatedCol;

        await this.writeBin(newRoot);
      } catch (e) {
        this.cache = null;
        console.error(`[JsonBin] delete(${collection}/${id}) failed:`, e);
        throw e;
      }
    });
  }

  async list<T>(collection: string, forceRefresh = false): Promise<T[]> {
    try {
      const root = await this.fetchBin(forceRefresh);
      const col = root[collection] || {};
      return Object.values(col) as T[];
    } catch (e) {
      console.error(`[JsonBin] list(${collection}) failed:`, e);
      throw e;
    }
  }

  async query<T>(collection: string, filter: Partial<T>, options?: { bypassCache?: boolean }): Promise<T[]> {
    const bypass = options?.bypassCache === true;
    const all = await this.list<T>(collection, bypass);
    const filtered = all.filter(item => {
      return Object.entries(filter).every(([key, value]) => (item as any)[key] === value);
    });
    if (collection === 'users') {
      const filterKeys = Object.keys(filter);
      console.log(`[JsonBin] query users: filter_keys=${filterKeys.join(',')} bypass=${bypass} total=${all.length} matched=${filtered.length}`);
    }
    return filtered;
  }

  async getPaginated<T>(
    collection: string,
    page: number,
    pageSize: number,
    filter?: Partial<T>,
    options?: { bypassCache?: boolean }
  ): Promise<{ items: T[]; total: number; page: number; pageSize: number; totalPages: number }> {
    let items = await this.list<T>(collection, options?.bypassCache === true);

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

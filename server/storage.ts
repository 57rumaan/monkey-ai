import { readFile, writeFile, readdir, unlink } from 'fs/promises';
import { join } from 'path';

export interface StorageAdapter {
  get<T>(collection: string, id: string): Promise<T | null>;
  set<T>(collection: string, id: string, data: T): Promise<void>;
  delete(collection: string, id: string): Promise<void>;
  list<T>(collection: string): Promise<T[]>;
  query<T>(collection: string, filter: Partial<T>, options?: { bypassCache?: boolean }): Promise<T[]>;
  getPaginated<T>(
    collection: string,
    page: number,
    pageSize: number,
    filter?: Partial<T>,
    options?: { bypassCache?: boolean }
  ): Promise<{ items: T[]; total: number; page: number; pageSize: number; totalPages: number }>;
}

const DATA_DIR = join(process.env.DATA_DIR || process.cwd(), 'data');

async function ensureDataDir(): Promise<void> {
  try {
    await readdir(DATA_DIR);
  } catch {
    await writeFile(join(DATA_DIR, '.gitkeep'), '');
  }
}

async function getCollectionFiles(collection: string): Promise<string[]> {
  await ensureDataDir();
  const dir = join(DATA_DIR, collection);
  try {
    return await readdir(dir);
  } catch {
    return [];
  }
}

async function listImpl<T>(collection: string): Promise<T[]> {
  await ensureDataDir();
  const dir = join(DATA_DIR, collection);
  try {
    const files = await readdir(dir);
    const results: T[] = [];
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const data = await readFile(join(dir, file), 'utf-8');
          results.push(JSON.parse(data));
        } catch {
          // skip invalid
        }
      }
    }
    return results;
  } catch {
    return [];
  }
}

async function queryImpl<T>(collection: string, filter: Partial<T>): Promise<T[]> {
  const all = await listImpl<T>(collection);
  return all.filter(item => {
    return Object.entries(filter).every(([key, value]) => {
      if (value === undefined) return true;
      return (item as Record<string, unknown>)[key] === value;
    });
  });
}

class FileStorageAdapter implements StorageAdapter {
  async get<T>(collection: string, id: string): Promise<T | null> {
    await ensureDataDir();
    try {
      const data = await readFile(join(DATA_DIR, collection, `${id}.json`), 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async set<T>(collection: string, id: string, data: T): Promise<void> {
    await ensureDataDir();
    const dir = join(DATA_DIR, collection);
    try {
      await readdir(dir);
    } catch {
      await import('fs/promises').then(fs => fs.mkdir(dir, { recursive: true }));
    }
    await writeFile(join(DATA_DIR, collection, `${id}.json`), JSON.stringify(data, null, 2));
  }

  async delete(collection: string, id: string): Promise<void> {
    try {
      await unlink(join(DATA_DIR, collection, `${id}.json`));
    } catch {
      // ignore
    }
  }

  async list<T>(collection: string): Promise<T[]> {
    return listImpl<T>(collection);
  }

  async query<T>(collection: string, filter: Partial<T>, _options?: { bypassCache?: boolean }): Promise<T[]> {
    return queryImpl<T>(collection, filter);
  }

  async getPaginated<T>(
    collection: string,
    page = 1,
    pageSize = 20,
    filter?: Partial<T>,
    _options?: { bypassCache?: boolean }
  ): Promise<{ items: T[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const items = filter ? await this.query<T>(collection, filter) : await this.list<T>(collection);
    const total = items.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const paginatedItems = items.slice(start, start + pageSize);

    return {
      items: paginatedItems,
      total,
      page,
      pageSize,
      totalPages,
    };
  }
}

import { JsonBinStorageAdapter } from './storage/jsonbin.js';

let activeAdapter: StorageAdapter = (() => {
  const isProduction = process.env.NODE_ENV === 'production';

  if (process.env.JSONBIN_API_KEY && process.env.JSONBIN_BIN_ID) {
    try {
      return new JsonBinStorageAdapter();
    } catch (e) {
      if (isProduction) {
        console.error('[FATAL] JSONBin initialization failed in production. Cannot fall back to local storage.');
        process.exit(1);
      }
      console.warn('Failed to initialize JSONBin adapter, falling back to file storage:', e);
    }
  } else if (isProduction) {
    console.error('[FATAL] JSONBin is required in production but JSONBIN_API_KEY or JSONBIN_BIN_ID is not set.');
    process.exit(1);
  }
  return new FileStorageAdapter();
})();

export function setStorageAdapter(adapter: StorageAdapter): void {
  activeAdapter = adapter;
}

export function getStorageAdapter(): StorageAdapter {
  return activeAdapter;
}

export function getStorageAdapterName(): string {
  return activeAdapter.constructor.name;
}

export const storage: StorageAdapter = {
  get: (collection, id) => activeAdapter.get(collection, id),
  set: (collection, id, data) => activeAdapter.set(collection, id, data),
  delete: (collection, id) => activeAdapter.delete(collection, id),
  list: (collection) => activeAdapter.list(collection),
  query: (collection, filter, options?) => activeAdapter.query(collection, filter, options),
  getPaginated: (collection, page, pageSize, filter, options?) => activeAdapter.getPaginated(collection, page, pageSize, filter, options),
};

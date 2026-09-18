import type { PaginatedResponse } from '@/types';

const STORAGE_BASE = typeof window !== 'undefined' ? '/api/storage' : '';

export interface StorageAdapter {
  get<T>(collection: string, id: string): Promise<T | null>;
  set<T>(collection: string, id: string, data: T): Promise<void>;
  delete(collection: string, id: string): Promise<void>;
  list<T>(collection: string): Promise<T[]>;
  query<T>(collection: string, filter: Partial<T>): Promise<T[]>;
}

class LocalStorageAdapter implements StorageAdapter {
  private prefix = 'monkey-ai:';

  private getKey(collection: string, id?: string): string {
    return `${this.prefix}${collection}${id ? `:${id}` : ''}`;
  }

  async get<T>(collection: string, id: string): Promise<T | null> {
    try {
      const data = localStorage.getItem(this.getKey(collection, id));
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  async set<T>(collection: string, id: string, data: T): Promise<void> {
    localStorage.setItem(this.getKey(collection, id), JSON.stringify(data));
  }

  async delete(collection: string, id: string): Promise<void> {
    localStorage.removeItem(this.getKey(collection, id));
  }

  async list<T>(collection: string): Promise<T[]> {
    const prefix = this.getKey(collection);
    const results: T[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix) && key !== prefix) {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            results.push(JSON.parse(data));
          } catch {
            // skip invalid
          }
        }
      }
    }
    return results;
  }

  async query<T>(collection: string, filter: Partial<T>): Promise<T[]> {
    const all = await this.list<T>(collection);
    return all.filter(item => {
      return Object.entries(filter).every(([key, value]) => {
        if (value === undefined) return true;
        return (item as Record<string, unknown>)[key] === value;
      });
    });
  }
}

class ApiStorageAdapter implements StorageAdapter {
  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${STORAGE_BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async get<T>(collection: string, id: string): Promise<T | null> {
    try {
      return await this.request<T>('GET', `/${collection}/${id}`);
    } catch {
      return null;
    }
  }

  async set<T>(collection: string, id: string, data: T): Promise<void> {
    await this.request('PUT', `/${collection}/${id}`, data);
  }

  async delete(collection: string, id: string): Promise<void> {
    await this.request('DELETE', `/${collection}/${id}`);
  }

  async list<T>(collection: string): Promise<T[]> {
    return this.request<T[]>('GET', `/${collection}`);
  }

  async query<T>(collection: string, filter: Partial<T>): Promise<T[]> {
    const params = new URLSearchParams();
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined) params.set(key, String(value));
    });
    return this.request<T[]>('GET', `/${collection}?${params.toString()}`);
  }
}

let adapter: StorageAdapter;

export function initStorage(useApi = false): void {
  adapter = useApi ? new ApiStorageAdapter() : new LocalStorageAdapter();
}

export function getStorage(): StorageAdapter {
  if (!adapter) {
    initStorage(typeof window !== 'undefined');
  }
  return adapter;
}

export const storage = {
  get: <T>(collection: string, id: string) => getStorage().get<T>(collection, id),
  set: <T>(collection: string, id: string, data: T) => getStorage().set(collection, id, data),
  delete: (collection: string, id: string) => getStorage().delete(collection, id),
  list: <T>(collection: string) => getStorage().list<T>(collection),
  query: <T>(collection: string, filter: Partial<T>) => getStorage().query<T>(collection, filter),
};

export async function getPaginated<T>(
  collection: string,
  page = 1,
  pageSize = 20,
  filter?: Partial<T>
): Promise<PaginatedResponse<T>> {
  const items = filter ? await storage.query(collection, filter) : await storage.list<T>(collection);
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
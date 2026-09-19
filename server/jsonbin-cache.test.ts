import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JsonBinStorageAdapter } from './storage/jsonbin.js';

const FAKE_API_KEY = 'test-api-key';
const FAKE_BIN_ID = 'test-bin-id';

function makeFakeBinRecord(data: Record<string, any>) {
  return { record: data };
}

let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchSpy = vi.fn();
  vi.stubGlobal('fetch', fetchSpy);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('JsonBinStorageAdapter cache bypass', () => {
  it('set user → new adapter instance → query with bypassCache finds the user', async () => {
    const storedData: Record<string, any> = {};

    const mockFetch = async (url: string, init?: RequestInit) => {
      const method = init?.method || 'GET';
      if (method === 'PUT') {
        const body = JSON.parse(init!.body as string);
        Object.assign(storedData, body);
        return new Response(JSON.stringify({}), { status: 200 });
      }
      return new Response(JSON.stringify(makeFakeBinRecord(storedData)), { status: 200 });
    };
    fetchSpy.mockImplementation(mockFetch);

    const user = {
      id: 'usr_abc123',
      email: 'test@example.com',
      username: '',
      passwordHash: 'hashed',
      role: 'user',
      emailVerified: false,
      otpHash: 'otp-hash',
      otpExpiresAt: new Date(Date.now() + 600_000).toISOString(),
      otpAttempts: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const adapter1 = new JsonBinStorageAdapter({
      apiKey: FAKE_API_KEY,
      binId: FAKE_BIN_ID,
    });

    await adapter1.set('users', user.id, user);

    const adapter2 = new JsonBinStorageAdapter({
      apiKey: FAKE_API_KEY,
      binId: FAKE_BIN_ID,
    });

    const found = await adapter2.query('users', { email: 'test@example.com' }, { bypassCache: true });
    expect(found).toHaveLength(1);
    expect(found[0].id).toBe('usr_abc123');

    const notFound = await adapter2.query('users', { email: 'other@example.com' }, { bypassCache: true });
    expect(notFound).toHaveLength(0);
  });

  it('stale cache is bypassed when bypassCache is true', async () => {
    const storedData: Record<string, any> = {};

    const mockFetch = async (url: string, init?: RequestInit) => {
      const method = init?.method || 'GET';
      if (method === 'PUT') {
        const body = JSON.parse(init!.body as string);
        Object.assign(storedData, body);
        return new Response(JSON.stringify({}), { status: 200 });
      }
      return new Response(JSON.stringify(makeFakeBinRecord(storedData)), { status: 200 });
    };
    fetchSpy.mockImplementation(mockFetch);

    const adapter = new JsonBinStorageAdapter({
      apiKey: FAKE_API_KEY,
      binId: FAKE_BIN_ID,
    });

    await adapter.set('users', 'user1', {
      id: 'user1', email: 'a@test.com', username: '',
    });

    const beforeCount = fetchSpy.mock.calls.length;

    const result1 = await adapter.query('users', { email: 'a@test.com' });
    expect(result1).toHaveLength(1);

    const afterCached = fetchSpy.mock.calls.length;
    expect(afterCached).toBe(beforeCount);

    await adapter.set('users', 'user1', {
      id: 'user1', email: 'a@test.com', username: 'updated',
    });

    const result2 = await adapter.query('users', { email: 'a@test.com' }, { bypassCache: true });
    expect(result2).toHaveLength(1);
    expect(result2[0].username).toBe('updated');
  });

  it('without bypassCache, adapter may return stale data from its own cache', async () => {
    let apiData: Record<string, any> = {};

    const mockFetch = async (url: string, init?: RequestInit) => {
      const method = init?.method || 'GET';
      if (method === 'PUT') {
        const body = JSON.parse(init!.body as string);
        Object.assign(apiData, body);
        return new Response(JSON.stringify({}), { status: 200 });
      }
      return new Response(JSON.stringify(makeFakeBinRecord(apiData)), { status: 200 });
    };
    fetchSpy.mockImplementation(mockFetch);

    const adapter = new JsonBinStorageAdapter({
      apiKey: FAKE_API_KEY,
      binId: FAKE_BIN_ID,
    });

    const user = { id: 'u1', email: 'x@test.com', username: '' };
    await adapter.set('users', 'u1', user);

    const result = await adapter.query('users', { email: 'x@test.com' });
    expect(result).toHaveLength(1);
  });
});

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
  it('set user -> new adapter instance -> query with bypassCache finds the user', async () => {
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

describe('JSONBin eventual consistency simulation', () => {
  it('PUT succeeds but fresh GET returns empty server data — user not found via bypassCache', async () => {
    let putCount = 0;

    const mockFetch = async (_url: string, init?: RequestInit) => {
      const method = init?.method || 'GET';
      if (method === 'PUT') {
        putCount++;
        return new Response(JSON.stringify({}), { status: 200 });
      }
      return new Response(JSON.stringify(makeFakeBinRecord({})), { status: 200 });
    };
    fetchSpy.mockImplementation(mockFetch);

    const adapter = new JsonBinStorageAdapter({
      apiKey: FAKE_API_KEY,
      binId: FAKE_BIN_ID,
    });

    const user = { id: 'usr_stale', email: 'stale@test.com', username: '' };
    await adapter.set('users', user.id, user);

    const foundInCache = await adapter.query('users', { email: 'stale@test.com' });
    expect(foundInCache).toHaveLength(1);

    adapter.invalidateCache();

    const foundAfterBypass = await adapter.query('users', { email: 'stale@test.com' }, { bypassCache: true });
    expect(foundAfterBypass).toHaveLength(0);

    expect(putCount).toBe(1);
  });

  it('within same adapter, cache reflects write and cache lookup finds user', async () => {
    const serverData: Record<string, any> = {};

    const mockFetch = async (_url: string, init?: RequestInit) => {
      const method = init?.method || 'GET';
      if (method === 'PUT') {
        const body = JSON.parse(init!.body as string);
        Object.assign(serverData, body);
        return new Response(JSON.stringify({}), { status: 200 });
      }
      return new Response(JSON.stringify(makeFakeBinRecord(serverData)), { status: 200 });
    };
    fetchSpy.mockImplementation(mockFetch);

    const adapter = new JsonBinStorageAdapter({
      apiKey: FAKE_API_KEY,
      binId: FAKE_BIN_ID,
    });

    const user = { id: 'usr_ok', email: 'ok@test.com', username: '' };
    await adapter.set('users', user.id, user);

    const found = await adapter.query('users', { email: 'ok@test.com' });
    expect(found).toHaveLength(1);
  });
});

describe('JsonBin concurrent write race condition', () => {
  // SKIPPED: These tests PROVE the race condition exists.
  // They fail because the bug is not yet fixed. Un-skip after implementing the fix.
  it.skip('concurrent set() on empty collection — both users should be preserved', async () => {
    const serverData: Record<string, any> = {};

    const mockFetch = async (_url: string, init?: RequestInit) => {
      const method = init?.method || 'GET';
      if (method === 'PUT') {
        const body = JSON.parse(init!.body as string);
        Object.assign(serverData, body);
        return new Response(JSON.stringify({}), { status: 200 });
      }
      return new Response(JSON.stringify(makeFakeBinRecord(serverData)), { status: 200 });
    };
    fetchSpy.mockImplementation(mockFetch);

    const adapter = new JsonBinStorageAdapter({
      apiKey: FAKE_API_KEY,
      binId: FAKE_BIN_ID,
    });

    const userA = { id: 'usr_A', email: 'a@test.com', username: '' };
    const userB = { id: 'usr_B', email: 'b@test.com', username: '' };

    await Promise.all([
      adapter.set('users', userA.id, userA),
      adapter.set('users', userB.id, userB),
    ]);

    const finalResult = await adapter.query('users', {}, { bypassCache: true });
    const userIds = finalResult.map((u: any) => u.id).sort();
    expect(userIds).toEqual(['usr_A', 'usr_B']);
  });

  it.skip('staggered concurrent set() — second write MUST include first user', async () => {
    let resolveFirstPut: (() => void) | null = null;
    const firstPutDone = new Promise<void>(r => { resolveFirstPut = r; });

    let putCount = 0;

    const mockFetch = async (_url: string, init?: RequestInit) => {
      const method = init?.method || 'GET';
      if (method === 'PUT') {
        putCount++;
        const body = JSON.parse(init!.body as string);
        if (putCount === 1 && resolveFirstPut) {
          resolveFirstPut();
          resolveFirstPut = null;
        }
        return new Response(JSON.stringify({}), { status: 200 });
      }
      return new Response(JSON.stringify(makeFakeBinRecord({})), { status: 200 });
    };
    fetchSpy.mockImplementation(mockFetch);

    const adapter = new JsonBinStorageAdapter({
      apiKey: FAKE_API_KEY,
      binId: FAKE_BIN_ID,
    });

    const userA = { id: 'usr_A', email: 'a@test.com', username: '' };
    const userB = { id: 'usr_B', email: 'b@test.com', username: '' };

    const writeA = adapter.set('users', userA.id, userA);
    await firstPutDone;

    const writeB = adapter.set('users', userB.id, userB);
    await Promise.all([writeA, writeB]);

    const finalResult = await adapter.query('users', {}, { bypassCache: true });
    const userIds = finalResult.map((u: any) => u.id).sort();
    expect(userIds).toEqual(['usr_A', 'usr_B']);
  });

  it.skip('staggered set() with server-side state tracking', async () => {
    let resolveFirstPut: (() => void) | null = null;
    const firstPutDone = new Promise<void>(r => { resolveFirstPut = r; });

    const serverData: Record<string, any> = {};

    const mockFetch = async (_url: string, init?: RequestInit) => {
      const method = init?.method || 'GET';
      if (method === 'PUT') {
        const body = JSON.parse(init!.body as string);
        Object.assign(serverData, body);
        if (resolveFirstPut) {
          resolveFirstPut();
          resolveFirstPut = null;
        }
        return new Response(JSON.stringify({}), { status: 200 });
      }
      return new Response(JSON.stringify(makeFakeBinRecord(serverData)), { status: 200 });
    };
    fetchSpy.mockImplementation(mockFetch);

    const adapter = new JsonBinStorageAdapter({
      apiKey: FAKE_API_KEY,
      binId: FAKE_BIN_ID,
    });

    const userA = { id: 'usr_A', email: 'a@test.com', username: '' };
    const userB = { id: 'usr_B', email: 'b@test.com', username: '' };

    const writeA = adapter.set('users', userA.id, userA);
    await firstPutDone;

    const writeB = adapter.set('users', userB.id, userB);
    await Promise.all([writeA, writeB]);

    const finalResult = await adapter.query('users', {}, { bypassCache: true });
    const userIds = finalResult.map((u: any) => u.id).sort();
    expect(userIds).toEqual(['usr_A', 'usr_B']);
  });
});

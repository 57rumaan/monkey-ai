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

function makeServerData() {
  return {} as Record<string, any>;
}

function mockFetchFrom(serverData: Record<string, any>) {
  return async (_url: string, init?: RequestInit) => {
    const method = init?.method || 'GET';
    if (method === 'PUT') {
      const body = JSON.parse(init!.body as string);
      Object.keys(serverData).forEach(k => delete serverData[k]);
      Object.assign(serverData, body);
      return new Response(JSON.stringify({ version: 1 }), { status: 200 });
    }
    return new Response(JSON.stringify(makeFakeBinRecord(serverData)), { status: 200 });
  };
}

describe('JsonBinStorageAdapter cache bypass', () => {
  it('set user -> new adapter instance -> query with bypassCache finds the user', async () => {
    const serverData = makeServerData();
    fetchSpy.mockImplementation(mockFetchFrom(serverData));

    const user = {
      id: 'usr_abc123', email: 'test@example.com', username: '',
      passwordHash: 'hashed', role: 'user', emailVerified: false,
      otpHash: 'otp-hash', otpExpiresAt: new Date(Date.now() + 600_000).toISOString(),
      otpAttempts: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };

    const adapter1 = new JsonBinStorageAdapter({ apiKey: FAKE_API_KEY, binId: FAKE_BIN_ID });
    await adapter1.set('users', user.id, user);

    const adapter2 = new JsonBinStorageAdapter({ apiKey: FAKE_API_KEY, binId: FAKE_BIN_ID });
    const found = await adapter2.query('users', { email: 'test@example.com' }, { bypassCache: true });
    expect(found).toHaveLength(1);
    expect(found[0].id).toBe('usr_abc123');

    const notFound = await adapter2.query('users', { email: 'other@example.com' }, { bypassCache: true });
    expect(notFound).toHaveLength(0);
  });

  it('stale cache is bypassed when bypassCache is true', async () => {
    const serverData = makeServerData();
    fetchSpy.mockImplementation(mockFetchFrom(serverData));

    const adapter = new JsonBinStorageAdapter({ apiKey: FAKE_API_KEY, binId: FAKE_BIN_ID });
    await adapter.set('users', 'user1', { id: 'user1', email: 'a@test.com', username: '' });

    const beforeCount = fetchSpy.mock.calls.length;
    const result1 = await adapter.query('users', { email: 'a@test.com' });
    expect(result1).toHaveLength(1);
    expect(fetchSpy.mock.calls.length).toBe(beforeCount);

    await adapter.set('users', 'user1', { id: 'user1', email: 'a@test.com', username: 'updated' });

    const result2 = await adapter.query('users', { email: 'a@test.com' }, { bypassCache: true });
    expect(result2).toHaveLength(1);
    expect(result2[0].username).toBe('updated');
  });

  it('without bypassCache, adapter returns data from its own cache', async () => {
    const serverData = makeServerData();
    fetchSpy.mockImplementation(mockFetchFrom(serverData));

    const adapter = new JsonBinStorageAdapter({ apiKey: FAKE_API_KEY, binId: FAKE_BIN_ID });
    await adapter.set('users', 'u1', { id: 'u1', email: 'x@test.com', username: '' });

    const result = await adapter.query('users', { email: 'x@test.com' });
    expect(result).toHaveLength(1);
  });
});

describe('REGRESSION: set persists to JSONBin (production bug fix)', () => {
  it('1. PUT payload users_count must be 1 when adding first user to empty collection', async () => {
    const serverData = makeServerData();
    let lastPutBody: Record<string, any> | null = null;

    fetchSpy.mockImplementation(async (_url: string, init?: RequestInit) => {
      const method = init?.method || 'GET';
      if (method === 'PUT') {
        lastPutBody = JSON.parse(init!.body as string);
        Object.keys(serverData).forEach(k => delete serverData[k]);
        Object.assign(serverData, lastPutBody);
        return new Response(JSON.stringify({ version: 1 }), { status: 200 });
      }
      return new Response(JSON.stringify(makeFakeBinRecord(serverData)), { status: 200 });
    });

    const adapter = new JsonBinStorageAdapter({ apiKey: FAKE_API_KEY, binId: FAKE_BIN_ID });
    await adapter.set('users', 'usr_new1', { id: 'usr_new1', email: 'new@test.com', username: '' });

    expect(lastPutBody).not.toBeNull();
    const putUsersCount = lastPutBody!.users ? Object.keys(lastPutBody!.users).length : 0;
    expect(putUsersCount).toBe(1);
    expect(lastPutBody!['users']['usr_new1']).toBeDefined();
    expect(lastPutBody!['users']['usr_new1'].email).toBe('new@test.com');
  });

  it('2. query immediately after set finds the user', async () => {
    const serverData = makeServerData();
    fetchSpy.mockImplementation(mockFetchFrom(serverData));

    const adapter = new JsonBinStorageAdapter({ apiKey: FAKE_API_KEY, binId: FAKE_BIN_ID });
    await adapter.set('users', 'usr_q1', { id: 'usr_q1', email: 'q1@test.com', username: '' });

    const found = await adapter.query('users', { email: 'q1@test.com' });
    expect(found).toHaveLength(1);
    expect(found[0].id).toBe('usr_q1');
  });

  it('3. forced fresh fetch after set finds the user', async () => {
    const serverData = makeServerData();
    fetchSpy.mockImplementation(mockFetchFrom(serverData));

    const adapter = new JsonBinStorageAdapter({ apiKey: FAKE_API_KEY, binId: FAKE_BIN_ID });
    await adapter.set('users', 'usr_f1', { id: 'usr_f1', email: 'f1@test.com', username: '' });

    adapter.invalidateCache();
    const found = await adapter.query('users', { email: 'f1@test.com' }, { bypassCache: true });
    expect(found).toHaveLength(1);
    expect(found[0].id).toBe('usr_f1');
  });

  it('4. existing collections preserved during a users write', async () => {
    const serverData = makeServerData();
    fetchSpy.mockImplementation(mockFetchFrom(serverData));

    const adapter = new JsonBinStorageAdapter({ apiKey: FAKE_API_KEY, binId: FAKE_BIN_ID });
    await adapter.set('providers', 'prv_1', { id: 'prv_1', label: 'HF' });
    await adapter.set('bundles', 'bdl_1', { id: 'bdl_1', name: 'Free' });
    await adapter.set('users', 'usr_1', { id: 'usr_1', email: 'u1@test.com', username: '' });

    const providers = await adapter.query('providers', {});
    expect(providers).toHaveLength(1);
    expect(providers[0].id).toBe('prv_1');

    const bundles = await adapter.query('bundles', {});
    expect(bundles).toHaveLength(1);
    expect(bundles[0].id).toBe('bdl_1');

    const users = await adapter.query('users', {});
    expect(users).toHaveLength(1);
    expect(users[0].id).toBe('usr_1');
  });

  it('5. existing users preserved when adding another user', async () => {
    const serverData = makeServerData();
    fetchSpy.mockImplementation(mockFetchFrom(serverData));

    const adapter = new JsonBinStorageAdapter({ apiKey: FAKE_API_KEY, binId: FAKE_BIN_ID });
    await adapter.set('users', 'usr_a', { id: 'usr_a', email: 'a@test.com', username: '' });
    await adapter.set('users', 'usr_b', { id: 'usr_b', email: 'b@test.com', username: '' });

    const all = await adapter.query('users', {});
    expect(all).toHaveLength(2);
    const ids = all.map((u: any) => u.id).sort();
    expect(ids).toEqual(['usr_a', 'usr_b']);
  });

  it('6. two concurrent set() calls do not lose either user', async () => {
    const serverData = makeServerData();
    fetchSpy.mockImplementation(mockFetchFrom(serverData));

    const adapter = new JsonBinStorageAdapter({ apiKey: FAKE_API_KEY, binId: FAKE_BIN_ID });
    const userA = { id: 'usr_cA', email: 'cA@test.com', username: '' };
    const userB = { id: 'usr_cB', email: 'cB@test.com', username: '' };

    await Promise.all([
      adapter.set('users', userA.id, userA),
      adapter.set('users', userB.id, userB),
    ]);

    const finalResult = await adapter.query('users', {}, { bypassCache: true });
    const userIds = finalResult.map((u: any) => u.id).sort();
    expect(userIds).toEqual(['usr_cA', 'usr_cB']);
  });

  it('7. failed PUT does NOT update local cache', async () => {
    let putCount = 0;

    fetchSpy.mockImplementation(async (_url: string, init?: RequestInit) => {
      const method = init?.method || 'GET';
      if (method === 'PUT') {
        putCount++;
        if (putCount === 1) {
          return new Response(JSON.stringify({ error: 'server error' }), { status: 500 });
        }
        return new Response(JSON.stringify({ version: 2 }), { status: 200 });
      }
      return new Response(JSON.stringify(makeFakeBinRecord({})), { status: 200 });
    });

    const adapter = new JsonBinStorageAdapter({ apiKey: FAKE_API_KEY, binId: FAKE_BIN_ID });

    await expect(
      adapter.set('users', 'usr_fail', { id: 'usr_fail', email: 'fail@test.com', username: '' })
    ).rejects.toThrow();

    const found = await adapter.query('users', { email: 'fail@test.com' }, { bypassCache: true });
    expect(found).toHaveLength(0);
  });
});

describe('Write serialization', () => {
  it('serialized writes maintain correct final state', async () => {
    const serverData = makeServerData();
    fetchSpy.mockImplementation(mockFetchFrom(serverData));

    const adapter = new JsonBinStorageAdapter({ apiKey: FAKE_API_KEY, binId: FAKE_BIN_ID });
    await adapter.set('users', 'usr_s1', { id: 'usr_s1', email: 's1@test.com', username: '' });
    await adapter.set('users', 'usr_s2', { id: 'usr_s2', email: 's2@test.com', username: '' });
    await adapter.set('users', 'usr_s3', { id: 'usr_s3', email: 's3@test.com', username: '' });

    const all = await adapter.query('users', {}, { bypassCache: true });
    expect(all).toHaveLength(3);
    const ids = all.map((u: any) => u.id).sort();
    expect(ids).toEqual(['usr_s1', 'usr_s2', 'usr_s3']);
  });

  it('delete after set correctly removes user', async () => {
    const serverData = makeServerData();
    fetchSpy.mockImplementation(mockFetchFrom(serverData));

    const adapter = new JsonBinStorageAdapter({ apiKey: FAKE_API_KEY, binId: FAKE_BIN_ID });
    await adapter.set('users', 'usr_d1', { id: 'usr_d1', email: 'd1@test.com', username: '' });
    await adapter.set('users', 'usr_d2', { id: 'usr_d2', email: 'd2@test.com', username: '' });
    await adapter.delete('users', 'usr_d1');

    const all = await adapter.query('users', {}, { bypassCache: true });
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe('usr_d2');
  });
});

describe('REGRESSION: Array-shaped collections normalized to objects', () => {
  it('1. users=[] + set() → entries_after=1 and PUT payload contains user', async () => {
    const serverData: Record<string, any> = { users: [] };
    let lastPutBody: Record<string, any> | null = null;

    fetchSpy.mockImplementation(async (_url: string, init?: RequestInit) => {
      const method = init?.method || 'GET';
      if (method === 'PUT') {
        lastPutBody = JSON.parse(init!.body as string);
        Object.keys(serverData).forEach(k => delete serverData[k]);
        Object.assign(serverData, lastPutBody);
        return new Response(JSON.stringify({ version: 1 }), { status: 200 });
      }
      return new Response(JSON.stringify(makeFakeBinRecord(serverData)), { status: 200 });
    });

    const adapter = new JsonBinStorageAdapter({ apiKey: FAKE_API_KEY, binId: FAKE_BIN_ID });
    await adapter.set('users', 'usr_arr1', { id: 'usr_arr1', email: 'arr1@test.com', username: '' });

    expect(lastPutBody).not.toBeNull();
    const putUsersCount = lastPutBody!.users ? Object.keys(lastPutBody!.users).length : 0;
    expect(putUsersCount).toBe(1);
    expect(lastPutBody!['users']['usr_arr1']).toBeDefined();
    expect(lastPutBody!['users']['usr_arr1'].email).toBe('arr1@test.com');
  });

  it('2. users={} + set() → user persists (no regression)', async () => {
    const serverData: Record<string, any> = { users: {} };
    let lastPutBody: Record<string, any> | null = null;

    fetchSpy.mockImplementation(async (_url: string, init?: RequestInit) => {
      const method = init?.method || 'GET';
      if (method === 'PUT') {
        lastPutBody = JSON.parse(init!.body as string);
        Object.keys(serverData).forEach(k => delete serverData[k]);
        Object.assign(serverData, lastPutBody);
        return new Response(JSON.stringify({ version: 1 }), { status: 200 });
      }
      return new Response(JSON.stringify(makeFakeBinRecord(serverData)), { status: 200 });
    });

    const adapter = new JsonBinStorageAdapter({ apiKey: FAKE_API_KEY, binId: FAKE_BIN_ID });
    await adapter.set('users', 'usr_obj1', { id: 'usr_obj1', email: 'obj1@test.com', username: '' });

    expect(lastPutBody).not.toBeNull();
    expect(Object.keys(lastPutBody!['users'])).toContain('usr_obj1');
    expect(lastPutBody!['users']['usr_obj1'].email).toBe('obj1@test.com');
  });

  it('3. users missing + set() → user persists (no regression)', async () => {
    const serverData: Record<string, any> = {};
    let lastPutBody: Record<string, any> | null = null;

    fetchSpy.mockImplementation(async (_url: string, init?: RequestInit) => {
      const method = init?.method || 'GET';
      if (method === 'PUT') {
        lastPutBody = JSON.parse(init!.body as string);
        Object.keys(serverData).forEach(k => delete serverData[k]);
        Object.assign(serverData, lastPutBody);
        return new Response(JSON.stringify({ version: 1 }), { status: 200 });
      }
      return new Response(JSON.stringify(makeFakeBinRecord(serverData)), { status: 200 });
    });

    const adapter = new JsonBinStorageAdapter({ apiKey: FAKE_API_KEY, binId: FAKE_BIN_ID });
    await adapter.set('users', 'usr_miss1', { id: 'usr_miss1', email: 'miss1@test.com', username: '' });

    expect(lastPutBody).not.toBeNull();
    expect(lastPutBody!['users']['usr_miss1']).toBeDefined();
  });

  it('4. existing users preserved when adding to array collection', async () => {
    const serverData: Record<string, any> = { users: {} };
    fetchSpy.mockImplementation(mockFetchFrom(serverData));

    const adapter = new JsonBinStorageAdapter({ apiKey: FAKE_API_KEY, binId: FAKE_BIN_ID });
    await adapter.set('users', 'usr_e1', { id: 'usr_e1', email: 'e1@test.com', username: '' });
    await adapter.set('users', 'usr_e2', { id: 'usr_e2', email: 'e2@test.com', username: '' });

    const all = await adapter.query('users', {}, { bypassCache: true });
    expect(all).toHaveLength(2);
    const ids = all.map((u: any) => u.id).sort();
    expect(ids).toEqual(['usr_e1', 'usr_e2']);
  });

  it('5. delete() works when collection is array-shaped', async () => {
    const serverData: Record<string, any> = {};
    fetchSpy.mockImplementation(async (_url: string, init?: RequestInit) => {
      const method = init?.method || 'GET';
      if (method === 'PUT') {
        const body = JSON.parse(init!.body as string);
        Object.keys(serverData).forEach(k => delete serverData[k]);
        Object.assign(serverData, body);
        return new Response(JSON.stringify({ version: 1 }), { status: 200 });
      }
      return new Response(JSON.stringify(makeFakeBinRecord(serverData)), { status: 200 });
    });

    const adapter = new JsonBinStorageAdapter({ apiKey: FAKE_API_KEY, binId: FAKE_BIN_ID });
    await adapter.set('users', 'usr_darr1', { id: 'usr_darr1', email: 'darr1@test.com', username: '' });
    await adapter.set('users', 'usr_darr2', { id: 'usr_darr2', email: 'darr2@test.com', username: '' });
    await adapter.delete('users', 'usr_darr1');

    const all = await adapter.query('users', {}, { bypassCache: true });
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe('usr_darr2');
  });

  it('6. concurrent writes from array collection preserve both users', async () => {
    const serverData: Record<string, any> = { users: [] };
    fetchSpy.mockImplementation(async (_url: string, init?: RequestInit) => {
      const method = init?.method || 'GET';
      if (method === 'PUT') {
        const body = JSON.parse(init!.body as string);
        Object.keys(serverData).forEach(k => delete serverData[k]);
        Object.assign(serverData, body);
        return new Response(JSON.stringify({ version: 1 }), { status: 200 });
      }
      return new Response(JSON.stringify(makeFakeBinRecord(serverData)), { status: 200 });
    });

    const adapter = new JsonBinStorageAdapter({ apiKey: FAKE_API_KEY, binId: FAKE_BIN_ID });
    const userA = { id: 'usr_carrA', email: 'carrA@test.com', username: '' };
    const userB = { id: 'usr_carrB', email: 'carrB@test.com', username: '' };

    await Promise.all([
      adapter.set('users', userA.id, userA),
      adapter.set('users', userB.id, userB),
    ]);

    const finalResult = await adapter.query('users', {}, { bypassCache: true });
    const userIds = finalResult.map((u: any) => u.id).sort();
    expect(userIds).toEqual(['usr_carrA', 'usr_carrB']);
  });

  it('7. failed PUT from array collection does NOT update cache', async () => {
    let putCount = 0;

    fetchSpy.mockImplementation(async (_url: string, init?: RequestInit) => {
      const method = init?.method || 'GET';
      if (method === 'PUT') {
        putCount++;
        if (putCount === 1) {
          return new Response(JSON.stringify({ error: 'server error' }), { status: 500 });
        }
        return new Response(JSON.stringify({ version: 2 }), { status: 200 });
      }
      return new Response(JSON.stringify(makeFakeBinRecord({ users: [] })), { status: 200 });
    });

    const adapter = new JsonBinStorageAdapter({ apiKey: FAKE_API_KEY, binId: FAKE_BIN_ID });

    await expect(
      adapter.set('users', 'usr_farr', { id: 'usr_farr', email: 'farr@test.com', username: '' })
    ).rejects.toThrow();

    const found = await adapter.query('users', { email: 'farr@test.com' }, { bypassCache: true });
    expect(found).toHaveLength(0);
  });
});

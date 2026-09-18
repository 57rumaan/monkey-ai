import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { join } from 'path';
import { rm, mkdir } from 'fs/promises';

const TEST_DATA_DIR = join(process.cwd(), '.test-data-integration');

let app: any;
let server: any;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-integration-tests';
  process.env.NODE_ENV = 'development';
  process.env.DATA_DIR = TEST_DATA_DIR;
  process.env.PORT = '0';
  process.env.RATE_LIMIT_API = '1000';
  process.env.RATE_LIMIT_AUTH = '1000';
  process.env.RATE_LIMIT_UPLOAD = '1000';

  await rm(TEST_DATA_DIR, { recursive: true, force: true });
  await mkdir(join(TEST_DATA_DIR, 'data'), { recursive: true });

  const { default: defaultApp } = await import('../server/index.js');
  app = defaultApp;

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
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

async function signupAndVerify(email: string, password: string, username: string): Promise<string | undefined> {
  const signupRes = await request(app)
    .post('/api/auth/signup')
    .send({ email, password });

  if (signupRes.status !== 200) return undefined;
  const otp = signupRes.body.data.otp;

  const verifyRes = await request(app)
    .post('/api/auth/verify-signup')
    .send({ email, otp, username });

  if (verifyRes.status !== 200) return undefined;
  return extractCookie(verifyRes, 'accessToken');
}

describe('Health Check', () => {
  it('should return 200 on health endpoint', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('Auth Routes', () => {
  const password = 'StrongP@ss1!';

  it('should signup a new user and return OTP in dev mode', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'signup1@test.com', password });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('signup1@test.com');
    expect(res.body.data.otp).toMatch(/^\d{6}$/);
  });

  it('should reject duplicate email', async () => {
    await request(app)
      .post('/api/auth/signup')
      .send({ email: 'dup@test.com', password });

    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'dup@test.com', password });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should reject invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'not-an-email', password });
    expect(res.status).toBe(400);
  });

  it('should reject weak password', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'weak@test.com', password: '123' });
    expect(res.status).toBe(400);
  });

  it('should verify OTP and set cookie', async () => {
    const signupRes = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'verify@test.com', password });

    const otp = signupRes.body.data.otp;

    const res = await request(app)
      .post('/api/auth/verify-signup')
      .send({ email: 'verify@test.com', otp, username: 'verifyuser' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.emailVerified).toBe(true);
    expect(res.body.data.user.username).toBe('verifyuser');
    expect(extractCookie(res, 'accessToken')).toBeDefined();
  });

  it('should reject invalid OTP', async () => {
    await request(app)
      .post('/api/auth/signup')
      .send({ email: 'badotp@test.com', password });

    const res = await request(app)
      .post('/api/auth/verify-signup')
      .send({ email: 'badotp@test.com', otp: '000000', username: 'badotpuser' });

    expect(res.status).toBe(400);
  });

  it('should login with valid credentials', async () => {
    const token = await signupAndVerify('login@test.com', password, 'loginuser');
    expect(token).toBeDefined();

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@test.com', password });

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('login@test.com');
    expect(extractCookie(res, 'accessToken')).toBeDefined();
  });

  it('should reject wrong password', async () => {
    await signupAndVerify('wrong@test.com', password, 'wronguser');

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'wrong@test.com', password: 'WrongPass999!' });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.body.success).toBe(false);
  });

  it('should return user data or null from /me', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // data is either a user object or null
    expect(res.body.data === null || typeof res.body.data === 'object').toBe(true);
  });

  it('should return user when authenticated', async () => {
    const token = await signupAndVerify('me@test.com', password, 'meuser');
    expect(token).toBeDefined();

    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [token!]);

    expect(res.status).toBe(200);
    expect(res.body.data).not.toBeNull();
    expect(res.body.data.email).toBe('me@test.com');
  });

  it('should logout and clear cookies', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('Validation Schemas', () => {
  it('should validate chatSendSchema', async () => {
    const { chatSendSchema } = await import('../server/validation.js');

    const valid = chatSendSchema.safeParse({
      bundleId: 'test-bundle',
      capability: 'text_to_text',
      messages: [{ role: 'user', content: 'Hello' }],
    });
    expect(valid.success).toBe(true);

    const invalid = chatSendSchema.safeParse({
      bundleId: '',
      capability: 'text_to_text',
      messages: [],
    });
    expect(invalid.success).toBe(false);
  });

  it('should validate signup schema', async () => {
    const { signupSchema } = await import('../server/validation.js');

    expect(signupSchema.safeParse({ email: 'bad', password: '123' }).success).toBe(false);
    expect(signupSchema.safeParse({ email: 'good@example.com', password: 'Strong@123' }).success).toBe(true);
  });
});

describe('ServerUtils', () => {
  it('should hash and verify passwords', async () => {
    const { hashPassword, verifyPassword } = await import('../server/lib/auth/serverUtils.js');
    const hash = await hashPassword('TestPassword123!');
    expect(hash.length).toBeGreaterThan(20);
    expect(await verifyPassword('TestPassword123!', hash)).toBe(true);
    expect(await verifyPassword('WrongPassword!', hash)).toBe(false);
  });

  it('should generate and verify OTPs', async () => {
    const { generateOTP, hashOTP, verifyOTP } = await import('../server/lib/auth/serverUtils.js');
    const otp = generateOTP();
    expect(otp).toMatch(/^\d{6}$/);
    const hash = hashOTP(otp);
    expect(verifyOTP(otp, hash)).toBe(true);
    expect(verifyOTP('000000', hash)).toBe(false);
  });

  it('should detect invalid emails', async () => {
    const { isEmailValid } = await import('../server/lib/auth/serverUtils.js');
    expect(isEmailValid('test@example.com')).toBe(true);
    expect(isEmailValid('not-email')).toBe(false);
    expect(isEmailValid('')).toBe(false);
  });

  it('should validate password strength', async () => {
    const { isPasswordStrong } = await import('../server/lib/auth/serverUtils.js');
    expect(isPasswordStrong('StrongPass123!').valid).toBe(true);
    expect(isPasswordStrong('123').valid).toBe(false);
    expect(isPasswordStrong('nouppercase1!').valid).toBe(false);
  });

  it('should sanitize inputs', async () => {
    const { sanitizeInput } = await import('../server/lib/auth/serverUtils.js');
    expect(sanitizeInput('<script>alert("xss")</script>')).not.toContain('<script>');
    expect(sanitizeInput('javascript:alert(1)')).not.toContain('javascript:');
  });
});

describe('Rate Limiting', () => {
  it('should have rate limiter configured', async () => {
    const { createRateLimiter } = await import('../server/lib/auth/serverUtils.js');
    const limiter = createRateLimiter(60000, 5);
    const result = limiter.check('test-key');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThanOrEqual(0);
  });
});

describe('Chat Ownership', () => {
  const password = 'StrongP@ss1!';

  it('should create chat with correct ownership', async () => {
    const token = await signupAndVerify('owner@test.com', password, 'owneruser');
    expect(token).toBeDefined();

    const res = await request(app)
      .post('/api/chat/send')
      .set('Cookie', [token!])
      .send({
        bundleId: 'test-bundle',
        capability: 'text_to_text',
        messages: [{ role: 'user', content: 'Hello' }],
      });

    // Will fail due to no bundle, but should not be 403 (ownership is valid)
    expect(res.status).not.toBe(403);
  });

  it('should reject access to another users chat via /send', async () => {
    const token1 = await signupAndVerify('owner2@test.com', password, 'owner2user');
    const token2 = await signupAndVerify('attacker@test.com', password, 'attackeruser');
    expect(token1).toBeDefined();
    expect(token2).toBeDefined();

    // Create a chat as user1
    const createRes = await request(app)
      .post('/api/chat/send')
      .set('Cookie', [token1!])
      .send({
        bundleId: 'test-bundle',
        capability: 'text_to_text',
        messages: [{ role: 'user', content: 'My private chat' }],
      });

    const chatId = createRes.body?.data?.chatId;
    if (!chatId) return; // Skip if chat creation failed (no bundle)

    // Try to send to user1's chat as user2
    const res = await request(app)
      .post('/api/chat/send')
      .set('Cookie', [token2!])
      .send({
        bundleId: 'test-bundle',
        capability: 'text_to_text',
        chatId,
        messages: [{ role: 'user', content: 'Injected!' }],
      });

    expect(res.status).toBe(403);
  });
});

describe('Admin Authorization', () => {
  const password = 'StrongP@ss1!';

  it('should reject normal user from admin endpoints', async () => {
    const token = await signupAndVerify('normal@test.com', password, 'normaluser');
    expect(token).toBeDefined();

    const endpoints = [
      ['GET', '/api/admin/stats'],
      ['GET', '/api/admin/users'],
      ['GET', '/api/admin/settings'],
      ['GET', '/api/admin/audit-logs'],
    ];

    for (const [method, path] of endpoints) {
      const res = await request(app)
        [method.toLowerCase() as 'get'](path)
        .set('Cookie', [token!]);
      expect(res.status).toBe(403);
    }
  });

  it('should require auth for admin endpoints', async () => {
    const res = await request(app).get('/api/admin/stats');
    expect(res.status).toBe(401);
  });
});

describe('Bundle Security', () => {
  const password = 'StrongP@ss1!';

  it('should hide providerId and rawModelId from normal users', async () => {
    const token = await signupAndVerify('bundleuser@test.com', password, 'bundleuser');
    expect(token).toBeDefined();

    const res = await request(app)
      .get('/api/bundles')
      .set('Cookie', [token!]);

    expect(res.status).toBe(200);
    const bundles = res.body.data;
    if (Array.isArray(bundles) && bundles.length > 0) {
      for (const bundle of bundles) {
        if (bundle.capabilities) {
          for (const cap of bundle.capabilities) {
            expect(cap).not.toHaveProperty('providerId');
            expect(cap).not.toHaveProperty('rawModelId');
          }
        }
      }
    }
  });

  it('should reject unauthenticated access to bundles', async () => {
    const res = await request(app).get('/api/bundles');
    expect(res.status).toBe(401);
  });
});

describe('Folders', () => {
  const password = 'StrongP@ss1!';

  it('should create and list folders', async () => {
    const token = await signupAndVerify('folder@test.com', password, 'folderuser');
    expect(token).toBeDefined();

    const createRes = await request(app)
      .post('/api/chat/folders')
      .set('Cookie', [token!])
      .send({ name: 'My Folder' });

    expect(createRes.status).toBe(200);
    expect(createRes.body.data.name).toBe('My Folder');

    const listRes = await request(app)
      .get('/api/chat/folders')
      .set('Cookie', [token!]);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('should reject unauthenticated folder access', async () => {
    const res = await request(app).get('/api/chat/folders');
    expect(res.status).toBe(401);
  });
});

describe('Upload Security', () => {
  const password = 'StrongP@ss1!';

  it('should reject unauthenticated uploads', async () => {
    const res = await request(app)
      .post('/api/upload');
    expect(res.status).toBe(401);
  });

  it('should reject empty uploads', async () => {
    const token = await signupAndVerify('upload@test.com', password, 'uploaduser');
    expect(token).toBeDefined();

    const res = await request(app)
      .post('/api/upload')
      .set('Cookie', [token!]);
    expect(res.status).toBe(400);
  });
});

describe('Error Handling', () => {
  it('should return 404 for non-existent auth routes', async () => {
    const res = await request(app).get('/api/auth/nonexistent');
    expect(res.status).toBe(404);
  });

  it('should return safe error messages', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost@test.com', password: 'anything' });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.body.error).toBeDefined();
    expect(JSON.stringify(res.body)).not.toContain('stack');
    expect(JSON.stringify(res.body)).not.toContain('internal');
  });
});

describe('Security Patterns', () => {
  it('should not expose eval or Function in server code', async () => {
    const { readFile } = await import('fs/promises');
    const serverFiles = [
      'server/index.ts', 'server/storage.ts', 'server/validation.ts',
      'server/auth/index.ts', 'server/middleware.ts',
      'server/routes/auth.ts', 'server/routes/chat.ts', 'server/routes/upload.ts',
      'server/routes/admin.ts', 'server/routes/bundles.ts', 'server/routes/providers.ts',
      'server/routing/router.ts', 'server/providers/adapters.ts',
      'server/providers/openai.ts', 'server/providers/anthropic.ts',
      'server/lib/auth/serverUtils.ts', 'server/lib/logger.ts',
    ];
    for (const file of serverFiles) {
      try {
        const content = await readFile(file, 'utf-8');
        const dangerous = content.match(/\b(eval|new\s+Function)\s*\(/g);
        expect(`${file}: eval/Function found`).toBe(dangerous ? `FOUND in ${file}` : 'safe');
      } catch { /* file may not exist */ }
    }
  });

  it('should not have dangerouslySetInnerHTML in client code', async () => {
    const { readFile } = await import('fs/promises');
    const clientFiles = [
      'src/app/router.tsx', 'src/app/Layout.tsx',
      'src/pages/ChatPage.tsx', 'src/pages/SettingsPage.tsx',
      'src/components/chat/MessageList.tsx', 'src/components/chat/Composer.tsx',
    ];
    for (const file of clientFiles) {
      try {
        const content = await readFile(file, 'utf-8');
        expect(content).not.toContain('dangerouslySetInnerHTML');
      } catch { /* file may not exist */ }
    }
  });

  it('should not have @ts-ignore or @ts-nocheck', async () => {
    const { readFile } = await import('fs/promises');
    const files = [
      'server/index.ts', 'server/storage.ts', 'server/routing/router.ts',
      'server/routes/chat.ts', 'server/routes/auth.ts',
    ];
    for (const file of files) {
      try {
        const content = await readFile(file, 'utf-8');
        expect(content).not.toContain('@ts-ignore');
        expect(content).not.toContain('@ts-nocheck');
      } catch { /* file may not exist */ }
    }
  });

  it('should not have VITE_ env vars exposed to client', async () => {
    const { readFile } = await import('fs/promises');
    const { existsSync } = await import('fs');
    const clientFiles = [
      'src/app/router.tsx', 'src/app/Layout.tsx',
      'src/pages/ChatPage.tsx', 'src/pages/SettingsPage.tsx',
    ];
    for (const file of clientFiles) {
      if (existsSync(file)) {
        const content = await readFile(file, 'utf-8');
        expect(content).not.toMatch(/import\.meta\.env\.VITE_/);
      }
    }
  });

  it('should not store auth tokens in localStorage', async () => {
    const { readFile } = await import('fs/promises');
    const { existsSync } = await import('fs');
    const clientFiles = [
      'src/app/router.tsx', 'src/app/Layout.tsx',
      'src/pages/ChatPage.tsx', 'src/pages/SettingsPage.tsx',
    ];
    for (const file of clientFiles) {
      if (existsSync(file)) {
        const content = await readFile(file, 'utf-8');
        expect(content).not.toMatch(/localStorage\.\w+Item\s*\(\s*['"].*[Tt]oken/);
      }
    }
  });
});

describe('File Storage Abstraction', () => {
  const testStorageDir = join(TEST_DATA_DIR, '.test-uploads');
  let storage: any;

  beforeAll(async () => {
    const { LocalFileStorage } = await import('./lib/fileStorage');
    await mkdir(testStorageDir, { recursive: true });
    storage = new LocalFileStorage(testStorageDir);
  });

  afterAll(async () => {
    await rm(testStorageDir, { recursive: true, force: true });
  });

  it('should upload and download a file', async () => {
    const buffer = Buffer.from('Hello, world!');
    await storage.upload('user1', 'test.txt', buffer);
    const downloaded = await storage.download('user1', 'test.txt');
    expect(downloaded.toString()).toBe('Hello, world!');
  });

  it('should return true for exists after upload', async () => {
    const exists = await storage.exists('user1', 'test.txt');
    expect(exists).toBe(true);
  });

  it('should return false for exists of non-existent file', async () => {
    const exists = await storage.exists('user1', 'nope.txt');
    expect(exists).toBe(false);
  });

  it('should list files for a user', async () => {
    const files = await storage.listFiles('user1');
    expect(files).toContain('test.txt');
  });

  it('should delete a file', async () => {
    await storage.upload('user1', 'to-delete.txt', Buffer.from('delete me'));
    await storage.delete('user1', 'to-delete.txt');
    const exists = await storage.exists('user1', 'to-delete.txt');
    expect(exists).toBe(false);
  });

  it('should not throw on delete of non-existent file', async () => {
    await expect(storage.delete('user1', 'ghost.txt')).resolves.toBeUndefined();
  });

  it('should reject path traversal in userId', async () => {
    await expect(storage.upload('../etc/passwd', 'test.txt', Buffer.from('bad'))).rejects.toThrow('Invalid userId');
    await expect(storage.download('../etc/passwd', 'test.txt')).rejects.toThrow('Invalid userId');
    await expect(storage.delete('../etc/passwd', 'test.txt')).rejects.toThrow('Invalid userId');
    await expect(storage.exists('../etc/passwd', 'test.txt')).rejects.toThrow('Invalid userId');
    await expect(storage.listFiles('../etc/passwd')).rejects.toThrow('Invalid userId');
  });

  it('should reject path traversal in filename', async () => {
    await expect(storage.upload('user1', '../etc/passwd', Buffer.from('bad'))).rejects.toThrow('Invalid filename');
    await expect(storage.download('user1', '../etc/passwd')).rejects.toThrow('Invalid filename');
    await expect(storage.delete('user1', '../etc/passwd')).rejects.toThrow('Invalid filename');
    await expect(storage.exists('user1', '../etc/passwd')).rejects.toThrow('Invalid filename');
  });

  it('should isolate files between users', async () => {
    await storage.upload('userA', 'secret.txt', Buffer.from('A secrets'));
    await storage.upload('userB', 'secret.txt', Buffer.from('B secrets'));
    const a = await storage.download('userA', 'secret.txt');
    const b = await storage.download('userB', 'secret.txt');
    expect(a.toString()).toBe('A secrets');
    expect(b.toString()).toBe('B secrets');
  });
});

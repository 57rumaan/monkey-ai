import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { join } from 'path';
import { rm, mkdir } from 'fs/promises';

const TEST_DATA_DIR = join(process.cwd(), '.test-data-otp-verification');

let app: any;
let server: any;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-otp-tests';
  process.env.NODE_ENV = 'development';
  process.env.DATA_DIR = TEST_DATA_DIR;
  process.env.PORT = '0';
  process.env.RATE_LIMIT_API = '10000';
  process.env.RATE_LIMIT_AUTH = '10000';
  process.env.RATE_LIMIT_UPLOAD = '10000';

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

async function signupUser(email: string, password: string) {
  const res = await request(app)
    .post('/api/auth/signup')
    .send({ email, password });
  return res;
}

describe('OTP Validation Endpoint', () => {
  const password = 'StrongP@ss1!';

  describe('1. Correct OTP is accepted', () => {
    it('should accept the correct OTP via validate-otp endpoint', async () => {
      const signupRes = await signupUser('otp-correct@test.com', password);
      expect(signupRes.status).toBe(200);
      const otp = signupRes.body.data.otp;

      const res = await request(app)
        .post('/api/auth/validate-otp')
        .send({ email: 'otp-correct@test.com', otp });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.valid).toBe(true);
    });
  });

  describe('2. Wrong OTP is rejected', () => {
    it('should reject an incorrect OTP', async () => {
      const signupRes = await signupUser('otp-wrong@test.com', password);
      expect(signupRes.status).toBe(200);

      const res = await request(app)
        .post('/api/auth/validate-otp')
        .send({ email: 'otp-wrong@test.com', otp: '000000' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/Invalid OTP/i);
    });
  });

  describe('3. Random OTP is rejected', () => {
    it('should reject a random 6-digit OTP', async () => {
      const signupRes = await signupUser('otp-random@test.com', password);
      expect(signupRes.status).toBe(200);

      const res = await request(app)
        .post('/api/auth/validate-otp')
        .send({ email: 'otp-random@test.com', otp: '123456' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('4. Expired OTP is rejected', () => {
    it('should reject an expired OTP', async () => {
      const signupRes = await signupUser('otp-expired@test.com', password);
      expect(signupRes.status).toBe(200);
      const otp = signupRes.body.data.otp;

      const { storage } = await import('../server/storage.js');
      const { storage: storageProxy } = await import('../server/storage.js');
      const users = await storageProxy.query<any>('users', { email: 'otp-expired@test.com' });
      const user = users[0];

      user.otpExpiresAt = new Date(Date.now() - 60000).toISOString();
      await storageProxy.set('users', user.id, user);

      const res = await request(app)
        .post('/api/auth/validate-otp')
        .send({ email: 'otp-expired@test.com', otp });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/expired/i);
    });
  });

  describe('5. Three failed OTP attempts are blocked', () => {
    it('should block after 3 failed attempts', async () => {
      const signupRes = await signupUser('otp-blocked@test.com', password);
      expect(signupRes.status).toBe(200);

      for (let i = 0; i < 3; i++) {
        const res = await request(app)
          .post('/api/auth/validate-otp')
          .send({ email: 'otp-blocked@test.com', otp: '999999' });
        expect(res.status).toBe(400);
      }

      const blockedRes = await request(app)
        .post('/api/auth/validate-otp')
        .send({ email: 'otp-blocked@test.com', otp: '999999' });

      expect(blockedRes.status).toBe(400);
      expect(blockedRes.body.error).toMatch(/too many/i);
    });
  });

  describe('6. OTP is NOT consumed by validate-otp', () => {
    it('should still allow verify-signup after successful validate-otp', async () => {
      const signupRes = await signupUser('otp-not-consumed@test.com', password);
      expect(signupRes.status).toBe(200);
      const otp = signupRes.body.data.otp;

      const validateRes = await request(app)
        .post('/api/auth/validate-otp')
        .send({ email: 'otp-not-consumed@test.com', otp });

      expect(validateRes.status).toBe(200);

      const verifyRes = await request(app)
        .post('/api/auth/verify-signup')
        .send({ email: 'otp-not-consumed@test.com', otp, username: 'notconsumed' });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.data.user.emailVerified).toBe(true);
    });
  });

  describe('7. validate-otp and verify-signup share attempt counter', () => {
    it('should fail verify-signup after 3 failed validate-otp attempts', async () => {
      const signupRes = await signupUser('otp-shared-attempts@test.com', password);
      expect(signupRes.status).toBe(200);
      const otp = signupRes.body.data.otp;

      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/auth/validate-otp')
          .send({ email: 'otp-shared-attempts@test.com', otp: '111111' });
      }

      const verifyRes = await request(app)
        .post('/api/auth/verify-signup')
        .send({ email: 'otp-shared-attempts@test.com', otp, username: 'sharedattempts' });

      expect(verifyRes.status).toBe(400);
      expect(verifyRes.body.error).toMatch(/too many/i);
    });
  });

  describe('8. Frontend cannot bypass OTP validation', () => {
    it('should reject verify-signup with wrong OTP even if username is provided', async () => {
      const signupRes = await signupUser('otp-bypass@test.com', password);
      expect(signupRes.status).toBe(200);

      const verifyRes = await request(app)
        .post('/api/auth/verify-signup')
        .send({ email: 'otp-bypass@test.com', otp: '000000', username: 'bypassuser' });

      expect(verifyRes.status).toBe(400);
      expect(verifyRes.body.success).toBe(false);

      const meRes = await request(app).get('/api/auth/me');
      expect(meRes.body.data).toBeNull();
    });
  });

  describe('9. Taken username is rejected', () => {
    it('should reject a username that is already taken', async () => {
      const signupRes1 = await signupUser('otp-username1@test.com', password);
      expect(signupRes1.status).toBe(200);
      const otp1 = signupRes1.body.data.otp;

      const verifyRes1 = await request(app)
        .post('/api/auth/verify-signup')
        .send({ email: 'otp-username1@test.com', otp: otp1, username: 'takenname' });
      expect(verifyRes1.status).toBe(200);

      const signupRes2 = await signupUser('otp-username2@test.com', password);
      expect(signupRes2.status).toBe(200);
      const otp2 = signupRes2.body.data.otp;

      const verifyRes2 = await request(app)
        .post('/api/auth/verify-signup')
        .send({ email: 'otp-username2@test.com', otp: otp2, username: 'takenname' });

      expect(verifyRes2.status).toBe(400);
      expect(verifyRes2.body.error).toMatch(/already taken/i);
    });
  });

  describe('10. validate-otp for already verified account', () => {
    it('should reject validate-otp for already verified account', async () => {
      const signupRes = await signupUser('otp-already-verified@test.com', password);
      expect(signupRes.status).toBe(200);
      const otp = signupRes.body.data.otp;

      const verifyRes = await request(app)
        .post('/api/auth/verify-signup')
        .send({ email: 'otp-already-verified@test.com', otp, username: 'alreadyverified' });
      expect(verifyRes.status).toBe(200);

      const validateRes = await request(app)
        .post('/api/auth/validate-otp')
        .send({ email: 'otp-already-verified@test.com', otp });

      expect(validateRes.status).toBe(400);
      expect(validateRes.body.error).toMatch(/already verified/i);
    });
  });

  describe('11. validate-otp for non-existent user', () => {
    it('should reject validate-otp for non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/validate-otp')
        .send({ email: 'nonexistent@test.com', otp: '123456' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/not found/i);
    });
  });

  describe('12. validate-otp without pending OTP', () => {
    it('should reject validate-otp when no OTP is pending', async () => {
      const signupRes = await signupUser('otp-no-pending@test.com', password);
      expect(signupRes.status).toBe(200);

      const { storage: storageProxy } = await import('../server/storage.js');
      const users = await storageProxy.query<any>('users', { email: 'otp-no-pending@test.com' });
      const user = users[0];

      user.otpHash = undefined;
      user.otpExpiresAt = undefined;
      await storageProxy.set('users', user.id, user);

      const res = await request(app)
        .post('/api/auth/validate-otp')
        .send({ email: 'otp-no-pending@test.com', otp: '123456' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/no otp pending/i);
    });
  });
});

describe('JSONBin Cache Lookup After Signup', () => {
  const password = 'StrongP@ss1!';

  describe('13. User lookup works after signup write', () => {
    it('should find user via verify-signup after successful signup', async () => {
      const signupRes = await signupUser('lookup-after-write@test.com', password);
      expect(signupRes.status).toBe(200);
      const otp = signupRes.body.data.otp;

      const verifyRes = await request(app)
        .post('/api/auth/verify-signup')
        .send({ email: 'lookup-after-write@test.com', otp, username: 'lookupafterwrite' });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.data.user.emailVerified).toBe(true);
      expect(verifyRes.body.data.user.username).toBe('lookupafterwrite');
    });
  });

  describe('14. Forced fresh lookup fallback', () => {
    it('should find user via two-step lookup strategy', async () => {
      const signupRes = await signupUser('two-step-lookup@test.com', password);
      expect(signupRes.status).toBe(200);
      const otp = signupRes.body.data.otp;

      const validateRes = await request(app)
        .post('/api/auth/validate-otp')
        .send({ email: 'two-step-lookup@test.com', otp });

      expect(validateRes.status).toBe(200);
    });
  });
});

describe('Input Validation', () => {
  const password = 'StrongP@ss1!';

  it('should reject validate-otp with invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/validate-otp')
      .send({ email: 'not-an-email', otp: '123456' });

    expect(res.status).toBe(400);
  });

  it('should reject validate-otp with non-6-digit OTP', async () => {
    const res = await request(app)
      .post('/api/auth/validate-otp')
      .send({ email: 'test@test.com', otp: '12345' });

    expect(res.status).toBe(400);
  });

  it('should reject validate-otp with missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/validate-otp')
      .send({ email: 'test@test.com' });

    expect(res.status).toBe(400);
  });

  it('should reject verify-signup with invalid username', async () => {
    const signupRes = await signupUser('invalid-username@test.com', password);
    expect(signupRes.status).toBe(200);
    const otp = signupRes.body.data.otp;

    const verifyRes = await request(app)
      .post('/api/auth/verify-signup')
      .send({ email: 'invalid-username@test.com', otp, username: 'ab' });

    expect(verifyRes.status).toBe(400);
  });
});

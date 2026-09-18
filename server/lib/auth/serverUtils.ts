import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import bcrypt from 'bcryptjs';

export const PASSWORD_HASH_COST = 12;
export const OTP_LENGTH = 6;
export const OTP_EXPIRY_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 3;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, PASSWORD_HASH_COST);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateOTP(): string {
  const bytes = randomBytes(4);
  const num = bytes.readUInt32BE(0);
  return String(100000 + (num % 900000));
}

export function hashOTP(otp: string): string {
  return createHash('sha256').update(otp).digest('hex');
}

export function verifyOTP(otp: string, hash: string): boolean {
  const otpHash = hashOTP(otp);
  return timingSafeEqual(Buffer.from(otpHash), Buffer.from(hash));
}

export function generateToken(length = 32): string {
  return randomBytes(length).toString('hex');
}

export function generateId(prefix = ''): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(8).toString('hex');
  return `${prefix}${timestamp}${random}`;
}

export function isEmailValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isUsernameValid(username: string): boolean {
  return /^[a-zA-Z0-9_-]{3,30}$/.test(username);
}

export function isPasswordStrong(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (password.length < 8) errors.push('Password must be at least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('Password must contain at least one uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('Password must contain at least one lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('Password must contain at least one number');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('Password must contain at least one special character');
  return { valid: errors.length === 0, errors };
}

export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
}

export function createRateLimiter(windowMs: number, maxRequests: number) {
  const requests = new Map<string, number[]>();

  return {
    check(key: string): { allowed: boolean; remaining: number; resetAt: number } {
      const now = Date.now();
      const windowStart = now - windowMs;

      const userRequests = requests.get(key) || [];
      const validRequests = userRequests.filter(t => t > windowStart);

      if (validRequests.length >= maxRequests) {
        const oldest = validRequests[0];
        return {
          allowed: false,
          remaining: 0,
          resetAt: oldest + windowMs,
        };
      }

      validRequests.push(now);
      requests.set(key, validRequests);

      return {
        allowed: true,
        remaining: maxRequests - validRequests.length,
        resetAt: now + windowMs,
      };
    },
    reset(key: string): void {
      requests.delete(key);
    },
  };
}

export const authRateLimiter = createRateLimiter(60 * 1000, 5);
export const apiRateLimiter = createRateLimiter(60 * 1000, 60);
export const otpRateLimiter = createRateLimiter(60 * 1000, 3);
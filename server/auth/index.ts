import { SignJWT, jwtVerify } from 'jose';
import { storage } from '../storage.js';
import type { User, JwtPayload, AuthTokens } from '../types.js';
import { hashPassword, verifyPassword, generateOTP, hashOTP, verifyOTP, generateId, isEmailValid, isUsernameValid, isPasswordStrong, authRateLimiter, otpRateLimiter, OTP_EXPIRY_MINUTES } from '../lib/auth/serverUtils.js';
import { sendOTPEmail, isEmailConfigured } from '../services/email.js';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-in-production-min-32-chars');
const JWT_REFRESH_SECRET = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production-min-32-chars');
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('[FATAL] JWT_SECRET is required in production. Exiting.');
    process.exit(1);
  }
  console.warn('[SECURITY] JWT_SECRET not set — using default dev secret. Set JWT_SECRET env var for production.');
}

export async function createTokens(user: User): Promise<AuthTokens> {
  const accessToken = await new SignJWT({ userId: user.id, email: user.email, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(JWT_SECRET);

  const refreshToken = await new SignJWT({ userId: user.id, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_REFRESH_EXPIRES_IN)
    .sign(JWT_REFRESH_SECRET);

  return { accessToken, refreshToken };
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(token: string): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_REFRESH_SECRET);
    return { userId: payload.userId as string };
  } catch {
    return null;
  }
}

export async function signup(email: string, password: string): Promise<{ user: User; otp: string }> {
  const rateLimit = authRateLimiter.check(`signup:${email}`);
  if (!rateLimit.allowed) {
    throw new Error('Too many signup attempts. Please try again later.');
  }

  if (!isEmailValid(email)) {
    throw new Error('Invalid email address');
  }

  const passwordCheck = isPasswordStrong(password);
  if (!passwordCheck.valid) {
    throw new Error(passwordCheck.errors.join(', '));
  }

  const existingUser = await storage.query<User>('users', { email });
  if (existingUser.length > 0) {
    throw new Error('Email already registered');
  }

  const otp = generateOTP();
  const otpHash = hashOTP(otp);
  const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

  const user: User = {
    id: generateId('usr_'),
    email: email.toLowerCase(),
    username: '',
    passwordHash: await hashPassword(password),
    role: 'user',
    emailVerified: false,
    otpHash,
    otpExpiresAt,
    otpAttempts: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await storage.set('users', user.id, user);

  if (isEmailConfigured()) {
    await sendOTPEmail(email, otp, 'signup');
  }

  return { user, otp };
}

export async function verifySignupOTP(email: string, otp: string, username: string): Promise<User> {
  const rateLimit = otpRateLimiter.check(`verify:${email}`);
  if (!rateLimit.allowed) {
    throw new Error('Too many verification attempts. Please try again later.');
  }

  if (!isUsernameValid(username)) {
    throw new Error('Username must be 3-30 characters, alphanumeric, underscore, or hyphen');
  }

  const users = await storage.query<User>('users', { email: email.toLowerCase() });
  const user = users[0];
  if (!user) {
    throw new Error('User not found');
  }

  if (user.emailVerified) {
    throw new Error('Account already verified');
  }

  if (!user.otpHash || !user.otpExpiresAt) {
    throw new Error('No OTP pending');
  }

  if (new Date(user.otpExpiresAt) < new Date()) {
    throw new Error('OTP expired. Please request a new one.');
  }

  if (user.otpAttempts >= 3) {
    throw new Error('Too many failed attempts. Please request a new OTP.');
  }

  if (!verifyOTP(otp, user.otpHash)) {
    user.otpAttempts++;
    await storage.set('users', user.id, user);
    throw new Error('Invalid OTP');
  }

  const existingUsername = await storage.query<User>('users', { username });
  if (existingUsername.length > 0) {
    throw new Error('Username already taken');
  }

  user.username = username;
  user.emailVerified = true;
  user.otpHash = undefined;
  user.otpExpiresAt = undefined;
  user.otpAttempts = 0;
  user.updatedAt = new Date().toISOString();

  await storage.set('users', user.id, user);
  return user;
}

export async function resendOTP(email: string): Promise<string> {
  const rateLimit = otpRateLimiter.check(`resend:${email}`);
  if (!rateLimit.allowed) {
    throw new Error(`Please wait ${Math.ceil((rateLimit.resetAt - Date.now()) / 1000)} seconds before requesting a new OTP`);
  }

  const users = await storage.query<User>('users', { email: email.toLowerCase() });
  const user = users[0];
  if (!user) {
    throw new Error('User not found');
  }

  if (user.emailVerified) {
    throw new Error('Account already verified');
  }

  const otp = generateOTP();
  user.otpHash = hashOTP(otp);
  user.otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();
  user.otpAttempts = 0;
  user.lastOtpSentAt = new Date().toISOString();
  user.updatedAt = new Date().toISOString();

  await storage.set('users', user.id, user);

  if (isEmailConfigured()) {
    await sendOTPEmail(email, otp, 'signup');
  }

  return otp;
}

export async function login(emailOrUsername: string, password: string): Promise<{ user: User; tokens: AuthTokens }> {
  const rateLimit = authRateLimiter.check(`login:${emailOrUsername}`);
  if (!rateLimit.allowed) {
    throw new Error('Too many login attempts. Please try again later.');
  }

  const users = await storage.query<User>('users', {
    email: emailOrUsername.toLowerCase(),
  });
  let user = users[0];

  if (!user) {
    users.push(...await storage.query<User>('users', { username: emailOrUsername }));
    user = users[0];
  }

  if (!user) {
    throw new Error('Invalid credentials');
  }

  if (!user.emailVerified) {
    throw new Error('Email not verified. Please complete signup.');
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw new Error('Invalid credentials');
  }

  const tokens = await createTokens(user);
  return { user, tokens };
}

export async function forgotPassword(email: string): Promise<string | void> {
  const rateLimit = authRateLimiter.check(`forgot:${email}`);
  if (!rateLimit.allowed) {
    throw new Error('Too many requests. Please try again later.');
  }

  const users = await storage.query<User>('users', { email: email.toLowerCase() });
  const user = users[0];
  if (!user) {
    if (isEmailConfigured()) {
      return;
    }
    return 'If the email exists, a reset OTP has been sent';
  }

  const otp = generateOTP();
  user.otpHash = hashOTP(otp);
  user.otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();
  user.otpAttempts = 0;
  user.lastOtpSentAt = new Date().toISOString();
  user.updatedAt = new Date().toISOString();

  await storage.set('users', user.id, user);

  if (isEmailConfigured()) {
    await sendOTPEmail(email, otp, 'reset');
  }

  return otp;
}

export async function resetPassword(email: string, otp: string, newPassword: string): Promise<void> {
  const rateLimit = otpRateLimiter.check(`reset:${email}`);
  if (!rateLimit.allowed) {
    throw new Error('Too many attempts. Please try again later.');
  }

  const passwordCheck = isPasswordStrong(newPassword);
  if (!passwordCheck.valid) {
    throw new Error(passwordCheck.errors.join(', '));
  }

  const users = await storage.query<User>('users', { email: email.toLowerCase() });
  const user = users[0];
  if (!user) {
    throw new Error('Invalid reset request');
  }

  if (!user.otpHash || !user.otpExpiresAt) {
    throw new Error('No reset OTP pending');
  }

  if (new Date(user.otpExpiresAt) < new Date()) {
    throw new Error('OTP expired');
  }

  if (user.otpAttempts >= 3) {
    throw new Error('Too many failed attempts');
  }

  if (!verifyOTP(otp, user.otpHash)) {
    user.otpAttempts++;
    await storage.set('users', user.id, user);
    throw new Error('Invalid OTP');
  }

  user.passwordHash = await hashPassword(newPassword);
  user.otpHash = undefined;
  user.otpExpiresAt = undefined;
  user.otpAttempts = 0;
  user.updatedAt = new Date().toISOString();

  await storage.set('users', user.id, user);
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
  const user = await storage.get<User>('users', userId);
  if (!user) throw new Error('User not found');

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) throw new Error('Current password is incorrect');

  const passwordCheck = isPasswordStrong(newPassword);
  if (!passwordCheck.valid) throw new Error(passwordCheck.errors.join(', '));

  user.passwordHash = await hashPassword(newPassword);
  user.updatedAt = new Date().toISOString();
  await storage.set('users', user.id, user);
}

export async function updateProfile(userId: string, data: Partial<Pick<User, 'username' | 'email'>>): Promise<User> {
  const user = await storage.get<User>('users', userId);
  if (!user) throw new Error('User not found');

  if (data.username && data.username !== user.username) {
    if (!isUsernameValid(data.username)) {
      throw new Error('Invalid username format');
    }
    const existing = await storage.query<User>('users', { username: data.username });
    if (existing.length > 0) throw new Error('Username already taken');
    user.username = data.username;
  }

  if (data.email && data.email !== user.email) {
    if (!isEmailValid(data.email)) {
      throw new Error('Invalid email format');
    }
    const existing = await storage.query<User>('users', { email: data.email.toLowerCase() });
    if (existing.length > 0) throw new Error('Email already in use');
    user.email = data.email.toLowerCase();
    user.emailVerified = false;
    const otp = generateOTP();
    user.otpHash = hashOTP(otp);
    user.otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();
  }

  user.updatedAt = new Date().toISOString();
  await storage.set('users', user.id, user);
  return user;
}

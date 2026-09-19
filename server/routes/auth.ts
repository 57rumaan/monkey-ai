import { Router } from 'express';
import { signup, verifySignupOTP, validateSignupOTP, resendOTP, login, forgotPassword, resetPassword, changePassword, updateProfile, createTokens, verifyToken, verifyRefreshToken } from '../auth/index.js';
import { storage } from '../storage.js';
import type { User } from '../types.js';
import { validateBody } from '../validation.js';
import { signupSchema, verifySignupSchema, validateOtpSchema, resendOtpSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema, updateProfileSchema } from '../validation.js';

const router = Router();

router.post('/signup', validateBody(signupSchema), async (req, res) => {
  try {
    const { email, password } = req.validatedBody;
    const { otp } = await signup(email, password);

    res.json({
      success: true,
      data: {
        requiresVerification: true,
        email: email.toLowerCase(),
        otp: process.env.NODE_ENV === 'development' ? otp : undefined,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Signup failed' });
  }
});

router.post('/verify-signup', validateBody(verifySignupSchema), async (req, res) => {
  try {
    const { email, otp, username } = req.validatedBody;
    const user = await verifySignupOTP(email, otp, username);

    const tokens = await createTokens(user);
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({ success: true, data: { user: sanitizeUser(user) } });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Verification failed' });
  }
});

router.post('/validate-otp', validateBody(validateOtpSchema), async (req, res) => {
  try {
    const { email, otp } = req.validatedBody;
    await validateSignupOTP(email, otp);
    res.json({ success: true, data: { valid: true } });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Validation failed' });
  }
});

router.post('/resend-otp', validateBody(resendOtpSchema), async (req, res) => {
  try {
    const { email } = req.validatedBody;
    const otp = await resendOTP(email);
    res.json({ success: true, data: { otp: process.env.NODE_ENV === 'development' ? otp : undefined } });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed to resend OTP' });
  }
});

router.post('/login', validateBody(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.validatedBody;
    const { user, tokens } = await login(email, password);

    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({ success: true, data: { user: sanitizeUser(user) } });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Login failed' });
  }
});

router.post('/logout', (req, res) => {
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  };
  res.clearCookie('accessToken', cookieOpts);
  res.clearCookie('refreshToken', cookieOpts);
  res.json({ success: true });
});

router.post('/forgot-password', validateBody(forgotPasswordSchema), async (req, res) => {
  try {
    const { email } = req.validatedBody;
    const otp = await forgotPassword(email);
    res.json({ success: true, data: { otp: process.env.NODE_ENV === 'development' ? otp : undefined } });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed to process request' });
  }
});

router.post('/reset-password', validateBody(resetPasswordSchema), async (req, res) => {
  try {
    const { email, otp, newPassword } = req.validatedBody;
    await resetPassword(email, otp, newPassword);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Password reset failed' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const token = req.cookies?.accessToken;
    if (!token) return res.json({ success: true, data: null });

    const payload = await verifyToken(token);
    if (!payload) return res.json({ success: true, data: null });

    const user = await storage.get<User>('users', payload.userId);
    res.json({ success: true, data: user ? sanitizeUser(user) : null });
  } catch {
    res.json({ success: true, data: null });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ success: false, error: 'No refresh token' });
    }

    const payload = await verifyRefreshToken(refreshToken);
    if (!payload) {
      return res.status(401).json({ success: false, error: 'Invalid refresh token' });
    }

    const user = await storage.get<User>('users', payload.userId);
    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    const tokens = await createTokens(user);
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({ success: true, data: { user: sanitizeUser(user) } });
  } catch {
    res.status(401).json({ success: false, error: 'Token refresh failed' });
  }
});

router.post('/change-password', validateBody(changePasswordSchema), async (req, res) => {
  try {
    const token = req.cookies?.accessToken;
    const payload = token ? await verifyToken(token) : null;
    if (!payload) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { currentPassword, newPassword } = req.validatedBody;
    await changePassword(payload.userId, currentPassword, newPassword);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed to change password' });
  }
});

router.put('/profile', validateBody(updateProfileSchema), async (req, res) => {
  try {
    const token = req.cookies?.accessToken;
    const payload = token ? await verifyToken(token) : null;
    if (!payload) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { username, email } = req.validatedBody;
    const user = await updateProfile(payload.userId, { username, email });
    res.json({ success: true, data: sanitizeUser(user) });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed to update profile' });
  }
});

function sanitizeUser(user: User) {
  const { passwordHash, otpHash, otpExpiresAt, otpAttempts, lastOtpSentAt, ...safe } = user;
  return safe;
}

export default router;
import { Router } from 'express';
import { requireAuth } from '../middleware.js';
import { storage } from '../storage.js';
import type { User } from '../types.js';
import { validateBody, validateParams } from '../validation.js';
import { userRoleSchema, settingsSchema } from '../validation.js';
import { z } from 'zod';

const router = Router();

router.get('/stats', requireAuth('admin'), async (req, res) => {
  try {
    const [users, bundles, providers, chats, messages] = await Promise.all([
      storage.list<User>('users'),
      storage.list('bundles'),
      storage.list('providers'),
      storage.list('chats'),
      storage.list('messages'),
    ]);

    res.json({
      success: true,
      data: {
        users: users.length,
        bundles: bundles.length,
        providers: providers.length,
        chats: chats.length,
        messages: messages.length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

router.get('/users', requireAuth('admin'), async (req, res) => {
  try {
    const users = await storage.list<User>('users');
    const safeUsers = users.map(u => {
      const { passwordHash, otpHash, otpExpiresAt, otpAttempts, lastOtpSentAt, ...safe } = u;
      return safe;
    });
    res.json({ success: true, data: safeUsers });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

router.put('/users/:id/role', requireAuth('admin'), validateParams(z.object({ id: z.string() })), validateBody(userRoleSchema), async (req, res) => {
  try {
    const user = await storage.get<User>('users', req.validatedParams.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const currentUser = (req as any).user;
    const users = await storage.list<User>('users');
    const adminCount = users.filter(u => u.role === 'admin').length;
    if (adminCount <= 1 && user.role === 'admin' && req.validatedBody.role !== 'admin') {
      return res.status(400).json({ success: false, error: 'Cannot demote the last admin' });
    }

    user.role = req.validatedBody.role;
    user.updatedAt = new Date().toISOString();
    await storage.set('users', user.id, user);

    const { passwordHash, otpHash, otpExpiresAt, otpAttempts, lastOtpSentAt, ...safe } = user;
    res.json({ success: true, data: safe });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed to update role' });
  }
});

router.delete('/users/:id', requireAuth('admin'), validateParams(z.object({ id: z.string() })), async (req, res) => {
  try {
    const user = await storage.get<User>('users', req.validatedParams.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const currentUser = (req as any).user;
    if (user.id === currentUser.userId) {
      return res.status(400).json({ success: false, error: 'Cannot delete yourself' });
    }

    await storage.delete('users', req.validatedParams.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete user' });
  }
});

router.get('/settings', requireAuth('admin'), async (req, res) => {
  try {
    const settings = (await storage.get('settings', 'app') || {}) as Record<string, any>;
    const safe = { ...settings };
    if (safe.smtpPass) safe.smtpPass = '••••••••';
    if (safe.smtpUser) safe.smtpUser = safe.smtpUser;
    res.json({ success: true, data: safe });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch settings' });
  }
});

router.put('/settings', requireAuth('admin'), validateBody(settingsSchema), async (req, res) => {
  try {
    await storage.set('settings', 'app', req.validatedBody);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed to update settings' });
  }
});

router.get('/audit-logs', requireAuth('admin'), async (req, res) => {
  try {
    const logs = await storage.list<{ id: string; action: string; userId: string; details: string; createdAt: string }>('auditLogs');
    logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ success: true, data: logs.slice(0, 100) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch audit logs' });
  }
});

export default router;
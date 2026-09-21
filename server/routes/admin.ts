import { Router } from 'express';
import { requireAuth } from '../middleware.js';
import { storage } from '../storage.js';
import type { User, Chat, Message } from '../types.js';
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

router.get('/chats', requireAuth('admin'), async (req, res) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.toLowerCase() : '';
    const filterUserId = typeof req.query.userId === 'string' ? req.query.userId : '';
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 20));

    let chats = await storage.list<Chat>('chats');

    if (filterUserId) {
      chats = chats.filter(c => c.userId === filterUserId);
    }

    if (search) {
      chats = chats.filter(c => c.title.toLowerCase().includes(search));
    }

    chats.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const total = chats.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const paginatedChats = chats.slice(start, start + pageSize);

    const messages = await storage.list<Message>('messages');
    const messageCountMap = new Map<string, number>();
    for (const msg of messages) {
      messageCountMap.set(msg.chatId, (messageCountMap.get(msg.chatId) || 0) + 1);
    }

    const enrichedChats = paginatedChats.map(chat => ({
      ...chat,
      messageCount: messageCountMap.get(chat.id) || 0,
    }));

    res.json({
      success: true,
      data: {
        items: enrichedChats,
        total,
        page,
        pageSize,
        totalPages,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch chats' });
  }
});

router.get('/chats/:id', requireAuth('admin'), validateParams(z.object({ id: z.string() })), async (req, res) => {
  try {
    const chat = await storage.get<Chat>('chats', req.validatedParams.id);
    if (!chat) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }

    const messages = await storage.query<Message>('messages', { chatId: chat.id } as Partial<Message>);
    messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    res.json({ success: true, data: { chat, messages } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch chat' });
  }
});

router.get('/usage', requireAuth('admin'), async (req, res) => {
  try {
    const messages = await storage.list<Message>('messages');
    const chats = await storage.list<Chat>('chats');

    const chatUserMap = new Map<string, string>();
    for (const chat of chats) {
      chatUserMap.set(chat.id, chat.userId);
    }

    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let totalTokens = 0;
    let messagesWithUsage = 0;

    const byModel = new Map<string, { promptTokens: number; completionTokens: number; totalTokens: number; count: number }>();
    const byUser = new Map<string, { promptTokens: number; completionTokens: number; totalTokens: number; count: number }>();
    const byDay = new Map<string, { promptTokens: number; completionTokens: number; totalTokens: number }>();

    for (const msg of messages) {
      if (msg.metadata?.usage) {
        const usage = msg.metadata.usage;
        const prompt = usage.promptTokens || 0;
        const completion = usage.completionTokens || 0;
        const total = usage.totalTokens || 0;

        totalPromptTokens += prompt;
        totalCompletionTokens += completion;
        totalTokens += total;
        messagesWithUsage++;

        const model = msg.metadata.modelUsed || 'unknown';
        const modelStats = byModel.get(model) || { promptTokens: 0, completionTokens: 0, totalTokens: 0, count: 0 };
        modelStats.promptTokens += prompt;
        modelStats.completionTokens += completion;
        modelStats.totalTokens += total;
        modelStats.count++;
        byModel.set(model, modelStats);

        const userId = chatUserMap.get(msg.chatId) || 'unknown';
        const userStats = byUser.get(userId) || { promptTokens: 0, completionTokens: 0, totalTokens: 0, count: 0 };
        userStats.promptTokens += prompt;
        userStats.completionTokens += completion;
        userStats.totalTokens += total;
        userStats.count++;
        byUser.set(userId, userStats);

        const day = msg.createdAt.slice(0, 10);
        const dayStats = byDay.get(day) || { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
        dayStats.promptTokens += prompt;
        dayStats.completionTokens += completion;
        dayStats.totalTokens += total;
        byDay.set(day, dayStats);
      }
    }

    const modelArray = Array.from(byModel.entries())
      .map(([model, stats]) => ({ model, ...stats }))
      .sort((a, b) => b.totalTokens - a.totalTokens);

    const userArray = Array.from(byUser.entries())
      .map(([userId, stats]) => ({ userId, ...stats }))
      .sort((a, b) => b.totalTokens - a.totalTokens);

    const dailyArray = Array.from(byDay.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      success: true,
      data: {
        total: {
          promptTokens: totalPromptTokens,
          completionTokens: totalCompletionTokens,
          totalTokens,
          messagesWithUsage,
          totalMessages: messages.length,
        },
        byModel: modelArray,
        byUser: userArray,
        byDay: dailyArray,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch usage data' });
  }
});

export default router;
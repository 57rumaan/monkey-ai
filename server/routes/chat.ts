import { Router } from 'express';
import { requireAuth } from '../middleware.js';
import { storage } from '../storage.js';
import { generateId } from '../lib/auth/serverUtils.js';
import { router as routeEngine } from '../routing/router.js';
import type { Message, CapabilityType, Chat, Folder, MessageReaction } from '../types.js';
import { validateBody, validateParams } from '../validation.js';
import { chatSendSchema } from '../validation.js';
import { z } from 'zod';

const router = Router();

router.post('/send', requireAuth(), validateBody(chatSendSchema), async (req, res) => {
  try {
    const { bundleId, capability, messages, attachments, options, chatId } = req.validatedBody;
    const user = (req as any).user;

    const resolvedChatId = chatId || generateId('cht_');

    let chat = await storage.get<Chat>('chats', resolvedChatId);
    if (chat && chat.userId !== user.userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    if (!chat) {
      chat = {
        id: resolvedChatId,
        userId: user.userId,
        bundleId,
        title: messages[0]?.content?.slice(0, 50) || 'New Chat',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await storage.set('chats', resolvedChatId, chat);
    }

    const userMessage: Message = {
      id: generateId('msg_'),
      chatId: resolvedChatId,
      role: 'user',
      content: messages[messages.length - 1]?.content || '',
      capability,
      attachments,
      createdAt: new Date().toISOString(),
    };
    await storage.set('messages', userMessage.id, userMessage);

    try {
      const route = await routeEngine.resolveRoute({
        bundleId,
        capability: capability as CapabilityType,
        messages,
        attachments,
        options,
        userId: user.userId,
      });

      const { adapter, rawModel } = route;
      const rules = rawModel.rules;
      const execOptions = {
        temperature: rules.temperature ?? 0.7,
        maxTokens: rules.maxTokens ?? 2048,
        systemPrompt: rules.systemPrompt,
        ...options,
      };

      const startTime = Date.now();
      const response = await adapter.chat(messages, rawModel, execOptions);
      const latencyMs = Date.now() - startTime;

      const assistantMessage: Message = {
        id: generateId('msg_'),
        chatId: resolvedChatId,
        role: 'assistant',
        content: response,
        capability,
        metadata: {
          modelUsed: rawModel.customName,
          providerUsed: route.provider.label,
          tokensUsed: adapter.lastUsage?.totalTokens,
          usage: adapter.lastUsage ? {
            promptTokens: adapter.lastUsage.promptTokens,
            completionTokens: adapter.lastUsage.completionTokens,
            totalTokens: adapter.lastUsage.totalTokens,
          } : undefined,
          latencyMs,
        },
        createdAt: new Date().toISOString(),
      };
      await storage.set('messages', assistantMessage.id, assistantMessage);

      chat.updatedAt = new Date().toISOString();
      await storage.set('chats', resolvedChatId, chat);

      res.json({ success: true, data: { message: assistantMessage, chatId: resolvedChatId } });
    } catch (error) {
      const errorMessage: Message = {
        id: generateId('msg_'),
        chatId: resolvedChatId,
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        capability,
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
        createdAt: new Date().toISOString(),
      };
      await storage.set('messages', errorMessage.id, errorMessage);
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Generation failed' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to process chat' });
  }
});

router.post('/stream', requireAuth(), validateBody(chatSendSchema), async (req, res) => {
  try {
    const { bundleId, capability, messages, attachments, options, chatId } = req.validatedBody;
    const editedMessageId = (req.validatedBody as Record<string, unknown>).editedMessageId as string | undefined;
    const user = (req as any).user;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const resolvedChatId = chatId || generateId('cht_');

    let chat = await storage.get<Chat>('chats', resolvedChatId);
    if (chat && chat.userId !== user.userId) {
      res.write(`data: ${JSON.stringify({ error: 'Access denied' })}\n\n`);
      res.end();
      return;
    }
    if (!chat) {
      chat = {
        id: resolvedChatId,
        userId: user.userId,
        bundleId,
        title: messages[0]?.content?.slice(0, 50) || 'New Chat',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await storage.set('chats', resolvedChatId, chat);
    }

    if (editedMessageId) {
      const existingMsg = await storage.get<Message>('messages', editedMessageId);
      if (existingMsg && existingMsg.chatId === resolvedChatId && existingMsg.role === 'user') {
        existingMsg.content = messages[messages.length - 1]?.content || '';
        if (attachments && attachments.length > 0) {
          existingMsg.attachments = attachments;
        }
        existingMsg.createdAt = new Date().toISOString();
        await storage.set('messages', editedMessageId, existingMsg);

        const allMessages = await storage.query<Message>('messages', { chatId: resolvedChatId } as Partial<Message>);
        for (const msg of allMessages) {
          if (msg.role === 'assistant' && new Date(msg.createdAt).getTime() > new Date(existingMsg.createdAt).getTime()) {
            await storage.delete('messages', msg.id);
          }
        }
      }
    } else {
      const userMessage: Message = {
        id: generateId('msg_'),
        chatId: resolvedChatId,
        role: 'user',
        content: messages[messages.length - 1]?.content || '',
        capability,
        attachments,
        createdAt: new Date().toISOString(),
      };
      await storage.set('messages', userMessage.id, userMessage);
    }

    const route = await routeEngine.resolveRoute({
      bundleId,
      capability: capability as CapabilityType,
      messages,
      attachments,
      options,
      userId: user.userId,
    });

    const { adapter, rawModel } = route;
    const rules = rawModel.rules;
    const execOptions = {
      temperature: rules.temperature ?? 0.7,
      maxTokens: rules.maxTokens ?? 2048,
      systemPrompt: rules.systemPrompt,
      ...options,
    };

    let fullResponse = '';
    let hasError = false;

    const startTime = Date.now();
    try {
      if ('chatStream' in adapter && typeof adapter.chatStream === 'function') {
        for await (const chunk of adapter.chatStream(messages, rawModel, execOptions)) {
          fullResponse += chunk;
          res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        }
      } else {
        const response = await adapter.chat(messages, rawModel, execOptions);
        fullResponse = response;
        res.write(`data: ${JSON.stringify({ chunk: response })}\n\n`);
      }
    } catch (error) {
      hasError = true;
      const errorMsg = error instanceof Error ? error.message : 'Generation failed';
      res.write(`data: ${JSON.stringify({ error: errorMsg })}\n\n`);
    }
    const latencyMs = Date.now() - startTime;

    const assistantMessage: Message = {
      id: generateId('msg_'),
      chatId: resolvedChatId,
      role: 'assistant',
      content: fullResponse || 'Error occurred',
      capability,
      metadata: {
        modelUsed: rawModel.customName,
        providerUsed: route.provider.label,
        tokensUsed: adapter.lastUsage?.totalTokens,
        usage: adapter.lastUsage ? {
          promptTokens: adapter.lastUsage.promptTokens,
          completionTokens: adapter.lastUsage.completionTokens,
          totalTokens: adapter.lastUsage.totalTokens,
        } : undefined,
        latencyMs,
        error: hasError ? (fullResponse || 'Generation failed') : undefined,
      },
      createdAt: new Date().toISOString(),
    };
    await storage.set('messages', assistantMessage.id, assistantMessage);

    chat.updatedAt = new Date().toISOString();
    await storage.set('chats', resolvedChatId, chat);

    res.write(`data: ${JSON.stringify({ done: true, messageId: assistantMessage.id, chatId: resolvedChatId })}\n\n`);
    res.end();
  } catch (error) {
    res.write(`data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Stream failed' })}\n\n`);
    res.end();
  }
});

router.get('/chats', requireAuth(), async (req, res) => {
  try {
    const user = (req as any).user;
    const chats = await storage.query<Chat>('chats', { userId: user.userId });
    chats.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    res.json({ success: true, data: chats });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch chats' });
  }
});

router.get('/chats/:id', requireAuth(), validateParams(z.object({ id: z.string() })), async (req, res) => {
  try {
    const user = (req as any).user;
    const chat = await storage.get<Chat>('chats', req.validatedParams.id);
    if (!chat || chat.userId !== user.userId) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }
    const messages = await storage.query<Message>('messages', { chatId: chat.id });
    messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    res.json({ success: true, data: { chat, messages } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch chat' });
  }
});

router.patch('/chats/:id', requireAuth(), validateParams(z.object({ id: z.string() })), async (req, res) => {
  try {
    const user = (req as any).user;
    const chat = await storage.get<Chat>('chats', req.validatedParams.id);
    if (!chat || chat.userId !== user.userId) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    if (!title || title.length > 100) {
      return res.status(400).json({ success: false, error: 'Title must be 1-100 characters' });
    }
    chat.title = title;
    chat.updatedAt = new Date().toISOString();
    await storage.set('chats', req.validatedParams.id, chat);
    res.json({ success: true, data: chat });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to rename chat' });
  }
});

router.delete('/chats/:chatId/messages/:messageId', requireAuth(), validateParams(z.object({ chatId: z.string(), messageId: z.string() })), async (req, res) => {
  try {
    const user = (req as any).user;
    const chat = await storage.get<Chat>('chats', req.validatedParams.chatId);
    if (!chat || chat.userId !== user.userId) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }
    const message = await storage.get<Message>('messages', req.validatedParams.messageId);
    if (!message || message.chatId !== req.validatedParams.chatId) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }
    await storage.delete('messages', req.validatedParams.messageId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete message' });
  }
});

router.patch('/chats/:chatId/messages/:messageId', requireAuth(), validateParams(z.object({ chatId: z.string(), messageId: z.string() })), async (req, res) => {
  try {
    const user = (req as any).user;
    const chat = await storage.get<Chat>('chats', req.validatedParams.chatId);
    if (!chat || chat.userId !== user.userId) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }
    const message = await storage.get<Message>('messages', req.validatedParams.messageId);
    if (!message || message.chatId !== req.validatedParams.chatId || message.role !== 'user') {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }
    const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
    if (!content || content.length > 50000) {
      return res.status(400).json({ success: false, error: 'Content must be 1-50000 characters' });
    }
    message.content = content;
    message.createdAt = new Date().toISOString();
    await storage.set('messages', req.validatedParams.messageId, message);

    chat.updatedAt = new Date().toISOString();
    await storage.set('chats', req.validatedParams.chatId, chat);

    res.json({ success: true, data: message });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to edit message' });
  }
});

router.get('/chats/:id/messages', requireAuth(), validateParams(z.object({ id: z.string() })), async (req, res) => {
  try {
    const user = (req as any).user;
    const chat = await storage.get<Chat>('chats', req.validatedParams.id);
    if (!chat || chat.userId !== user.userId) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 30));

    const result = await storage.getPaginated<Message>('messages', page, pageSize, { chatId: chat.id } as Partial<Message>);
    result.items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch messages' });
  }
});

router.get('/chats/:id/export', requireAuth(), validateParams(z.object({ id: z.string() })), async (req, res) => {
  try {
    const user = (req as any).user;
    const chat = await storage.get<Chat>('chats', req.validatedParams.id);
    if (!chat || chat.userId !== user.userId) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }

    const messages = await storage.query<Message>('messages', { chatId: chat.id } as Partial<Message>);
    messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const format = (req.query.format as string) === 'txt' ? 'txt' : 'md';
    const title = chat.title || 'Untitled Chat';

    if (format === 'txt') {
      let output = `${title}\n${'='.repeat(title.length)}\n\n`;
      for (const msg of messages) {
        const role = msg.role === 'user' ? 'You' : msg.role === 'assistant' ? 'Assistant' : 'System';
        output += `[${role}]\n${msg.content}\n\n`;
      }
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${title.replace(/[^a-zA-Z0-9-_ ]/g, '').trimEnd() || 'chat'}.txt"`);
      res.send(output);
    } else {
      let output = `# ${title}\n\n`;
      for (const msg of messages) {
        const role = msg.role === 'user' ? '## You' : msg.role === 'assistant' ? '## Assistant' : '## System';
        output += `${role}\n\n${msg.content}\n\n---\n\n`;
      }
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${title.replace(/[^a-zA-Z0-9-_ ]/g, '').trimEnd() || 'chat'}.md"`);
      res.send(output);
    }
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to export chat' });
  }
});

router.delete('/chats/:id', requireAuth(), validateParams(z.object({ id: z.string() })), async (req, res) => {
  try {
    const user = (req as any).user;
    const chat = await storage.get<Chat>('chats', req.validatedParams.id);
    if (!chat || chat.userId !== user.userId) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }

    await storage.delete('chats', req.validatedParams.id);
    const messages = await storage.query<Message>('messages', { chatId: req.validatedParams.id } as Partial<Message>);
    for (const msg of messages) {
      const reactions = await storage.query<MessageReaction>('reactions', { messageId: msg.id } as unknown as Partial<MessageReaction>);
      for (const reaction of reactions) {
        await storage.delete('reactions', reaction.id);
      }
      await storage.delete('messages', msg.id);
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete chat' });
  }
});

router.patch('/chats/:id/pin', requireAuth(), validateParams(z.object({ id: z.string() })), async (req, res) => {
  try {
    const user = (req as any).user;
    const chat = await storage.get<Chat>('chats', req.validatedParams.id);
    if (!chat || chat.userId !== user.userId) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }
    chat.pinned = !chat.pinned;
    chat.updatedAt = new Date().toISOString();
    await storage.set('chats', req.validatedParams.id, chat);
    res.json({ success: true, data: chat });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to pin chat' });
  }
});

router.patch('/chats/:id/folder', requireAuth(), validateParams(z.object({ id: z.string() })), async (req, res) => {
  try {
    const user = (req as any).user;
    const chat = await storage.get<Chat>('chats', req.validatedParams.id);
    if (!chat || chat.userId !== user.userId) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }
    const folderId = typeof req.body?.folderId === 'string' ? req.body.folderId : null;
    if (folderId) {
      const folder = await storage.get<Folder>('folders', folderId);
      if (!folder || folder.userId !== user.userId) {
        return res.status(404).json({ success: false, error: 'Folder not found' });
      }
    }
    chat.folderId = folderId || undefined;
    chat.updatedAt = new Date().toISOString();
    await storage.set('chats', req.validatedParams.id, chat);
    res.json({ success: true, data: chat });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to move chat' });
  }
});

router.get('/folders', requireAuth(), async (req, res) => {
  try {
    const user = (req as any).user;
    const folders = await storage.query<Folder>('folders', { userId: user.userId } as Partial<Folder>);
    folders.sort((a, b) => a.name.localeCompare(b.name));
    res.json({ success: true, data: folders });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch folders' });
  }
});

router.post('/folders', requireAuth(), async (req, res) => {
  try {
    const user = (req as any).user;
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name || name.length > 50) {
      return res.status(400).json({ success: false, error: 'Folder name must be 1-50 characters' });
    }
    const folder: Folder = {
      id: generateId('fld_'),
      userId: user.userId,
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await storage.set('folders', folder.id, folder);
    res.json({ success: true, data: folder });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create folder' });
  }
});

router.patch('/folders/:id', requireAuth(), validateParams(z.object({ id: z.string() })), async (req, res) => {
  try {
    const user = (req as any).user;
    const folder = await storage.get<Folder>('folders', req.validatedParams.id);
    if (!folder || folder.userId !== user.userId) {
      return res.status(404).json({ success: false, error: 'Folder not found' });
    }
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name || name.length > 50) {
      return res.status(400).json({ success: false, error: 'Folder name must be 1-50 characters' });
    }
    folder.name = name;
    folder.updatedAt = new Date().toISOString();
    await storage.set('folders', req.validatedParams.id, folder);
    res.json({ success: true, data: folder });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to rename folder' });
  }
});

router.delete('/folders/:id', requireAuth(), validateParams(z.object({ id: z.string() })), async (req, res) => {
  try {
    const user = (req as any).user;
    const folder = await storage.get<Folder>('folders', req.validatedParams.id);
    if (!folder || folder.userId !== user.userId) {
      return res.status(404).json({ success: false, error: 'Folder not found' });
    }
    const chats = await storage.query<Chat>('chats', { userId: user.userId, folderId: req.validatedParams.id } as unknown as Partial<Chat>);
    for (const chat of chats) {
      chat.folderId = undefined;
      await storage.set('chats', chat.id, chat);
    }
    await storage.delete('folders', req.validatedParams.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete folder' });
  }
});

router.post('/messages/:messageId/reactions', requireAuth(), validateParams(z.object({ messageId: z.string() })), async (req, res) => {
  try {
    const user = (req as any).user;
    const emoji = typeof req.body?.emoji === 'string' ? req.body.emoji.trim() : '';
    if (!emoji || emoji.length > 8) {
      return res.status(400).json({ success: false, error: 'Invalid emoji' });
    }
    const message = await storage.get<Message>('messages', req.validatedParams.messageId);
    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }
    const chat = await storage.get<Chat>('chats', message.chatId);
    if (!chat || chat.userId !== user.userId) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }
    const existing = await storage.query<MessageReaction>('reactions', {
      messageId: req.validatedParams.messageId,
      userId: user.userId,
    } as unknown as Partial<MessageReaction>);
    if (existing.length > 0) {
      if (existing[0].emoji === emoji) {
        await storage.delete('reactions', existing[0].id);
        return res.json({ success: true, data: null });
      }
      existing[0].emoji = emoji;
      await storage.set('reactions', existing[0].id, existing[0]);
      return res.json({ success: true, data: existing[0] });
    }
    const reaction: MessageReaction = {
      id: generateId('rxn_'),
      messageId: req.validatedParams.messageId,
      userId: user.userId,
      emoji,
      createdAt: new Date().toISOString(),
    };
    await storage.set('reactions', reaction.id, reaction);
    res.json({ success: true, data: reaction });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to react' });
  }
});

router.get('/messages/:messageId/reactions', requireAuth(), validateParams(z.object({ messageId: z.string() })), async (req, res) => {
  try {
    const user = (req as any).user;
    const message = await storage.get<Message>('messages', req.validatedParams.messageId);
    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }
    const chat = await storage.get<Chat>('chats', message.chatId);
    if (!chat || chat.userId !== user.userId) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }
    const reactions = await storage.query<MessageReaction>('reactions', { messageId: req.validatedParams.messageId } as unknown as Partial<MessageReaction>);
    res.json({ success: true, data: reactions });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch reactions' });
  }
});

router.post('/chats/:id/branch', requireAuth(), validateParams(z.object({ id: z.string() })), async (req, res) => {
  try {
    const user = (req as any).user;
    const chat = await storage.get<Chat>('chats', req.validatedParams.id);
    if (!chat || chat.userId !== user.userId) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }

    const fromMessageId = typeof req.body?.fromMessageId === 'string' ? req.body.fromMessageId : null;
    const messages = await storage.query<Message>('messages', { chatId: chat.id } as Partial<Message>);
    messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    let branchMessages = messages;
    if (fromMessageId) {
      const idx = messages.findIndex(m => m.id === fromMessageId);
      if (idx >= 0) {
        branchMessages = messages.slice(0, idx + 1);
      }
    }

    const newChatId = generateId('cht_');
    const newChat: Chat = {
      id: newChatId,
      userId: user.userId,
      bundleId: chat.bundleId,
      title: `${chat.title || 'Untitled'} (Branch)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await storage.set('chats', newChatId, newChat);

    for (const msg of branchMessages) {
      const newMsg: Message = {
        ...msg,
        id: generateId('msg_'),
        chatId: newChatId,
        createdAt: new Date().toISOString(),
      };
      await storage.set('messages', newMsg.id, newMsg);
    }

    res.json({ success: true, data: newChat });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to branch chat' });
  }
});

export default router;
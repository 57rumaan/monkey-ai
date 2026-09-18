import { Router } from 'express';
import { requireAuth } from '../middleware';
import { storage } from '../storage';
import { generateId } from '../lib/auth/serverUtils';
import type { Provider, RawModel } from '../types';
import { validateBody, validateParams } from '../validation';
import { providerSchema, rawModelSchema } from '../validation';

const router = Router();

router.get('/', requireAuth('admin'), async (req, res) => {
  try {
    const providers = await storage.list<Provider>('providers');
    res.json({ success: true, data: providers });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch providers' });
  }
});

router.get('/:id', requireAuth('admin'), validateParams(z.object({ id: z.string() })), async (req, res) => {
  try {
    const provider = await storage.get<Provider>('providers', req.validatedParams.id);
    if (!provider) return res.status(404).json({ success: false, error: 'Provider not found' });
    res.json({ success: true, data: provider });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch provider' });
  }
});

router.post('/', requireAuth('admin'), validateBody(providerSchema), async (req, res) => {
  try {
    const provider: Provider = {
      id: generateId('prv_'),
      label: req.validatedBody.label,
      apiKeyEnv: req.validatedBody.apiKeyEnv,
      status: req.validatedBody.status,
      models: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await storage.set('providers', provider.id, provider);
    res.status(201).json({ success: true, data: provider });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed to create provider' });
  }
});

router.put('/:id', requireAuth('admin'), validateParams(z.object({ id: z.string() })), validateBody(providerSchema.partial()), async (req, res) => {
  try {
    const provider = await storage.get<Provider>('providers', req.validatedParams.id);
    if (!provider) return res.status(404).json({ success: false, error: 'Provider not found' });

    const updated: Provider = {
      ...provider,
      ...req.validatedBody,
      id: provider.id,
      createdAt: provider.createdAt,
      updatedAt: new Date().toISOString(),
    };
    await storage.set('providers', provider.id, updated);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed to update provider' });
  }
});

router.delete('/:id', requireAuth('admin'), validateParams(z.object({ id: z.string() })), async (req, res) => {
  try {
    const provider = await storage.get<Provider>('providers', req.validatedParams.id);
    if (!provider) return res.status(404).json({ success: false, error: 'Provider not found' });

    await storage.delete('providers', req.validatedParams.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete provider' });
  }
});

router.post('/:id/models', requireAuth('admin'), validateParams(z.object({ id: z.string() })), validateBody(rawModelSchema), async (req, res) => {
  try {
    const provider = await storage.get<Provider>('providers', req.validatedParams.id);
    if (!provider) return res.status(404).json({ success: false, error: 'Provider not found' });

    const rawModel: RawModel = {
      id: generateId('mdl_'),
      providerId: provider.id,
      customName: req.validatedBody.customName,
      enabled: req.validatedBody.enabled,
      rules: req.validatedBody.rules || {},
      capabilities: req.validatedBody.capabilities,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    provider.models.push(rawModel);
    provider.updatedAt = new Date().toISOString();
    await storage.set('providers', provider.id, provider);

    res.status(201).json({ success: true, data: rawModel });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed to add model' });
  }
});

router.put('/:id/models/:modelId', requireAuth('admin'), validateParams(z.object({ id: z.string(), modelId: z.string() })), validateBody(rawModelSchema.partial()), async (req, res) => {
  try {
    const provider = await storage.get<Provider>('providers', req.validatedParams.id);
    if (!provider) return res.status(404).json({ success: false, error: 'Provider not found' });

    const modelIndex = provider.models.findIndex(m => m.id === req.validatedParams.modelId);
    if (modelIndex === -1) return res.status(404).json({ success: false, error: 'Model not found' });

    provider.models[modelIndex] = {
      ...provider.models[modelIndex],
      ...req.validatedBody,
      id: provider.models[modelIndex].id,
      providerId: provider.id,
      updatedAt: new Date().toISOString(),
    };

    provider.updatedAt = new Date().toISOString();
    await storage.set('providers', provider.id, provider);

    res.json({ success: true, data: provider.models[modelIndex] });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed to update model' });
  }
});

router.delete('/:id/models/:modelId', requireAuth('admin'), validateParams(z.object({ id: z.string(), modelId: z.string() })), async (req, res) => {
  try {
    const provider = await storage.get<Provider>('providers', req.validatedParams.id);
    if (!provider) return res.status(404).json({ success: false, error: 'Provider not found' });

    provider.models = provider.models.filter(m => m.id !== req.validatedParams.modelId);
    provider.updatedAt = new Date().toISOString();
    await storage.set('providers', provider.id, provider);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete model' });
  }
});

import { z } from 'zod';

export default router;
import { Router } from 'express';
import { requireAuth } from '../middleware';
import { storage } from '../storage';
import { generateId } from '../lib/auth/serverUtils';
import type { Bundle, Provider, RawModel } from '../types';
import { CAPABILITY_REGISTRY } from '../capabilities';
import { validateBody, validateParams } from '../validation';
import { bundleSchema, bundleCapabilitySchema } from '../validation';
import { z } from 'zod';

const router = Router();

function sanitizeBundleForUser(bundle: Bundle, isAdmin: boolean): any {
  if (isAdmin) return bundle;
  return {
    ...bundle,
    capabilities: bundle.capabilities.map(c => ({
      capabilityId: c.capabilityId,
      enabled: c.enabled,
      priority: c.priority,
    })),
  };
}

router.get('/', requireAuth(), async (req, res) => {
  try {
    const bundles = await storage.list<Bundle>('bundles');
    const user = (req as any).user;
    const filtered = user.role === 'admin' ? bundles : bundles.filter(b => b.enabled);
    const sanitized = filtered.map(b => sanitizeBundleForUser(b, user.role === 'admin'));
    res.json({ success: true, data: sanitized });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch bundles' });
  }
});

router.get('/capabilities', requireAuth(), async (req, res) => {
  try {
    const capabilities = Object.values(CAPABILITY_REGISTRY);
    res.json({ success: true, data: capabilities });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch capabilities' });
  }
});

router.get('/:id', requireAuth(), validateParams(z.object({ id: z.string() })), async (req, res) => {
  try {
    const bundle = await storage.get<Bundle>('bundles', req.validatedParams.id);
    if (!bundle) return res.status(404).json({ success: false, error: 'Bundle not found' });
    const user = (req as any).user;
    res.json({ success: true, data: sanitizeBundleForUser(bundle, user.role === 'admin') });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch bundle' });
  }
});

router.post('/', requireAuth('admin'), validateBody(bundleSchema), async (req, res) => {
  try {
    const bundle: Bundle = {
      id: generateId('bdl_'),
      name: req.validatedBody.name,
      description: req.validatedBody.description || '',
      tier: req.validatedBody.tier,
      enabled: req.validatedBody.enabled,
      capabilities: req.validatedBody.capabilities || [],
      features: req.validatedBody.features || {
        voiceReplies: false,
        composerAttachments: true,
        customActions: [],
        tools: [],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await storage.set('bundles', bundle.id, bundle);
    res.status(201).json({ success: true, data: bundle });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed to create bundle' });
  }
});

router.put('/:id', requireAuth('admin'), validateParams(z.object({ id: z.string() })), validateBody(bundleSchema.partial()), async (req, res) => {
  try {
    const bundle = await storage.get<Bundle>('bundles', req.validatedParams.id);
    if (!bundle) return res.status(404).json({ success: false, error: 'Bundle not found' });

    const updated: Bundle = {
      ...bundle,
      ...req.validatedBody,
      id: bundle.id,
      createdAt: bundle.createdAt,
      updatedAt: new Date().toISOString(),
    };
    await storage.set('bundles', bundle.id, updated);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed to update bundle' });
  }
});

router.delete('/:id', requireAuth('admin'), validateParams(z.object({ id: z.string() })), async (req, res) => {
  try {
    const bundle = await storage.get<Bundle>('bundles', req.validatedParams.id);
    if (!bundle) return res.status(404).json({ success: false, error: 'Bundle not found' });

    await storage.delete('bundles', req.validatedParams.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete bundle' });
  }
});

router.post('/:id/capabilities', requireAuth('admin'), validateParams(z.object({ id: z.string() })), validateBody(bundleCapabilitySchema), async (req, res) => {
  try {
    const bundle = await storage.get<Bundle>('bundles', req.validatedParams.id);
    if (!bundle) return res.status(404).json({ success: false, error: 'Bundle not found' });

    const { capabilityId, providerId, rawModelId, priority } = req.validatedBody;

    const provider = await storage.get<Provider>('providers', providerId);
    if (!provider) return res.status(400).json({ success: false, error: 'Provider not found' });

    const rawModel = provider.models.find(m => m.id === rawModelId);
    if (!rawModel) return res.status(400).json({ success: false, error: 'Raw model not found' });

    if (!rawModel.capabilities.includes(capabilityId)) {
      return res.status(400).json({ success: false, error: 'Model does not support this capability' });
    }

    const newCapability = {
      capabilityId,
      providerId,
      rawModelId,
      enabled: true,
      priority: priority ?? bundle.capabilities.length,
    };

    bundle.capabilities.push(newCapability);
    bundle.updatedAt = new Date().toISOString();
    await storage.set('bundles', bundle.id, bundle);

    res.status(201).json({ success: true, data: bundle });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Failed to add capability' });
  }
});

router.delete('/:id/capabilities/:capabilityId', requireAuth('admin'), validateParams(z.object({ id: z.string(), capabilityId: z.string() })), async (req, res) => {
  try {
    const bundle = await storage.get<Bundle>('bundles', req.validatedParams.id);
    if (!bundle) return res.status(404).json({ success: false, error: 'Bundle not found' });

    bundle.capabilities = bundle.capabilities.filter(c => c.capabilityId !== req.validatedParams.capabilityId);
    bundle.updatedAt = new Date().toISOString();
    await storage.set('bundles', bundle.id, bundle);

    res.json({ success: true, data: bundle });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to remove capability' });
  }
});

export default router;
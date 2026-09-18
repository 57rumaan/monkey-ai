import { storage } from '../server/storage.js';
import { hashPassword, generateId } from '../server/lib/auth/serverUtils.js';
import type { Provider, RawModel, Bundle, User } from '../server/types.js';

const adminPasswordEnv = process.env.SEED_ADMIN_PASSWORD;
if (!adminPasswordEnv) {
  console.error('[FATAL] SEED_ADMIN_PASSWORD environment variable is required.');
  console.error('Usage: SEED_ADMIN_PASSWORD="<strong-password>" npm run db:seed');
  process.exit(1);
}

async function seed() {
  console.log('🌱 Seeding database...');

  const adminExists = await storage.query<User>('users', { role: 'admin' });
  if (adminExists.length > 0) {
    console.log('✅ Admin user already exists, skipping seed');
    return;
  }

  const providers: Provider[] = [
    {
      id: generateId('prv_'),
      label: 'Hugging Face',
      apiKeyEnv: 'HUGGINGFACE_API_KEY',
      status: 'active',
      models: [
        {
          id: generateId('mdl_'),
          providerId: '',
          customName: 'Qwen 2.5 72B Instruct',
          enabled: true,
          rules: { maxTokens: 4096, temperature: 0.7 },
          capabilities: ['text_to_text', 'coding'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: generateId('mdl_'),
          providerId: '',
          customName: 'FLUX.1 Schnell',
          enabled: true,
          rules: { maxTokens: 2048, temperature: 0.8 },
          capabilities: ['text_to_image'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: generateId('mdl_'),
          providerId: '',
          customName: 'Qwen 2 VL 72B',
          enabled: true,
          rules: { maxTokens: 4096, temperature: 0.5 },
          capabilities: ['image_analysis', 'image_vision', 'document_analysis'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: generateId('prv_'),
      label: 'OpenAI',
      apiKeyEnv: 'OPENAI_API_KEY',
      status: 'inactive',
      models: [
        {
          id: generateId('mdl_'),
          providerId: '',
          customName: 'GPT-4o',
          enabled: true,
          rules: { maxTokens: 4096, temperature: 0.7 },
          capabilities: ['text_to_text', 'coding', 'image_analysis', 'image_vision'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: generateId('mdl_'),
          providerId: '',
          customName: 'DALL-E 3',
          enabled: true,
          rules: { maxTokens: 1000, temperature: 0.8 },
          capabilities: ['text_to_image'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: generateId('mdl_'),
          providerId: '',
          customName: 'TTS-1 HD',
          enabled: true,
          rules: { maxTokens: 4096, temperature: 0.7 },
          capabilities: ['text_to_voice'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: generateId('mdl_'),
          providerId: '',
          customName: 'Whisper',
          enabled: true,
          rules: { maxTokens: 4096, temperature: 0.7 },
          capabilities: ['voice_to_text'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: generateId('prv_'),
      label: 'Anthropic',
      apiKeyEnv: 'ANTHROPIC_API_KEY',
      status: 'inactive',
      models: [
        {
          id: generateId('mdl_'),
          providerId: '',
          customName: 'Claude 3.5 Sonnet',
          enabled: true,
          rules: { maxTokens: 8192, temperature: 0.5 },
          capabilities: ['text_to_text', 'coding', 'image_analysis', 'image_vision', 'document_analysis'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: generateId('mdl_'),
          providerId: '',
          customName: 'Claude 3 Haiku',
          enabled: true,
          rules: { maxTokens: 4096, temperature: 0.7 },
          capabilities: ['text_to_text', 'coding'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: generateId('prv_'),
      label: 'Google',
      apiKeyEnv: 'GOOGLE_API_KEY',
      status: 'inactive',
      models: [
        {
          id: 'gemini-2.5-flash',
          providerId: '',
          customName: 'Gemini 2.5 Flash',
          enabled: true,
          rules: { maxTokens: 65536, temperature: 0.7 },
          capabilities: ['text_to_text', 'coding', 'image_analysis', 'image_vision'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'gemini-3.5-flash',
          providerId: '',
          customName: 'Gemini 3.5 Flash',
          enabled: true,
          rules: { maxTokens: 65536, temperature: 0.7 },
          capabilities: ['text_to_text', 'coding', 'image_analysis', 'image_vision'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: generateId('prv_'),
      label: 'Replicate',
      apiKeyEnv: 'REPLICATE_API_KEY',
      status: 'inactive',
      models: [
        {
          id: generateId('mdl_'),
          providerId: '',
          customName: 'Llama 3.1 405B',
          enabled: true,
          rules: { maxTokens: 4096, temperature: 0.7 },
          capabilities: ['text_to_text', 'coding'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: generateId('mdl_'),
          providerId: '',
          customName: 'Stable Diffusion XL',
          enabled: true,
          rules: { maxTokens: 2048, temperature: 0.8 },
          capabilities: ['text_to_image'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: generateId('mdl_'),
          providerId: '',
          customName: 'VideoCrafter 2',
          enabled: true,
          rules: { maxTokens: 2048, temperature: 0.8 },
          capabilities: ['video_generation'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  for (const provider of providers) {
    for (const model of provider.models) {
      model.providerId = provider.id;
    }
    await storage.set('providers', provider.id, provider);
    console.log(`✅ Created provider: ${provider.label}`);
  }

  const hfProvider = providers[0];

  const bundles: Bundle[] = [
    {
      id: generateId('bdl_'),
      name: 'MONKEY AI FREE',
      description: 'Free tier with basic text and code capabilities',
      tier: 'free',
      enabled: true,
      capabilities: [
        {
          capabilityId: 'text_to_text',
          providerId: hfProvider.id,
          rawModelId: hfProvider.models[0].id,
          enabled: true,
          priority: 0,
        },
        {
          capabilityId: 'coding',
          providerId: hfProvider.id,
          rawModelId: hfProvider.models[0].id,
          enabled: true,
          priority: 0,
        },
      ],
      features: {
        voiceReplies: false,
        composerAttachments: true,
        customActions: [],
        tools: [],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: generateId('bdl_'),
      name: 'MONKEY AI PRO',
      description: 'Professional tier with text, code, image, and vision capabilities',
      tier: 'pro',
      enabled: true,
      capabilities: [
        {
          capabilityId: 'text_to_text',
          providerId: hfProvider.id,
          rawModelId: hfProvider.models[0].id,
          enabled: true,
          priority: 0,
        },
        {
          capabilityId: 'coding',
          providerId: hfProvider.id,
          rawModelId: hfProvider.models[0].id,
          enabled: true,
          priority: 0,
        },
        {
          capabilityId: 'text_to_image',
          providerId: hfProvider.id,
          rawModelId: hfProvider.models[1].id,
          enabled: true,
          priority: 0,
        },
        {
          capabilityId: 'image_analysis',
          providerId: hfProvider.id,
          rawModelId: hfProvider.models[2].id,
          enabled: true,
          priority: 0,
        },
        {
          capabilityId: 'image_vision',
          providerId: hfProvider.id,
          rawModelId: hfProvider.models[2].id,
          enabled: true,
          priority: 0,
        },
        {
          capabilityId: 'document_analysis',
          providerId: hfProvider.id,
          rawModelId: hfProvider.models[2].id,
          enabled: true,
          priority: 0,
        },
      ],
      features: {
        voiceReplies: true,
        composerAttachments: true,
        customActions: [],
        tools: ['calculator', 'datetime'],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: generateId('bdl_'),
      name: 'MONKEY AI VISION',
      description: 'Specialized vision bundle for image and document analysis',
      tier: 'pro',
      enabled: true,
      capabilities: [
        {
          capabilityId: 'image_analysis',
          providerId: hfProvider.id,
          rawModelId: hfProvider.models[2].id,
          enabled: true,
          priority: 0,
        },
        {
          capabilityId: 'image_vision',
          providerId: hfProvider.id,
          rawModelId: hfProvider.models[2].id,
          enabled: true,
          priority: 0,
        },
        {
          capabilityId: 'document_analysis',
          providerId: hfProvider.id,
          rawModelId: hfProvider.models[2].id,
          enabled: true,
          priority: 0,
        },
        {
          capabilityId: 'image_to_text',
          providerId: hfProvider.id,
          rawModelId: hfProvider.models[2].id,
          enabled: true,
          priority: 0,
        },
        {
          capabilityId: 'text_to_image',
          providerId: hfProvider.id,
          rawModelId: hfProvider.models[1].id,
          enabled: true,
          priority: 0,
        },
      ],
      features: {
        voiceReplies: false,
        composerAttachments: true,
        customActions: [],
        tools: [],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  for (const bundle of bundles) {
    await storage.set('bundles', bundle.id, bundle);
    console.log(`✅ Created bundle: ${bundle.name}`);
  }

  const adminPassword = await hashPassword(adminPasswordEnv);
  const admin: User = {
    id: generateId('usr_'),
    email: 'admin@monkey-ai.com',
    username: 'admin',
    passwordHash: adminPassword,
    role: 'admin',
    emailVerified: true,
    otpAttempts: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await storage.set('users', admin.id, admin);
  console.log('✅ Created admin user: admin@monkey-ai.com');

  const settings = {
    appName: 'MONKEY AI',
    appDescription: 'Professional AI Assistant',
    maintenanceMode: false,
    allowSignup: true,
    defaultBundleId: bundles[0].id,
    rateLimitAuth: 5,
    rateLimitApi: 60,
    sessionDurationDays: 7,
    refreshTokenDurationDays: 30,
  };
  await storage.set('settings', 'app', settings);
  console.log('✅ Created default settings');

  console.log('🎉 Seeding complete!');
  console.log('');
  console.log('📋 Summary:');
  console.log(`   Providers: ${providers.length}`);
  console.log(`   Bundles: ${bundles.length}`);
  console.log('   Admin: admin@monkey-ai.com');
}

seed().catch(console.error);

import { z } from 'zod';

export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

export const verifySignupSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  username: z.string().min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscore, and hyphen'),
});

export const validateOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

export const resendOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const loginSchema = z.object({
  email: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

export const updateProfileSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscore, and hyphen').optional(),
  email: z.string().email('Invalid email address').optional(),
}).refine(data => data.username || data.email, {
  message: 'At least one field (username or email) must be provided',
});

export const providerSchema = z.object({
  label: z.string().min(1, 'Label is required').max(100, 'Label too long'),
  apiKeyEnv: z.string().min(1, 'API key environment variable name is required').max(50),
  status: z.enum(['active', 'inactive']).default('inactive'),
});

export const rawModelSchema = z.object({
  customName: z.string().min(1, 'Custom name is required').max(100),
  enabled: z.boolean().default(true),
  rules: z.object({
    maxTokens: z.number().int().positive().optional(),
    temperature: z.number().min(0).max(2).optional(),
    topP: z.number().min(0).max(1).optional(),
    frequencyPenalty: z.number().min(-2).max(2).optional(),
    presencePenalty: z.number().min(-2).max(2).optional(),
    stopSequences: z.array(z.string()).optional(),
    systemPrompt: z.string().optional(),
    customRules: z.record(z.unknown()).optional(),
  }).optional(),
  capabilities: z.array(z.string()).min(1, 'At least one capability is required'),
});

export const bundleSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().optional(),
  tier: z.enum(['free', 'pro', 'enterprise']).default('free'),
  enabled: z.boolean().default(true),
  capabilities: z.array(z.object({
    capabilityId: z.string(),
    providerId: z.string(),
    rawModelId: z.string(),
    enabled: z.boolean().default(true),
    priority: z.number().int().min(0).default(0),
  })).optional(),
  features: z.object({
    voiceReplies: z.boolean().default(false),
    composerAttachments: z.boolean().default(true),
    customActions: z.array(z.object({
      id: z.string(),
      label: z.string(),
      description: z.string(),
      icon: z.string(),
      handler: z.string(),
    })).default([]),
    tools: z.array(z.string()).default([]),
  }).optional(),
});

export const bundleCapabilitySchema = z.object({
  capabilityId: z.string(),
  providerId: z.string(),
  rawModelId: z.string(),
  priority: z.number().int().min(0).optional(),
});

export const chatSendSchema = z.object({
  bundleId: z.string().min(1, 'Bundle ID is required'),
  capability: z.string().min(1, 'Capability is required'),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
  })).min(1, 'At least one message is required'),
  attachments: z.array(z.object({
    id: z.string(),
    type: z.enum(['image', 'document', 'file', 'audio', 'video']),
    name: z.string(),
    url: z.string().min(1),
    size: z.number().int().positive(),
    mimeType: z.string(),
  })).optional(),
  options: z.record(z.unknown()).optional(),
  chatId: z.string().optional(),
  editedMessageId: z.string().optional(),
});

export const userRoleSchema = z.object({
  role: z.enum(['user', 'admin']),
});

export const settingsSchema = z.object({
  appName: z.string().optional(),
  appDescription: z.string().optional(),
  maintenanceMode: z.boolean().optional(),
  allowSignup: z.boolean().optional(),
  defaultBundleId: z.string().optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.number().int().positive().optional(),
  smtpUser: z.string().optional(),
  smtpPass: z.string().optional(),
  smtpFrom: z.string().email().optional().or(z.literal('')),
  rateLimitAuth: z.number().int().positive().max(100).optional(),
  rateLimitApi: z.number().int().positive().max(1000).optional(),
  sessionDurationDays: z.number().int().positive().max(90).optional(),
  refreshTokenDurationDays: z.number().int().positive().max(365).optional(),
});

export function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: any, res: any, next: any) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      return res.status(400).json({ success: false, error: errors });
    }
    req.validatedBody = result.data;
    next();
  };
}

export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return (req: any, res: any, next: any) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      return res.status(400).json({ success: false, error: errors });
    }
    req.validatedQuery = result.data;
    next();
  };
}

export function validateParams<T>(schema: z.ZodSchema<T>) {
  return (req: any, res: any, next: any) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      return res.status(400).json({ success: false, error: errors });
    }
    req.validatedParams = result.data;
    next();
  };
}
export interface User {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  role: 'user' | 'admin';
  emailVerified: boolean;
  otpHash?: string;
  otpExpiresAt?: string;
  otpAttempts: number;
  lastOtpSentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Provider {
  id: string;
  label: string;
  apiKeyEnv: string;
  status: 'active' | 'inactive';
  models: RawModel[];
  createdAt: string;
  updatedAt: string;
}

export interface RawModel {
  id: string;
  providerId: string;
  customName: string;
  enabled: boolean;
  rules: ModelRules;
  capabilities: CapabilityType[];
  createdAt: string;
  updatedAt: string;
}

export interface ModelRules {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  systemPrompt?: string;
  customRules?: Record<string, unknown>;
}

export type CapabilityType =
  | 'text_to_text'
  | 'coding'
  | 'text_to_image'
  | 'image_to_text'
  | 'image_editing'
  | 'image_analysis'
  | 'image_vision'
  | 'video_generation'
  | 'video_analysis'
  | 'video_vision'
  | 'text_to_voice'
  | 'voice_to_text'
  | 'document_analysis'
  | 'file_analysis'
  | 'calculator'
  | 'datetime'
  | 'custom_feature'
  | 'custom_action';

export interface Bundle {
  id: string;
  name: string;
  description: string;
  tier: 'free' | 'pro' | 'enterprise';
  enabled: boolean;
  capabilities: BundleCapability[];
  features: BundleFeatures;
  createdAt: string;
  updatedAt: string;
}

export interface BundleCapability {
  capabilityId: CapabilityType;
  providerId: string;
  rawModelId: string;
  enabled: boolean;
  priority: number;
}

export interface BundleFeatures {
  voiceReplies: boolean;
  composerAttachments: boolean;
  customActions: CustomAction[];
  tools: string[];
}

export interface CustomAction {
  id: string;
  label: string;
  description: string;
  icon: string;
  handler: string;
}

export interface Chat {
  id: string;
  userId: string;
  bundleId: string;
  title: string;
  pinned?: boolean;
  folderId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Folder {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: string;
}

export interface Message {
  id: string;
  chatId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  capability?: CapabilityType;
  attachments?: Attachment[];
  metadata?: MessageMetadata;
  createdAt: string;
}

export interface Attachment {
  id: string;
  type: 'image' | 'document' | 'file' | 'audio' | 'video';
  name: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface MessageMetadata {
  modelUsed?: string;
  providerUsed?: string;
  tokensUsed?: number;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  latencyMs?: number;
  error?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: 'user' | 'admin';
  iat?: number;
  exp?: number;
}

export interface RequestContext {
  userId: string;
  role: 'user' | 'admin';
  bundleId?: string;
}
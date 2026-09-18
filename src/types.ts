// ============================================
// MONKEY AI - Type Definitions
// ============================================

// --- User Types ---
export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  lastActive: string;
  status: 'active' | 'disabled' | 'suspended';
  theme: 'light' | 'dark';
  preferences: UserPreferences;
  usageStats: UsageStats;
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  defaultModel?: string;
  sendOnEnter: boolean;
  sidebarCollapsed: boolean;
}

export interface UsageStats {
  totalMessages: number;
  totalChats: number;
  totalTokens: number;
  lastRequestAt?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// --- Chat Types ---
export interface Chat {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  selectedModelId: string;
  selectedFeatureId: string;
  messages: Message[];
}

export interface Message {
  id: string;
  chatId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  attachments?: Attachment[];
  modelId?: string;
  featureId?: string;
  isStreaming?: boolean;
  error?: string;
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  tokensUsed?: number;
  responseTime?: number;
  providerId?: string;
  modelId?: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  mimeType: string;
}

// --- Provider Types ---
export interface Provider {
  id: string;
  name: string;
  displayName: string;
  type: ProviderType;
  baseUrl: string;
  apiKey: string;
  enabled: boolean;
  config: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export type ProviderType = 'openai' | 'anthropic' | 'google' | 'custom' | 'stability' | 'elevenlabs';

// --- Model Types ---
export interface Model {
  id: string;
  providerId: string;
  providerModelId: string;
  displayName: string;
  description: string;
  enabled: boolean;
  capabilities: CapabilityId[];
  priority: number;
  config?: Record<string, any>;
  metadata?: ModelMetadata;
}

export interface ModelMetadata {
  contextWindow?: number;
  maxTokens?: number;
  pricing?: { input: number; output: number };
  speed?: 'fast' | 'medium' | 'slow';
}

// --- Capability Types ---
export type CapabilityId =
  | 'text_to_text'
  | 'text_to_speech'
  | 'text_to_image'
  | 'image_editing'
  | 'coding'
  | 'image_analysis'
  | 'file_analysis'
  | 'web_search'
  | 'voice_input'
  | 'video_generation'
  | 'video_analysis'
  | 'ocr'
  | 'translation';

export interface Capability {
  id: CapabilityId;
  name: string;
  description: string;
  icon: string;
}

// --- Model Group Types ---
export interface ModelGroup {
  id: string;
  name: string;
  displayName: string;
  description: string;
  enabled: boolean;
  modelIds: string[];
  order: number;
  icon?: string;
}

// --- Feature Types ---
export interface Feature {
  id: string;
  name: string;
  displayName: string;
  description: string;
  icon: string;
  enabled: boolean;
  requiredCapabilities: CapabilityId[];
  modelGroupId?: string;
  settings: Record<string, any>;
  order: number;
}

// --- Rule Types ---
export interface Rule {
  id: string;
  name: string;
  scope: 'global' | 'feature' | 'model';
  targetId?: string;
  content: string;
  enabled: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

// --- Admin Types ---
export interface AdminState {
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AdminDashboardData {
  totalUsers: number;
  activeUsers: number;
  totalChats: number;
  totalMessages: number;
  aiRequests: number;
  modelUsage: Record<string, number>;
  featureUsage: Record<string, number>;
  dailyUsage: { date: string; count: number }[];
  recentUsers: User[];
  errors: number;
}

// --- API Response Types ---
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

// --- UI Types ---
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

export interface ThemeMode {
  mode: 'light' | 'dark';
}

// --- File Upload Types ---
export interface FileUploadConfig {
  allowedTypes: string[];
  maxSize: number;
  maxFiles: number;
}

export const FILE_UPLOAD_CONFIG: FileUploadConfig = {
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain', 'text/csv', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  maxSize: 10 * 1024 * 1024,
  maxFiles: 5,
};

// --- Default Capabilities ---
export const CAPABILITIES: Capability[] = [
  { id: 'text_to_text', name: 'Text to Text', description: 'Generate text responses', icon: 'MessageSquare' },
  { id: 'text_to_speech', name: 'Text to Speech', description: 'Convert text to audio', icon: 'Volume2' },
  { id: 'text_to_image', name: 'Text to Image', description: 'Generate images from text', icon: 'Image' },
  { id: 'image_editing', name: 'Image Editing', description: 'Edit and modify images', icon: 'Edit3' },
  { id: 'coding', name: 'Coding', description: 'Code generation and assistance', icon: 'Code' },
  { id: 'image_analysis', name: 'Image Analysis', description: 'Analyze and describe images', icon: 'Eye' },
  { id: 'file_analysis', name: 'File Analysis', description: 'Analyze uploaded files', icon: 'FileSearch' },
  { id: 'web_search', name: 'Web Search', description: 'Search the web', icon: 'Globe' },
  { id: 'voice_input', name: 'Voice Input', description: 'Speech to text', icon: 'Mic' },
  { id: 'video_generation', name: 'Video Generation', description: 'Generate videos', icon: 'Video' },
  { id: 'video_analysis', name: 'Video Analysis', description: 'Analyze video content', icon: 'Film' },
  { id: 'ocr', name: 'OCR', description: 'Optical character recognition', icon: 'ScanText' },
  { id: 'translation', name: 'Translation', description: 'Language translation', icon: 'Languages' },
];

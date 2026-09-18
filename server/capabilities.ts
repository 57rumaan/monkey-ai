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

export interface CapabilityDefinition {
  id: CapabilityType;
  label: string;
  description: string;
  icon: string;
  category: 'text' | 'image' | 'video' | 'audio' | 'document' | 'utility' | 'custom';
  requiresModel: boolean;
  supportedParameters: ParameterDefinition[];
}

export interface ParameterDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'file';
  required: boolean;
  description: string;
  default?: unknown;
}

export const CAPABILITY_REGISTRY: Record<CapabilityType, CapabilityDefinition> = {
  text_to_text: {
    id: 'text_to_text',
    label: 'Text to Text',
    description: 'General purpose text generation and conversation',
    icon: 'chat',
    category: 'text',
    requiresModel: true,
    supportedParameters: [
      { name: 'temperature', type: 'number', required: false, description: 'Creativity level (0-2)', default: 0.7 },
      { name: 'maxTokens', type: 'number', required: false, description: 'Maximum response length', default: 2048 },
      { name: 'systemPrompt', type: 'string', required: false, description: 'System instruction' },
    ],
  },
  coding: {
    id: 'coding',
    label: 'Coding',
    description: 'Code generation, explanation, debugging, and refactoring',
    icon: 'code',
    category: 'text',
    requiresModel: true,
    supportedParameters: [
      { name: 'language', type: 'string', required: false, description: 'Programming language' },
      { name: 'temperature', type: 'number', required: false, description: 'Creativity level', default: 0.3 },
      { name: 'maxTokens', type: 'number', required: false, description: 'Maximum response length', default: 4096 },
    ],
  },
  text_to_image: {
    id: 'text_to_image',
    label: 'Text to Image',
    description: 'Generate images from text descriptions',
    icon: 'image',
    category: 'image',
    requiresModel: true,
    supportedParameters: [
      { name: 'width', type: 'number', required: false, description: 'Image width', default: 1024 },
      { name: 'height', type: 'number', required: false, description: 'Image height', default: 1024 },
      { name: 'steps', type: 'number', required: false, description: 'Generation steps', default: 30 },
      { name: 'guidanceScale', type: 'number', required: false, description: 'Guidance scale', default: 7.5 },
      { name: 'seed', type: 'number', required: false, description: 'Random seed' },
    ],
  },
  image_to_text: {
    id: 'image_to_text',
    label: 'Image to Text (OCR)',
    description: 'Extract text from images',
    icon: 'scan-text',
    category: 'image',
    requiresModel: true,
    supportedParameters: [
      { name: 'language', type: 'string', required: false, description: 'OCR language', default: 'eng' },
    ],
  },
  image_editing: {
    id: 'image_editing',
    label: 'Image Editing',
    description: 'Edit and transform images',
    icon: 'edit',
    category: 'image',
    requiresModel: true,
    supportedParameters: [
      { name: 'prompt', type: 'string', required: true, description: 'Edit instruction' },
      { name: 'strength', type: 'number', required: false, description: 'Edit strength', default: 0.8 },
    ],
  },
  image_analysis: {
    id: 'image_analysis',
    label: 'Image Analysis',
    description: 'Analyze and describe image content',
    icon: 'eye',
    category: 'image',
    requiresModel: true,
    supportedParameters: [
      { name: 'detail', type: 'string', required: false, description: 'Analysis detail level', default: 'high' },
    ],
  },
  image_vision: {
    id: 'image_vision',
    label: 'Image Vision',
    description: 'Advanced visual understanding and reasoning',
    icon: 'eye',
    category: 'image',
    requiresModel: true,
    supportedParameters: [
      { name: 'task', type: 'string', required: false, description: 'Vision task type' },
    ],
  },
  video_generation: {
    id: 'video_generation',
    label: 'Video Generation',
    description: 'Generate videos from text or images',
    icon: 'video',
    category: 'video',
    requiresModel: true,
    supportedParameters: [
      { name: 'duration', type: 'number', required: false, description: 'Video duration in seconds', default: 5 },
      { name: 'fps', type: 'number', required: false, description: 'Frames per second', default: 24 },
      { name: 'width', type: 'number', required: false, description: 'Video width', default: 512 },
      { name: 'height', type: 'number', required: false, description: 'Video height', default: 512 },
    ],
  },
  video_analysis: {
    id: 'video_analysis',
    label: 'Video Analysis',
    description: 'Analyze video content and extract information',
    icon: 'video',
    category: 'video',
    requiresModel: true,
    supportedParameters: [
      { name: 'extractFrames', type: 'boolean', required: false, description: 'Extract key frames', default: false },
    ],
  },
  video_vision: {
    id: 'video_vision',
    label: 'Video Vision',
    description: 'Advanced video understanding and reasoning',
    icon: 'video',
    category: 'video',
    requiresModel: true,
    supportedParameters: [
      { name: 'task', type: 'string', required: false, description: 'Vision task type' },
    ],
  },
  text_to_voice: {
    id: 'text_to_voice',
    label: 'Text to Voice',
    description: 'Convert text to natural speech',
    icon: 'volume-2',
    category: 'audio',
    requiresModel: true,
    supportedParameters: [
      { name: 'voice', type: 'string', required: false, description: 'Voice ID' },
      { name: 'speed', type: 'number', required: false, description: 'Speech speed', default: 1.0 },
      { name: 'format', type: 'string', required: false, description: 'Audio format', default: 'mp3' },
    ],
  },
  voice_to_text: {
    id: 'voice_to_text',
    label: 'Voice to Text',
    description: 'Transcribe audio to text',
    icon: 'mic',
    category: 'audio',
    requiresModel: true,
    supportedParameters: [
      { name: 'language', type: 'string', required: false, description: 'Audio language', default: 'en' },
      { name: 'diarization', type: 'boolean', required: false, description: 'Speaker diarization', default: false },
    ],
  },
  document_analysis: {
    id: 'document_analysis',
    label: 'Document Analysis',
    description: 'Analyze and extract information from documents',
    icon: 'file-text',
    category: 'document',
    requiresModel: true,
    supportedParameters: [
      { name: 'extractText', type: 'boolean', required: false, description: 'Extract full text', default: true },
      { name: 'extractTables', type: 'boolean', required: false, description: 'Extract tables', default: false },
      { name: 'summarize', type: 'boolean', required: false, description: 'Generate summary', default: false },
    ],
  },
  file_analysis: {
    id: 'file_analysis',
    label: 'File Analysis',
    description: 'Analyze various file types',
    icon: 'file',
    category: 'document',
    requiresModel: true,
    supportedParameters: [
      { name: 'analysisType', type: 'string', required: false, description: 'Type of analysis' },
    ],
  },
  calculator: {
    id: 'calculator',
    label: 'Calculator',
    description: 'Mathematical calculations and expressions',
    icon: 'calculator',
    category: 'utility',
    requiresModel: false,
    supportedParameters: [
      { name: 'expression', type: 'string', required: true, description: 'Mathematical expression' },
    ],
  },
  datetime: {
    id: 'datetime',
    label: 'Date/Time',
    description: 'Date and time operations',
    icon: 'calendar',
    category: 'utility',
    requiresModel: false,
    supportedParameters: [
      { name: 'operation', type: 'string', required: true, description: 'Operation type' },
      { name: 'timezone', type: 'string', required: false, description: 'Timezone', default: 'UTC' },
    ],
  },
  custom_feature: {
    id: 'custom_feature',
    label: 'Custom Feature',
    description: 'Custom AI capability',
    icon: 'sparkles',
    category: 'custom',
    requiresModel: true,
    supportedParameters: [],
  },
  custom_action: {
    id: 'custom_action',
    label: 'Custom Action',
    description: 'Custom action or workflow',
    icon: 'zap',
    category: 'custom',
    requiresModel: false,
    supportedParameters: [],
  },
};

export const CAPABILITY_CATEGORIES = [
  { id: 'text', label: 'Text', icon: 'file-text' },
  { id: 'image', label: 'Image', icon: 'image' },
  { id: 'video', label: 'Video', icon: 'video' },
  { id: 'audio', label: 'Audio', icon: 'music' },
  { id: 'document', label: 'Document', icon: 'file-text' },
  { id: 'utility', label: 'Utility', icon: 'wrench' },
  { id: 'custom', label: 'Custom', icon: 'sparkles' },
] as const;

export function getCapabilityDefinition(type: CapabilityType): CapabilityDefinition {
  return CAPABILITY_REGISTRY[type];
}

export function getCapabilitiesByCategory(category: CapabilityDefinition['category']): CapabilityDefinition[] {
  return Object.values(CAPABILITY_REGISTRY).filter(c => c.category === category);
}

export function getAllCapabilities(): CapabilityDefinition[] {
  return Object.values(CAPABILITY_REGISTRY);
}

export function capabilityRequiresModel(type: CapabilityType): boolean {
  return CAPABILITY_REGISTRY[type].requiresModel;
}
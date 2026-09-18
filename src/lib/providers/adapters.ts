import type { CapabilityType, RawModel, Message } from '@/types';

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  stream?: boolean;
}

export interface ImageOptions {
  width?: number;
  height?: number;
  steps?: number;
  guidanceScale?: number;
  seed?: number;
  strength?: number;
}

export interface AnalysisOptions {
  detail?: 'low' | 'high' | 'auto';
  task?: string;
}

export interface TranscribeOptions {
  language?: string;
  diarization?: boolean;
}

export interface TTSOptions {
  voice?: string;
  speed?: number;
  format?: string;
}

export interface ImageResult {
  url: string;
  revisedPrompt?: string;
  seed?: number;
}

export interface AudioResult {
  url: string;
  duration?: number;
}

export type { Message, RawModel, CapabilityType };

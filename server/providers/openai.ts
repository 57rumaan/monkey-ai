import { BaseProviderAdapter } from './adapters.js';
import type { ProviderAdapter, ChatOptions, ImageOptions, ImageResult, AnalysisOptions, TranscribeOptions, TTSOptions, AudioResult, Message, CapabilityType, UsageData } from './adapters.js';
import type { RawModel } from '../types.js';

const OPENAI_API_BASE = 'https://api.openai.com/v1';

interface ChatCompletionResponse {
  choices: { message: { content: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

interface ImageGenerationResponse {
  data: { url: string; revised_prompt?: string }[];
}

interface TranscriptionResponse {
  text: string;
}

interface ErrorResponse {
  error?: { message?: string };
}

function getOpenAIHeaders(apiKey: string) {
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

function getOpenAIKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OpenAI API key not configured');
  return key;
}

export class OpenAIAdapter extends BaseProviderAdapter implements ProviderAdapter {
  readonly providerId = 'openai';
  readonly supportedCapabilities = [
    'text_to_text',
    'coding',
    'text_to_image',
    'image_analysis',
    'image_vision',
    'text_to_voice',
    'voice_to_text',
  ] as CapabilityType[];

  protected async request<T>(url: string, options: RequestInit): Promise<T> {
    const apiKey = getOpenAIKey();
    return super.request<T>(url, options, apiKey, getOpenAIHeaders(apiKey));
  }

  async chat(messages: Message[], model: RawModel, options?: ChatOptions): Promise<string> {
    const response = await this.request<ChatCompletionResponse>(`${OPENAI_API_BASE}/chat/completions`, {
      method: 'POST',
      body: JSON.stringify({
        model: model.id,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2048,
        stream: false,
      }),
    });

    if (response.usage) {
      this.lastUsage = {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      };
    }

    return response.choices[0]?.message?.content || '';
  }

  async *chatStream(messages: Message[], model: RawModel, options?: ChatOptions): AsyncIterable<string> {
    const apiKey = getOpenAIKey();
    const response = await this.streamRequest(`${OPENAI_API_BASE}/chat/completions`, {
      method: 'POST',
      body: JSON.stringify({
        model: model.id,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2048,
        stream: true,
        stream_options: { include_usage: true },
      }),
    }, apiKey, getOpenAIHeaders(apiKey));

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') return;
          try {
            const parsed = JSON.parse(data) as { choices?: { delta?: { content?: string } }[]; usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } };
            if (parsed.usage) {
              this.lastUsage = {
                promptTokens: parsed.usage.prompt_tokens,
                completionTokens: parsed.usage.completion_tokens,
                totalTokens: parsed.usage.total_tokens,
              };
            }
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch { /* skip malformed chunks */ }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async generateImage(prompt: string, model: RawModel, options?: ImageOptions): Promise<ImageResult> {
    const response = await this.request<ImageGenerationResponse>(`${OPENAI_API_BASE}/images/generations`, {
      method: 'POST',
      body: JSON.stringify({
        model: model.id,
        prompt,
        n: 1,
        size: `${options?.width ?? 1024}x${options?.height ?? 1024}`,
        quality: 'standard',
        response_format: 'url',
      }),
    });

    return {
      url: response.data[0]?.url || '',
      revisedPrompt: response.data[0]?.revised_prompt,
    };
  }

  async analyzeImage(image: string, model: RawModel, options?: AnalysisOptions): Promise<string> {
    const response = await this.request<ChatCompletionResponse>(`${OPENAI_API_BASE}/chat/completions`, {
      method: 'POST',
      body: JSON.stringify({
        model: model.id,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: options?.task || 'Describe this image in detail.' },
              { type: 'image_url', image_url: { url: image, detail: options?.detail ?? 'high' } },
            ],
          },
        ],
        max_tokens: 1000,
      }),
    });

    return response.choices[0]?.message?.content || '';
  }

  async transcribeAudio(audio: string, model: RawModel, options?: TranscribeOptions): Promise<string> {
    const formData = new FormData();
    formData.append('file', audio);
    formData.append('model', model.id);
    if (options?.language) formData.append('language', options.language);

    const apiKey = getOpenAIKey();
    const response = await fetch(`${OPENAI_API_BASE}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } })) as ErrorResponse;
      throw new Error(error.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as TranscriptionResponse;
    return data.text;
  }

  async textToSpeech(text: string, model: RawModel, options?: TTSOptions): Promise<AudioResult> {
    const response = await fetch(`${OPENAI_API_BASE}/audio/speech`, {
      method: 'POST',
      headers: getOpenAIHeaders(getOpenAIKey()),
      body: JSON.stringify({
        model: model.id,
        input: text,
        voice: options?.voice ?? 'alloy',
        speed: options?.speed ?? 1.0,
        response_format: options?.format ?? 'mp3',
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } })) as ErrorResponse;
      throw new Error(error.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    return { url };
  }

  async editImage(image: string, prompt: string, model: RawModel, options?: ImageOptions): Promise<ImageResult> {
    throw new Error('Image editing not supported by OpenAI');
  }
}

export const openAIAdapter = new OpenAIAdapter();

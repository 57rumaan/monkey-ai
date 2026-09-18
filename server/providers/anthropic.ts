import { BaseProviderAdapter } from './adapters';
import type { ProviderAdapter, ChatOptions, ImageOptions, ImageResult, AnalysisOptions, TranscribeOptions, TTSOptions, AudioResult, Message, CapabilityType, UsageData } from './adapters';
import type { RawModel } from '../types';

const ANTHROPIC_API_BASE = 'https://api.anthropic.com/v1';

interface AnthropicMessageResponse {
  content: { text: string }[];
  usage?: { input_tokens?: number; output_tokens?: number };
}

function getAnthropicHeaders(apiKey: string) {
  return {
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'Content-Type': 'application/json',
  };
}

function getAnthropicKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('Anthropic API key not configured');
  return key;
}

export class AnthropicAdapter extends BaseProviderAdapter implements ProviderAdapter {
  readonly providerId = 'anthropic';
  readonly supportedCapabilities = [
    'text_to_text',
    'coding',
    'image_analysis',
    'image_vision',
    'document_analysis',
  ] as CapabilityType[];

  protected async request<T>(url: string, options: RequestInit): Promise<T> {
    const apiKey = getAnthropicKey();
    return super.request<T>(url, options, apiKey, getAnthropicHeaders(apiKey));
  }

  async chat(messages: Message[], model: RawModel, options?: ChatOptions): Promise<string> {
    const systemPrompt = options?.systemPrompt || messages.find(m => m.role === 'system')?.content;
    const userMessages = messages.filter(m => m.role !== 'system');

    const response = await this.request<AnthropicMessageResponse>(`${ANTHROPIC_API_BASE}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        model: model.id,
        max_tokens: options?.maxTokens ?? 4096,
        temperature: options?.temperature ?? 0.7,
        system: systemPrompt,
        messages: userMessages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
      }),
    });

    if (response.usage) {
      this.lastUsage = {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: (response.usage.input_tokens || 0) + (response.usage.output_tokens || 0),
      };
    }

    return response.content[0]?.text || '';
  }

  async *chatStream(messages: Message[], model: RawModel, options?: ChatOptions): AsyncIterable<string> {
    const apiKey = getAnthropicKey();
    const systemPrompt = options?.systemPrompt || messages.find(m => m.role === 'system')?.content;
    const userMessages = messages.filter(m => m.role !== 'system');

    const response = await this.streamRequest(`${ANTHROPIC_API_BASE}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        model: model.id,
        max_tokens: options?.maxTokens ?? 4096,
        temperature: options?.temperature ?? 0.7,
        system: systemPrompt,
        messages: userMessages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
        stream: true,
      }),
    }, apiKey, getAnthropicHeaders(apiKey));

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
          try {
            const parsed = JSON.parse(trimmed.slice(6)) as { type?: string; delta?: { text?: string }; usage?: { input_tokens?: number; output_tokens?: number } };
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              yield parsed.delta.text;
            }
            if (parsed.type === 'message_delta' && parsed.usage) {
              this.lastUsage = {
                promptTokens: parsed.usage.input_tokens,
                completionTokens: parsed.usage.output_tokens,
                totalTokens: (parsed.usage.input_tokens || 0) + (parsed.usage.output_tokens || 0),
              };
            }
          } catch { /* skip malformed chunks */ }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async analyzeImage(image: string, model: RawModel, options?: AnalysisOptions): Promise<string> {
    const base64 = image.replace(/^data:image\/[a-z]+;base64,/, '');
    const response = await this.request<AnthropicMessageResponse>(`${ANTHROPIC_API_BASE}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        model: model.id,
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: options?.task || 'Describe this image in detail.' },
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
            ],
          },
        ],
      }),
    });

    return response.content[0]?.text || '';
  }

  async generateImage(prompt: string, model: RawModel, options?: ImageOptions): Promise<ImageResult> {
    throw new Error('Image generation not supported by Anthropic');
  }

  async editImage(image: string, prompt: string, model: RawModel, options?: ImageOptions): Promise<ImageResult> {
    throw new Error('Image editing not supported by Anthropic');
  }

  async transcribeAudio(audio: string, model: RawModel, options?: TranscribeOptions): Promise<string> {
    throw new Error('Audio transcription not supported by Anthropic');
  }

  async textToSpeech(text: string, model: RawModel, options?: TTSOptions): Promise<AudioResult> {
    throw new Error('Text-to-speech not supported by Anthropic');
  }
}

export const anthropicAdapter = new AnthropicAdapter();

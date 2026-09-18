import { BaseProviderAdapter } from './adapters.js';
import type { ProviderAdapter, ChatOptions, ImageOptions, ImageResult, AnalysisOptions, TranscribeOptions, TTSOptions, AudioResult, Message, CapabilityType } from './adapters.js';
import type { RawModel } from '../types.js';

const GOOGLE_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

interface GoogleGenerateResponse {
  candidates: { content: { parts: { text?: string; inlineData?: { mimeType: string; data: string } }[] } }[];
}

function getGoogleKey(): string {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) throw new Error('Google API key not configured');
  return key;
}

export class GoogleAdapter extends BaseProviderAdapter implements ProviderAdapter {
  readonly providerId = 'google';
  readonly supportedCapabilities = [
    'text_to_text',
    'coding',
    'text_to_image',
    'image_analysis',
    'image_vision',
    'text_to_voice',
    'voice_to_text',
    'video_generation',
    'video_analysis',
  ] as CapabilityType[];

  protected async request<T>(url: string, options: RequestInit): Promise<T> {
    const apiKey = getGoogleKey();
    return super.request<T>(url, options, apiKey, { 'Content-Type': 'application/json' });
  }

  async chat(messages: Message[], model: RawModel, options?: ChatOptions): Promise<string> {
    const response = await this.request<GoogleGenerateResponse>(`${GOOGLE_API_BASE}/models/${model.id}:generateContent?key=${getGoogleKey()}`, {
      method: 'POST',
      body: JSON.stringify({
        contents: messages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens: options?.maxTokens ?? 2048,
          topP: 0.9,
        },
      }),
    });

    return response.candidates[0]?.content?.parts[0]?.text || '';
  }

  async *chatStream(messages: Message[], model: RawModel, options?: ChatOptions): AsyncIterable<string> {
    const apiKey = getGoogleKey();
    const response = await this.streamRequest(`${GOOGLE_API_BASE}/models/${model.id}:streamGenerateContent?alt=sse&key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: messages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens: options?.maxTokens ?? 2048,
          topP: 0.9,
        },
      }),
    }, apiKey, { 'Content-Type': 'application/json' });

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
            const parsed = JSON.parse(trimmed.slice(6)) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) yield text;
          } catch { /* skip malformed chunks */ }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async generateImage(prompt: string, model: RawModel, options?: ImageOptions): Promise<ImageResult> {
    const response = await this.request<GoogleGenerateResponse>(`${GOOGLE_API_BASE}/models/${model.id}:generateContent?key=${getGoogleKey()}`, {
      method: 'POST',
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          topK: 32,
          topP: 1,
          maxOutputTokens: 2048,
        },
      }),
    });

    const inlineData = response.candidates[0]?.content?.parts[0]?.inlineData;
    if (inlineData?.data) {
      const url = `data:${inlineData.mimeType};base64,${inlineData.data}`;
      return { url };
    }
    throw new Error('No image generated');
  }

  async analyzeImage(image: string, model: RawModel, options?: AnalysisOptions): Promise<string> {
    const base64 = image.replace(/^data:image\/[a-z]+;base64,/, '');
    const response = await this.request<GoogleGenerateResponse>(`${GOOGLE_API_BASE}/models/${model.id}:generateContent?key=${getGoogleKey()}`, {
      method: 'POST',
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: options?.task || 'Describe this image in detail.' },
            { inlineData: { mimeType: 'image/jpeg', data: base64 } },
          ],
        }],
        generationConfig: { maxOutputTokens: 1000 },
      }),
    });

    return response.candidates[0]?.content?.parts[0]?.text || '';
  }

  async transcribeAudio(audio: string, model: RawModel, options?: TranscribeOptions): Promise<string> {
    throw new Error('Audio transcription not implemented for Google');
  }

  async textToSpeech(text: string, model: RawModel, options?: TTSOptions): Promise<AudioResult> {
    throw new Error('Text-to-speech not implemented for Google');
  }

  async editImage(image: string, prompt: string, model: RawModel, options?: ImageOptions): Promise<ImageResult> {
    throw new Error('Image editing not implemented for Google');
  }
}

export const googleAdapter = new GoogleAdapter();

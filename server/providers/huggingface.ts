import { BaseProviderAdapter } from './adapters';
import type { ProviderAdapter, ChatOptions, ImageOptions, ImageResult, AnalysisOptions, TranscribeOptions, TTSOptions, AudioResult, Message, CapabilityType } from './adapters';
import type { RawModel } from '../types';

const HF_API_BASE = 'https://api-inference.huggingface.co/models';

interface HFTextResponse {
  generated_text?: string;
  text?: string;
  answer?: string;
}

function getHFHeaders(apiKey: string) {
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

function getHFKey(): string {
  const key = process.env.HUGGINGFACE_API_KEY;
  if (!key) throw new Error('Hugging Face API key not configured');
  return key;
}

export class HuggingFaceAdapter extends BaseProviderAdapter implements ProviderAdapter {
  readonly providerId = 'huggingface';
  readonly supportedCapabilities = [
    'text_to_text',
    'coding',
    'text_to_image',
    'image_to_text',
    'image_editing',
    'image_analysis',
    'image_vision',
    'text_to_voice',
    'voice_to_text',
    'document_analysis',
  ] as CapabilityType[];

  protected async request<T>(url: string, options: RequestInit): Promise<T> {
    const apiKey = getHFKey();
    return super.request<T>(url, options, apiKey, getHFHeaders(apiKey));
  }

  private formatMessages(messages: Message[]): string {
    return messages
      .map(m => `${m.role === 'user' ? 'Human' : 'Assistant'}: ${m.content}`)
      .join('\n\n') + '\n\nAssistant:';
  }

  async chat(messages: Message[], model: RawModel, options?: ChatOptions): Promise<string> {
    const prompt = this.formatMessages(messages);
    const response = await this.request<HFTextResponse | HFTextResponse[]>(`${HF_API_BASE}/${model.id}`, {
      method: 'POST',
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          temperature: options?.temperature ?? 0.7,
          max_new_tokens: options?.maxTokens ?? 2048,
          top_p: 0.9,
          return_full_text: false,
        },
      }),
    });

    if (Array.isArray(response)) {
      return response[0]?.generated_text || '';
    }
    return response.generated_text || '';
  }

  async *chatStream(messages: Message[], model: RawModel, options?: ChatOptions): AsyncIterable<string> {
    // HuggingFace Inference API does not support streaming for text generation.
    // The full response is yielded as a single chunk.
    const response = await this.chat(messages, model, options);
    yield response;
  }

  async generateImage(prompt: string, model: RawModel, options?: ImageOptions): Promise<ImageResult> {
    const response = await fetch(`${HF_API_BASE}/${model.id}`, {
      method: 'POST',
      headers: getHFHeaders(getHFKey()),
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          width: options?.width ?? 1024,
          height: options?.height ?? 1024,
          num_inference_steps: options?.steps ?? 30,
          guidance_scale: options?.guidanceScale ?? 7.5,
          seed: options?.seed,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error((error as { error?: { message?: string } }).error?.message || `HTTP ${response.status}`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    return { url };
  }

  async editImage(image: string, prompt: string, model: RawModel, options?: ImageOptions): Promise<ImageResult> {
    const response = await fetch(`${HF_API_BASE}/${model.id}`, {
      method: 'POST',
      headers: getHFHeaders(getHFKey()),
      body: JSON.stringify({
        inputs: { image, prompt },
        parameters: {
          strength: options?.strength ?? 0.8,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error((error as { error?: { message?: string } }).error?.message || `HTTP ${response.status}`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    return { url };
  }

  async analyzeImage(image: string, model: RawModel, options?: AnalysisOptions): Promise<string> {
    const response = await this.request<HFTextResponse>(`${HF_API_BASE}/${model.id}`, {
      method: 'POST',
      body: JSON.stringify({
        inputs: { image, question: options?.task || 'Describe this image in detail.' },
      }),
    });

    if (response && typeof response === 'object' && 'answer' in response && typeof response.answer === 'string') {
      return response.answer;
    }
    return JSON.stringify(response);
  }

  async transcribeAudio(audio: string, model: RawModel, options?: TranscribeOptions): Promise<string> {
    const response = await this.request<HFTextResponse>(`${HF_API_BASE}/${model.id}`, {
      method: 'POST',
      body: JSON.stringify({
        inputs: audio,
        parameters: {
          language: options?.language ?? 'en',
        },
      }),
    });

    if (response && typeof response === 'object' && 'text' in response && typeof response.text === 'string') {
      return response.text;
    }
    return JSON.stringify(response);
  }

  async textToSpeech(text: string, model: RawModel, options?: TTSOptions): Promise<AudioResult> {
    const response = await fetch(`${HF_API_BASE}/${model.id}`, {
      method: 'POST',
      headers: getHFHeaders(getHFKey()),
      body: JSON.stringify({
        inputs: text,
        parameters: {
          speed: options?.speed ?? 1.0,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error((error as { error?: { message?: string } }).error?.message || `HTTP ${response.status}`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    return { url };
  }
}

export const huggingFaceAdapter = new HuggingFaceAdapter();

import { BaseProviderAdapter } from './adapters.js';
import type { ProviderAdapter, ChatOptions, ImageOptions, ImageResult, AudioResult, Message } from './adapters.js';
import type { RawModel } from '../types.js';

const REPLICATE_API_BASE = 'https://api.replicate.com/v1';

function getReplicateKey(): string {
  const key = process.env.REPLICATE_API_KEY;
  if (!key) throw new Error('Replicate API key not configured');
  return key;
}

function getReplicateHeaders(): Record<string, string> {
  return {
    'Authorization': `Bearer ${getReplicateKey()}`,
    'Content-Type': 'application/json',
  };
}

export class ReplicateAdapter extends BaseProviderAdapter implements ProviderAdapter {
  readonly providerId = 'replicate';
  readonly supportedCapabilities = [
    'text_to_text',
    'coding',
    'text_to_image',
    'image_editing',
    'video_generation',
    'text_to_voice',
    'voice_to_text',
  ] as const;

  protected override async request<T>(url: string, options: RequestInit): Promise<T> {
    const apiKey = getReplicateKey();
    return super.request<T>(url, options, apiKey, getReplicateHeaders());
  }

  async chat(messages: Message[], model: RawModel, options?: ChatOptions): Promise<string> {
    const prediction = await this.createPrediction(model.id, {
      prompt: this.formatMessages(messages),
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2048,
    });

    return this.waitForPrediction(prediction.id);
  }

  async *chatStream(messages: Message[], model: RawModel, options?: ChatOptions): AsyncIterable<string> {
    // Replicate uses a poll-based prediction API, not streaming.
    // The full response is yielded as a single chunk.
    const response = await this.chat(messages, model, options);
    yield response;
  }

  async generateImage(prompt: string, model: RawModel, options?: ImageOptions): Promise<ImageResult> {
    const prediction = await this.createPrediction(model.id, {
      prompt,
      width: options?.width ?? 1024,
      height: options?.height ?? 1024,
      num_inference_steps: options?.steps ?? 30,
      guidance_scale: options?.guidanceScale ?? 7.5,
      seed: options?.seed,
    });

    const result = await this.waitForPrediction(prediction.id);
    return { url: result };
  }

  async editImage(image: string, prompt: string, model: RawModel, options?: ImageOptions): Promise<ImageResult> {
    const prediction = await this.createPrediction(model.id, {
      image,
      prompt,
      strength: options?.strength ?? 0.8,
    });

    const result = await this.waitForPrediction(prediction.id);
    return { url: result };
  }

  async analyzeImage(): Promise<string> {
    throw new Error('Image analysis not implemented for Replicate');
  }

  async transcribeAudio(): Promise<string> {
    throw new Error('Audio transcription not implemented for Replicate');
  }

  async textToSpeech(): Promise<AudioResult> {
    throw new Error('Text-to-speech not implemented for Replicate');
  }

  private async createPrediction(modelId: string, input: Record<string, unknown>, stream = false): Promise<{ id: string }> {
    return this.request<{ id: string }>(`${REPLICATE_API_BASE}/predictions`, {
      method: 'POST',
      body: JSON.stringify({
        version: modelId,
        input,
        stream,
      }),
    });
  }

  private async waitForPrediction(id: string): Promise<string> {
    while (true) {
      const prediction = await this.request<{ status: string; output?: string | string[]; error?: string }>(
        `${REPLICATE_API_BASE}/predictions/${id}`,
        { method: 'GET' }
      );

      if (prediction.status === 'succeeded') {
        return Array.isArray(prediction.output) ? prediction.output.join('') : (prediction.output || '');
      }
      if (prediction.status === 'failed') {
        throw new Error(prediction.error || 'Prediction failed');
      }
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  private formatMessages(messages: Message[]): string {
    return messages
      .map(m => `${m.role === 'user' ? 'Human' : 'Assistant'}: ${m.content}`)
      .join('\n\n') + '\n\nAssistant:';
  }
}

export const replicateAdapter = new ReplicateAdapter();

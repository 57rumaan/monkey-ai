import { getAdapter, type ProviderAdapter } from '../providers/adapters.js';
import { storage } from '../storage.js';
import { getUploadPath, downloadFile } from '../routes/upload.js';
import { extractTextFromFile, isTextFile } from '../lib/documentExtractor.js';
import { readFile } from 'fs/promises';
import { extname } from 'path';
import type { Bundle, BundleCapability, RawModel, Provider, CapabilityType, Message, Attachment } from '../types.js';

function resolveAttachmentPath(attachment: Attachment): string | null {
  const url = attachment.url;
  const match = url.match(/^\/api\/upload\/files\/([^/]+)\/([^/]+)$/);
  if (!match) return null;
  const [, userId, filename] = match;
  return getUploadPath(userId, filename);
}

async function resolveAttachmentDataUrl(attachment: Attachment): Promise<string> {
  if (attachment.url.startsWith('data:')) return attachment.url;

  const match = attachment.url.match(/^\/api\/upload\/files\/([^/]+)\/([^/]+)$/);
  if (!match) {
    throw new Error('Cannot access attachment file');
  }
  const [, userId, filename] = match;

  const buffer = await downloadFile(userId, filename);
  const base64 = buffer.toString('base64');
  return `data:${attachment.mimeType};base64,${base64}`;
}

async function fileToBase64(filePath: string): Promise<string> {
  const { stat } = await import('fs/promises');
  const fileStats = await stat(filePath);
  if (fileStats.size > 20 * 1024 * 1024) {
    throw new Error('File too large for processing (max 20MB)');
  }
  const buffer = await readFile(filePath);
  const ext = extname(filePath).toLowerCase();
  const mimeMap: Record<string, string> = {
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.gif': 'image/gif', '.webp': 'image/webp', '.pdf': 'application/pdf',
  };
  const mime = mimeMap[ext] || 'application/octet-stream';
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

export interface RouteResult {
  provider: Provider;
  rawModel: RawModel;
  adapter: ProviderAdapter;
  bundleCapability: BundleCapability;
}

export interface ExecutionContext {
  bundleId: string;
  capability: CapabilityType;
  messages: Message[];
  attachments?: Attachment[];
  options?: Record<string, unknown>;
  userId: string;
}

export class Router {
  async resolveRoute(context: ExecutionContext): Promise<RouteResult> {
    const bundle = await storage.get<Bundle>('bundles', context.bundleId);
    if (!bundle) {
      throw new Error(`Bundle not found: ${context.bundleId}`);
    }
    if (!bundle.enabled) {
      throw new Error(`Bundle is disabled: ${bundle.name}`);
    }

    const bundleCapability = bundle.capabilities.find(
      c => c.capabilityId === context.capability && c.enabled
    );
    if (!bundleCapability) {
      throw new Error(`Capability ${context.capability} not available in bundle ${bundle.name}`);
    }

    const provider = await storage.get<Provider>('providers', bundleCapability.providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${bundleCapability.providerId}`);
    }
    if (provider.status !== 'active') {
      throw new Error(`Provider is inactive: ${provider.label}`);
    }

    const rawModel = provider.models.find(
      m => m.id === bundleCapability.rawModelId && m.enabled
    );
    if (!rawModel) {
      throw new Error(`Raw model not found or disabled: ${bundleCapability.rawModelId}`);
    }

    if (!rawModel.capabilities.includes(context.capability)) {
      throw new Error(`Model ${rawModel.customName} does not support capability ${context.capability}`);
    }

    const adapter = getAdapter(bundleCapability.providerId);
    if (!adapter || !adapter.supportedCapabilities.includes(context.capability)) {
      throw new Error(`No adapter found for provider ${provider.label} and capability ${context.capability}`);
    }

    return {
      provider,
      rawModel,
      adapter,
      bundleCapability,
    };
  }

  async executeRoute(context: ExecutionContext): Promise<string> {
    const route = await this.resolveRoute(context);

    const { adapter, rawModel, bundleCapability } = route;

    const rules = rawModel.rules;
    const options = {
      temperature: rules.temperature ?? 0.7,
      maxTokens: rules.maxTokens ?? 2048,
      systemPrompt: rules.systemPrompt,
      ...context.options,
    };

    try {
      switch (context.capability) {
        case 'text_to_text':
        case 'coding':
          return await this.executeChat(adapter, context.messages, rawModel, options);

        case 'text_to_image':
          return await this.executeImageGeneration(adapter, context.messages, rawModel, options);

        case 'image_to_text':
        case 'image_analysis':
        case 'image_vision':
          return await this.executeImageAnalysis(adapter, context.messages, context.attachments, rawModel, options);

        case 'image_editing':
          return await this.executeImageEditing(adapter, context.messages, context.attachments, rawModel, options);

        case 'text_to_voice':
          return await this.executeTextToSpeech(adapter, context.messages, rawModel, options);

        case 'voice_to_text':
          return await this.executeVoiceToText(adapter, context.attachments, rawModel, options);

        case 'calculator':
          return await this.executeCalculator(adapter, context.messages);

        case 'datetime':
          return await this.executeDateTime(adapter, context.messages);

        case 'document_analysis':
        case 'file_analysis':
          return await this.executeDocumentAnalysis(adapter, context.attachments, rawModel, options);

        case 'video_generation':
        case 'video_analysis':
        case 'video_vision':
          return await this.executeVideo(adapter, context.messages, context.attachments, rawModel, options);

        case 'custom_feature':
          return await this.executeCustomFeature(adapter, context.messages, rawModel, options);

        case 'custom_action':
          return await this.executeCustomAction(adapter, context.messages, bundleCapability, options);

        default:
          throw new Error(`Unsupported capability: ${context.capability}`);
      }
    } catch (error) {
      console.error(`Route execution failed for ${context.capability}:`, error);
      throw new Error(`Failed to execute ${context.capability}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async executeChat(
    adapter: ProviderAdapter,
    messages: Message[],
    model: RawModel,
    options: Record<string, unknown>
  ): Promise<string> {
    if ('chatStream' in adapter && typeof adapter.chatStream === 'function') {
      let fullResponse = '';
      for await (const chunk of adapter.chatStream(messages, model, options)) {
        fullResponse += chunk;
      }
      return fullResponse;
    }
    return adapter.chat(messages, model, options);
  }

  private async executeImageGeneration(
    adapter: ProviderAdapter,
    messages: Message[],
    model: RawModel,
    options: Record<string, unknown>
  ): Promise<string> {
    if (!adapter.generateImage) {
      throw new Error(`Provider ${adapter.providerId} does not support image generation`);
    }
    const prompt = messages[messages.length - 1]?.content || '';
    const result = await adapter.generateImage(prompt, model, options);
    return `![Generated Image](${result.url})${result.revisedPrompt ? `\n\n*Revised prompt: ${result.revisedPrompt}*` : ''}`;
  }

  private async executeImageAnalysis(
    adapter: ProviderAdapter,
    messages: Message[],
    attachments: Attachment[] | undefined,
    model: RawModel,
    options: Record<string, unknown>
  ): Promise<string> {
    if (!adapter.analyzeImage) {
      throw new Error(`Provider ${adapter.providerId} does not support image analysis`);
    }
    const imageAttachment = attachments?.find(a => a.type === 'image');
    if (!imageAttachment) {
      throw new Error('No image attachment provided for image analysis');
    }

    const imageDataUrl = await resolveAttachmentDataUrl(imageAttachment);
    const task = messages[messages.length - 1]?.content;
    return adapter.analyzeImage(imageDataUrl, model, { task, ...options });
  }

  private async executeImageEditing(
    adapter: ProviderAdapter,
    messages: Message[],
    attachments: Attachment[] | undefined,
    model: RawModel,
    options: Record<string, unknown>
  ): Promise<string> {
    if (!adapter.editImage) {
      throw new Error(`Provider ${adapter.providerId} does not support image editing`);
    }
    const imageAttachment = attachments?.find(a => a.type === 'image');
    if (!imageAttachment) {
      throw new Error('No image attachment provided for image editing');
    }

    const imageDataUrl = await resolveAttachmentDataUrl(imageAttachment);
    const prompt = messages[messages.length - 1]?.content || '';
    const result = await adapter.editImage(imageDataUrl, prompt, model, options);
    return `![Edited Image](${result.url})`;
  }

  private async executeTextToSpeech(
    adapter: ProviderAdapter,
    messages: Message[],
    model: RawModel,
    options: Record<string, unknown>
  ): Promise<string> {
    if (!adapter.textToSpeech) {
      throw new Error(`Provider ${adapter.providerId} does not support text-to-speech`);
    }
    const text = messages[messages.length - 1]?.content || '';
    const result = await adapter.textToSpeech(text, model, options);
    return `[Audio](${result.url})`;
  }

  private async executeVoiceToText(
    adapter: ProviderAdapter,
    attachments: Attachment[] | undefined,
    model: RawModel,
    options: Record<string, unknown>
  ): Promise<string> {
    if (!adapter.transcribeAudio) {
      throw new Error(`Provider ${adapter.providerId} does not support audio transcription`);
    }
    const audioAttachment = attachments?.find(a => a.type === 'audio');
    if (!audioAttachment) {
      throw new Error('No audio attachment provided for transcription');
    }

    const audioDataUrl = await resolveAttachmentDataUrl(audioAttachment);
    return adapter.transcribeAudio(audioDataUrl, model, options);
  }

  private async executeCalculator(
    adapter: ProviderAdapter,
    messages: Message[]
  ): Promise<string> {
    const expression = messages[messages.length - 1]?.content || '';
    return adapter.calculate(expression);
  }

  private async executeDateTime(
    adapter: ProviderAdapter,
    messages: Message[]
  ): Promise<string> {
    const operation = messages[messages.length - 1]?.content || 'now';
    return adapter.dateTime(operation);
  }

  private async executeDocumentAnalysis(
    adapter: ProviderAdapter,
    attachments: Attachment[] | undefined,
    model: RawModel,
    options: Record<string, unknown>
  ): Promise<string> {
    const docAttachment = attachments?.find(a => a.type === 'document' || a.type === 'file');
    if (!docAttachment) {
      throw new Error('No document attachment provided for analysis');
    }

    const docMatch = docAttachment.url.match(/^\/api\/upload\/files\/([^/]+)\/([^/]+)$/);
    if (!docMatch) {
      throw new Error('Cannot access attachment file');
    }
    const [, docUserId, docFilename] = docMatch;

    const docBuffer = await downloadFile(docUserId, docFilename);

    if (isTextFile(docAttachment.mimeType, docAttachment.name)) {
      const { extractTextFromBuffer } = await import('../lib/documentExtractor.js');
      const extracted = await extractTextFromBuffer(docBuffer, docAttachment.name, docAttachment.mimeType);

      const analysisMessages: Message[] = [
        {
          id: 'doc_analysis',
          chatId: '',
          role: 'user',
          content: `Analyze the following document (${docAttachment.name}):\n\n---\n${extracted.text}\n---`,
          createdAt: new Date().toISOString(),
        },
      ];

      if ('chat' in adapter && typeof adapter.chat === 'function') {
        return adapter.chat(analysisMessages, model, options);
      }
      throw new Error('Provider does not support text analysis');
    }

    if (docAttachment.mimeType.startsWith('image/')) {
      if (!adapter.analyzeImage) {
        throw new Error(`Provider ${adapter.providerId} does not support image analysis`);
      }
      const base64 = `data:${docAttachment.mimeType};base64,${docBuffer.toString('base64')}`;
      return adapter.analyzeImage(base64, model, options);
    }

    throw new Error(`Unsupported file type for analysis: ${docAttachment.mimeType}`);
  }

  private async executeVideo(
    adapter: ProviderAdapter,
    messages: Message[],
    attachments: Attachment[] | undefined,
    model: RawModel,
    options: Record<string, unknown>
  ): Promise<string> {
    throw new Error('Video generation is not yet supported. This capability requires a dedicated video-generation provider adapter.');
  }

  private async executeCustomFeature(
    adapter: ProviderAdapter,
    messages: Message[],
    model: RawModel,
    options: Record<string, unknown>
  ): Promise<string> {
    return this.executeChat(adapter, messages, model, options);
  }

  private async executeCustomAction(
    adapter: ProviderAdapter,
    messages: Message[],
    bundleCapability: BundleCapability,
    options: Record<string, unknown>
  ): Promise<string> {
    return `Custom action executed: ${bundleCapability.capabilityId}`;
  }
}

export const router = new Router();
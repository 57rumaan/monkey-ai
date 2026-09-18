import { registerAdapter } from './adapters';
import { openAIAdapter } from './openai';
import { anthropicAdapter } from './anthropic';
import { googleAdapter } from './google';
import { replicateAdapter } from './replicate';
import { huggingFaceAdapter } from './huggingface';

registerAdapter(openAIAdapter);
registerAdapter(anthropicAdapter);
registerAdapter(googleAdapter);
registerAdapter(replicateAdapter);
registerAdapter(huggingFaceAdapter);

export {
  openAIAdapter,
  anthropicAdapter,
  googleAdapter,
  replicateAdapter,
  huggingFaceAdapter,
};
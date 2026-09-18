import { registerAdapter } from './adapters.js';
import { openAIAdapter } from './openai.js';
import { anthropicAdapter } from './anthropic.js';
import { googleAdapter } from './google.js';
import { replicateAdapter } from './replicate.js';
import { huggingFaceAdapter } from './huggingface.js';

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
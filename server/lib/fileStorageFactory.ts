import type { FileStorageProvider } from './fileStorage.js';
import { LocalFileStorage } from './fileStorage.js';
import { S3FileStorage } from './s3FileStorage.js';

let fileStorageInstance: FileStorageProvider | undefined = undefined;

export function getFileStorage(): FileStorageProvider {
  if (fileStorageInstance) return fileStorageInstance;

  const provider = process.env.FILE_STORAGE_PROVIDER || 'local';
  const isProduction = process.env.NODE_ENV === 'production';

  let instance: FileStorageProvider;

  if (provider === 's3') {
    try {
      instance = new S3FileStorage();
      console.log('[FileStorage] Using S3-compatible storage');
    } catch (e) {
      if (isProduction) {
        console.error('[FATAL] S3 initialization failed in production. Cannot fall back to local storage.');
        process.exit(1);
      }
      console.warn('[FileStorage] S3 initialization failed, falling back to local storage:', e instanceof Error ? e.message : e);
      instance = new LocalFileStorage();
    }
  } else {
    instance = new LocalFileStorage();
    console.log('[FileStorage] Using local file storage');
  }

  fileStorageInstance = instance;
  return instance;
}

export function resetFileStorage(): void {
  fileStorageInstance = undefined;
}

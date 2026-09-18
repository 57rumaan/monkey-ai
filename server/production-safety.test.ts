import { describe, it, expect, afterEach, vi } from 'vitest';
import { join } from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

describe('Production Safety', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // ── JSONBin fail-fast ──────────────────────────────────────────────

  describe('JSONBin production fail-fast', () => {
    it('should exit when NODE_ENV=production and JSONBIN_API_KEY is missing', async () => {
      vi.resetModules();

      process.env.NODE_ENV = 'production';
      delete process.env.JSONBIN_API_KEY;
      process.env.JSONBIN_BIN_ID = 'some-bin-id';

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      try {
        await import('../server/storage');
        expect(exitSpy).toHaveBeenCalledWith(1);
      } finally {
        exitSpy.mockRestore();
      }
    });

    it('should exit when NODE_ENV=production and JSONBIN_BIN_ID is missing', async () => {
      vi.resetModules();

      process.env.NODE_ENV = 'production';
      process.env.JSONBIN_API_KEY = 'some-api-key';
      delete process.env.JSONBIN_BIN_ID;

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      try {
        await import('../server/storage');
        expect(exitSpy).toHaveBeenCalledWith(1);
      } finally {
        exitSpy.mockRestore();
      }
    });

    it('should allow local storage in development when JSONBin is not configured', async () => {
      vi.resetModules();

      process.env.NODE_ENV = 'development';
      delete process.env.JSONBIN_API_KEY;
      delete process.env.JSONBIN_BIN_ID;

      const { getStorageAdapter } = await import('../server/storage');
      const adapter = getStorageAdapter();
      expect(adapter).toBeDefined();
      expect(adapter.constructor.name).toBe('FileStorageAdapter');
    });
  });

  // ── S3/R2 fail-fast ───────────────────────────────────────────────

  describe('S3 production fail-fast', () => {
    it('should exit when NODE_ENV=production, FILE_STORAGE_PROVIDER=s3, and S3 init fails', async () => {
      vi.resetModules();

      process.env.NODE_ENV = 'production';
      process.env.FILE_STORAGE_PROVIDER = 's3';
      delete process.env.S3_ENDPOINT;
      delete process.env.S3_BUCKET;
      delete process.env.S3_ACCESS_KEY_ID;
      delete process.env.S3_SECRET_ACCESS_KEY;

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      try {
        const { getFileStorage } = await import('../server/lib/fileStorageFactory');
        getFileStorage();
        expect(exitSpy).toHaveBeenCalledWith(1);
      } finally {
        exitSpy.mockRestore();
      }
    });

    it('should allow local fallback in development when S3 init fails', async () => {
      process.env.NODE_ENV = 'development';
      process.env.FILE_STORAGE_PROVIDER = 's3';
      delete process.env.S3_ENDPOINT;
      delete process.env.S3_BUCKET;
      delete process.env.S3_ACCESS_KEY_ID;
      delete process.env.S3_SECRET_ACCESS_KEY;

      const { getFileStorage, resetFileStorage } = await import('../server/lib/fileStorageFactory');
      resetFileStorage();
      const adapter = getFileStorage();
      expect(adapter).toBeDefined();
      expect(adapter.constructor.name).toBe('LocalFileStorage');
    });
  });

  // ── Seed script ───────────────────────────────────────────────────

  describe('Seed script', () => {
    const seedScript = join(__dirname, '..', 'scripts', 'seed.ts');

    it('should fail when SEED_ADMIN_PASSWORD is missing', async () => {
      try {
        await execFileAsync('npx', ['tsx', seedScript], {
          env: { ...process.env, SEED_ADMIN_PASSWORD: '', DATA_DIR: '.test-seed-data' },
          timeout: 15000,
        });
        expect(true).toBe(false);
      } catch (err: any) {
        expect(err.code).not.toBe(0);
      }
    });

    it('should use relative imports that resolve correctly', async () => {
      try {
        await execFileAsync('npx', ['tsx', seedScript], {
          env: { ...process.env, SEED_ADMIN_PASSWORD: 'test-password-123', DATA_DIR: '.test-seed-data' },
          timeout: 15000,
        });
      } catch (err: any) {
        const output = (err.stdout || '') + (err.stderr || '');
        expect(output).not.toContain('Cannot find module');
        expect(output).not.toContain('@/lib/storage');
        expect(output).not.toContain('@/lib/auth/utils');
      }
    });

    it('should use real Gemini API model IDs for Google provider', async () => {
      const seedContent = require('fs').readFileSync(seedScript, 'utf-8');
      const googleModels = seedContent.match(/id:\s*'(gemini-[^']+)'/g) || [];
      const validModelPatterns = [
        /^gemini-\d+(\.\d+)*(-\w+)*$/, // gemini-2.5-flash, gemini-3.5-flash-preview, etc.
      ];
      for (const match of googleModels) {
        const modelId = match.match(/'(gemini-[^']+)'/)?.[1];
        if (modelId) {
          const isValid = validModelPatterns.some(p => p.test(modelId));
          expect(isValid).toBe(true);
        }
      }
    });

    it('should not claim image/video generation for Gemini Flash models', async () => {
      const seedContent = require('fs').readFileSync(seedScript, 'utf-8');
      const lines = seedContent.split('\n');
      const googleStart = lines.findIndex((l: string) => l.includes("label: 'Google'"));
      expect(googleStart).toBeGreaterThanOrEqual(0);
      const nextProviderIdx = lines.findIndex((l: string, i: number) => i > googleStart && l.includes("label: '") && !l.includes("'Google'"));
      const googleBlock = lines.slice(googleStart, nextProviderIdx > 0 ? nextProviderIdx : undefined).join('\n');
      expect(googleBlock).not.toContain('text_to_image');
      expect(googleBlock).not.toContain('video_generation');
      expect(googleBlock).not.toContain('text_to_voice');
      expect(googleBlock).not.toContain('voice_to_text');
    });
  });
});

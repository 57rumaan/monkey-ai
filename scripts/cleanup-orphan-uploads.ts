import { readdir, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { getFileStorage } from '../server/lib/fileStorageFactory';

const DATA_DIR = join(process.env.DATA_DIR || process.cwd(), 'data');

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const data = await import('fs/promises').then(fs => fs.readFile(filePath, 'utf-8'));
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

async function collectReferencedUploads(): Promise<Set<string>> {
  const referenced = new Set<string>();
  const messagesDir = join(DATA_DIR, 'messages');

  try {
    const files = await readdir(messagesDir);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const message = await readJsonFile<any>(join(messagesDir, file));
      if (message?.attachments) {
        for (const att of message.attachments) {
          if (att.url) {
            const match = att.url.match(/\/api\/upload\/files\/([^/]+)\/([^/]+)$/);
            if (match) {
              referenced.add(`${match[1]}/${match[2]}`);
            }
          }
        }
      }
    }
  } catch {
    // No messages dir or empty
  }

  return referenced;
}

async function cleanupOrphanUploads(dryRun: boolean): Promise<{ scanned: number; deleted: number; errors: number }> {
  let scanned = 0;
  let deleted = 0;
  let errors = 0;

  const referenced = await collectReferencedUploads();
  const fileStorage = getFileStorage();

  const provider = process.env.FILE_STORAGE_PROVIDER || 'local';

  if (provider === 'local') {
    const { join } = await import('path');
    const UPLOAD_ROOT = join(process.cwd(), 'uploads');

    try {
      const userDirs = await readdir(UPLOAD_ROOT);
      for (const userId of userDirs) {
        const files = await fileStorage.listFiles(userId);
        for (const file of files) {
          scanned++;
          const refKey = `${userId}/${file}`;
          if (!referenced.has(refKey)) {
            if (!dryRun) {
              try {
                await fileStorage.delete(userId, file);
                deleted++;
              } catch {
                errors++;
              }
            } else {
              deleted++;
            }
          }
        }
      }
    } catch {
      // No uploads dir
    }
  } else {
    console.log('[OrphanCleanup] S3 cleanup: listing all user prefixes is not supported in this basic implementation.');
    console.log('[OrphanCleanup] For S3, consider using S3 lifecycle policies or a dedicated cleanup job.');
  }

  return { scanned, deleted, errors };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  console.log(`Starting orphan upload cleanup${dryRun ? ' (DRY RUN)' : ''}...`);

  const result = await cleanupOrphanUploads(dryRun);
  console.log(`Cleanup complete: ${result.scanned} scanned, ${result.deleted} ${dryRun ? 'would be deleted' : 'deleted'}, ${result.errors} errors`);
}

main().catch(console.error);

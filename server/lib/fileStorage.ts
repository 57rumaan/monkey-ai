import { readFile, writeFile, unlink, stat, mkdir, readdir } from 'fs/promises';
import { join } from 'path';

export interface FileStorageProvider {
  upload(userId: string, filename: string, buffer: Buffer): Promise<void>;
  download(userId: string, filename: string): Promise<Buffer>;
  delete(userId: string, filename: string): Promise<void>;
  exists(userId: string, filename: string): Promise<boolean>;
  listFiles(userId: string): Promise<string[]>;
}

function validatePathComponent(value: string, label: string): void {
  if (!value || value.includes('..') || value.includes('/') || value.includes('\\')) {
    throw new Error(`Invalid ${label}`);
  }
}

const UPLOAD_ROOT = join(process.cwd(), 'uploads');

export class LocalFileStorage implements FileStorageProvider {
  private root: string;

  constructor(root?: string) {
    this.root = root || UPLOAD_ROOT;
  }

  async upload(userId: string, filename: string, buffer: Buffer): Promise<void> {
    validatePathComponent(userId, 'userId');
    validatePathComponent(filename, 'filename');
    const dir = join(this.root, userId);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, filename), buffer);
  }

  async download(userId: string, filename: string): Promise<Buffer> {
    validatePathComponent(userId, 'userId');
    validatePathComponent(filename, 'filename');
    return readFile(join(this.root, userId, filename));
  }

  async delete(userId: string, filename: string): Promise<void> {
    validatePathComponent(userId, 'userId');
    validatePathComponent(filename, 'filename');
    try {
      await unlink(join(this.root, userId, filename));
    } catch {
      // file may not exist
    }
  }

  async exists(userId: string, filename: string): Promise<boolean> {
    validatePathComponent(userId, 'userId');
    validatePathComponent(filename, 'filename');
    try {
      await stat(join(this.root, userId, filename));
      return true;
    } catch {
      return false;
    }
  }

  async listFiles(userId: string): Promise<string[]> {
    validatePathComponent(userId, 'userId');
    try {
      const dir = join(this.root, userId);
      return await readdir(dir);
    } catch {
      return [];
    }
  }

  getRoot(): string {
    return this.root;
  }
}

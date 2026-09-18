import { Router } from 'express';
import multer, { MulterError } from 'multer';
import { randomBytes } from 'crypto';
import { extname } from 'path';
import { requireAuth } from '../middleware';
import { getFileStorage } from '../lib/fileStorageFactory';
import type { Attachment } from '../types';

const router = Router();

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_FILES = 5;

const ALLOWED_EXTENSIONS: Record<string, string[]> = {
  image: ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
  document: ['.pdf', '.txt', '.md', '.docx'],
  audio: ['.mp3', '.wav', '.ogg', '.m4a', '.webm'],
  file: ['.js', '.ts', '.jsx', '.tsx', '.json', '.csv', '.css', '.html', '.xml', '.yaml', '.yml'],
};

const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.pif',
  '.sh', '.bash', '.zsh', '.fish',
  '.php', '.py', '.rb', '.pl', '.cgi',
  '.jar', '.class', '.war',
  '.dll', '.so', '.dylib',
  '.vbs', '.vbe', '.wsf', '.wsh',
  '.ps1', '.psm1', '.psd1',
  '.app', '.action', '.command',
]);

function resolveCategory(mimetype: string, ext: string): Attachment['type'] {
  const lowerExt = ext.toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(lowerExt) || mimetype.startsWith('image/')) return 'image';
  if (['.mp3', '.wav', '.ogg', '.m4a', '.webm'].includes(lowerExt) || mimetype.startsWith('audio/')) return 'audio';
  if (['.pdf', '.docx'].includes(lowerExt) || mimetype === 'application/pdf' || mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'document';
  if (['.txt', '.md'].includes(lowerExt) || mimetype.startsWith('text/')) return 'document';
  return 'file';
}

const multerStorage = multer.memoryStorage();

const upload = multer({
  storage: multerStorage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
  },
  fileFilter: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();

    if (BLOCKED_EXTENSIONS.has(ext)) {
      cb(new Error(`File type not allowed: ${ext}`));
      return;
    }

    const allAllowed = Object.values(ALLOWED_EXTENSIONS).flat();
    if (!allAllowed.includes(ext)) {
      cb(new Error(`Unsupported file type: ${ext}`));
      return;
    }

    cb(null, true);
  },
});

const uploadMiddleware = (req: any, res: any, next: any) => {
  upload.array('files', MAX_FILES)(req, res, (err: any) => {
    if (err) {
      if (err instanceof MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ success: false, error: 'File too large' });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({ success: false, error: 'Too many files' });
        }
        return res.status(400).json({ success: false, error: 'File upload error' });
      }
      if (err?.message?.startsWith('File type not allowed') || err?.message?.startsWith('Unsupported file type')) {
        return res.status(400).json({ success: false, error: 'File type not allowed' });
      }
      return res.status(500).json({ success: false, error: 'Upload failed' });
    }
    next();
  });
};

router.post('/', requireAuth(), uploadMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files provided' });
    }

    const fileStorage = getFileStorage();
    const attachments: Attachment[] = [];

    for (const file of files) {
      const fileId = `upl_${randomBytes(12).toString('hex')}`;
      const ext = extname(file.originalname).toLowerCase();
      const storedName = `${fileId}${ext}`;

      await fileStorage.upload(user.userId, storedName, file.buffer);

      const category = resolveCategory(file.mimetype, ext);

      attachments.push({
        id: fileId,
        type: category,
        name: file.originalname,
        url: `/api/upload/files/${user.userId}/${storedName}`,
        size: file.size,
        mimeType: file.mimetype,
      });
    }

    res.json({ success: true, data: attachments });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, error: 'Upload failed' });
  }
});

router.get('/files/:userId/:filename', requireAuth(), async (req, res) => {
  try {
    const user = (req as any).user;
    const { userId, filename } = req.params;

    if (userId !== user.userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ success: false, error: 'Invalid filename' });
    }

    const fileStorage = getFileStorage();

    let buffer: Buffer;
    try {
      buffer = await fileStorage.download(userId, filename);
    } catch {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    const ext = extname(filename).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
      '.gif': 'image/gif', '.webp': 'image/webp', '.pdf': 'application/pdf',
      '.txt': 'text/plain', '.md': 'text/markdown',
      '.json': 'application/json', '.csv': 'text/csv',
      '.js': 'text/javascript', '.ts': 'text/typescript',
      '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
      '.m4a': 'audio/mp4', '.webm': 'audio/webm',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    const contentType = mimeMap[ext] || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to serve file' });
  }
});

export function getUploadPath(userId: string, filename: string): string | null {
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) return null;
  const { join } = require('path');
  return join(process.cwd(), 'uploads', userId, filename);
}

export function getUploadRoot(): string {
  const { join } = require('path');
  return join(process.cwd(), 'uploads');
}

export async function downloadFile(userId: string, filename: string): Promise<Buffer> {
  const fileStorage = getFileStorage();
  return fileStorage.download(userId, filename);
}

export default router;

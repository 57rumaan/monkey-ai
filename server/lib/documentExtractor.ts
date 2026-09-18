import { readFile } from 'fs/promises';
import { extname } from 'path';

const MAX_EXTRACTED_LENGTH = 100_000; // 100KB of text
const TEXT_EXTENSIONS = new Set([
  '.txt', '.md', '.json', '.csv', '.js', '.ts', '.jsx', '.tsx',
  '.css', '.html', '.xml', '.yaml', '.yml', '.toml', '.ini',
  '.py', '.rb', '.pl', '.sh', '.bash', '.sql', '.r', '.go',
  '.rs', '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.swift',
  '.kt', '.scala', '.lua', '.php', '.dart', '.vue', '.svelte',
]);

export interface ExtractedDocument {
  text: string;
  mimeType: string;
  truncated: boolean;
}

export async function extractTextFromFile(filePath: string, _mimeType: string): Promise<ExtractedDocument> {
  const ext = extname(filePath).toLowerCase();

  if (TEXT_EXTENSIONS.has(ext)) {
    return extractPlainText(filePath);
  }

  if (ext === '.pdf') {
    throw new Error('PDF text extraction is not yet supported. Please convert to text format first.');
  }

  throw new Error(`Unsupported file type for document extraction: ${ext}`);
}

export async function extractTextFromBuffer(buffer: Buffer, filename: string, _mimeType: string): Promise<ExtractedDocument> {
  const ext = extname(filename).toLowerCase();

  if (TEXT_EXTENSIONS.has(ext)) {
    const text = buffer.toString('utf-8');
    const truncated = text.length > MAX_EXTRACTED_LENGTH;
    return {
      text: truncated ? text.slice(0, MAX_EXTRACTED_LENGTH) : text,
      mimeType: 'text/plain',
      truncated,
    };
  }

  if (ext === '.pdf') {
    throw new Error('PDF text extraction is not yet supported. Please convert to text format first.');
  }

  throw new Error(`Unsupported file type for document extraction: ${ext}`);
}

async function extractPlainText(filePath: string): Promise<ExtractedDocument> {
  const buffer = await readFile(filePath);
  const text = buffer.toString('utf-8');
  const truncated = text.length > MAX_EXTRACTED_LENGTH;

  return {
    text: truncated ? text.slice(0, MAX_EXTRACTED_LENGTH) : text,
    mimeType: 'text/plain',
    truncated,
  };
}

export function isTextFile(mimeType: string, filename: string): boolean {
  const ext = extname(filename).toLowerCase();
  return TEXT_EXTENSIONS.has(ext) || mimeType.startsWith('text/') || mimeType === 'application/json';
}

export function isPdfFile(_mimeType: string, filename: string): boolean {
  return extname(filename).toLowerCase() === '.pdf';
}

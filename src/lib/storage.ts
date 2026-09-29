// Storage provider — ver CONTRATOS_TECNICOS.md §1.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export type StorageCategory = 'image' | 'video';

export interface StorageSaveInput {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  category: StorageCategory;
  categorySlug: string;
  mosaicId: string;
  metadata?: Record<string, string>;
}

export interface StorageSaveResult {
  key: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface StorageProvider {
  save(input: StorageSaveInput): Promise<StorageSaveResult>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getSignedUrl?(key: string, expiresIn?: number): Promise<string>;
  buildKey(
    input: Pick<StorageSaveInput, 'categorySlug' | 'mosaicId' | 'originalName' | 'mimeType'>,
  ): string;
}

// Keys generadas por buildKey: {slug}/{mosaicId}/{uuid}.{ext} — el punto de
// la extensión es legítimo. Se permite `.` pero se rechaza `..` explícitamente
// (además del check path.resolve().startsWith() como defensa en profundidad).
const KEY_REGEX = /^[a-z0-9][a-z0-9/_\-.]*$/;

function isValidKey(key: string): boolean {
  return KEY_REGEX.test(key) && !key.includes('..');
}

/** Convierte MIME a extensión normalizada */
function extFromMime(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/avif': 'avif',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
  };
  return map[mimeType] ?? 'bin';
}

/** Sanitiza un slug para uso en keys */
function sanitizeSlug(slug: string): string {
  return slug.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 64);
}

// --- LocalStorageProvider ---

class LocalStorageProvider implements StorageProvider {
  private readonly uploadsDir: string;
  private readonly publicPath: string;

  constructor(uploadsDir = process.env.UPLOADS_DIR ?? 'public/uploads') {
    // turbopackIgnore: paths son solo en runtime (server), no se incluyen en client bundle
    this.uploadsDir = path.resolve(
      /* turbopackIgnore: true */ process.cwd(),
      uploadsDir,
    );
    this.publicPath =
      '/' +
      path
        .relative(
          /* turbopackIgnore: true */ path.resolve(process.cwd(), 'public'),
          this.uploadsDir,
        )
        .replace(/\\/g, '/');
  }

  buildKey(input: Pick<StorageSaveInput, 'categorySlug' | 'mosaicId' | 'originalName' | 'mimeType'>): string {
    const slug = sanitizeSlug(input.categorySlug);
    const mosaicId = input.mosaicId;
    const ext = extFromMime(input.mimeType);
    const uuid = crypto.randomUUID();
    return `${slug}/${mosaicId}/${uuid}.${ext}`;
  }

  async save(input: StorageSaveInput): Promise<StorageSaveResult> {
    const key = this.buildKey(input);
    const fullPath = path.join(this.uploadsDir, key);

    // Validar que la key no escape del directorio
    if (!isValidKey(key)) {
      throw new Error(`Invalid storage key: ${key}`);
    }
    const resolved = path.resolve(fullPath);
    if (!resolved.startsWith(this.uploadsDir)) {
      throw new Error(`Path traversal detected in key: ${key}`);
    }

    // Crear directorios necesarios
    await fs.mkdir(path.dirname(resolved), { recursive: true });
    await fs.writeFile(resolved, input.buffer);

    const url = this.publicPath + '/' + key;
    return { key, url, size: input.buffer.length, mimeType: input.mimeType };
  }

  async delete(key: string): Promise<void> {
    if (!isValidKey(key)) {
      throw new Error(`Invalid storage key: ${key}`);
    }
    const fullPath = path.join(this.uploadsDir, key);
    const resolved = path.resolve(fullPath);
    if (!resolved.startsWith(this.uploadsDir)) {
      throw new Error(`Path traversal detected in key: ${key}`);
    }
    await fs.unlink(resolved).catch(() => {
      // Si no existe, ignorar (idempotente)
    });
  }

  async exists(key: string): Promise<boolean> {
    if (!isValidKey(key)) return false;
    try {
      await fs.access(path.join(this.uploadsDir, key));
      return true;
    } catch {
      return false;
    }
  }

  getSignedUrl(): Promise<string> {
    throw new Error('LocalStorageProvider no soporta URLs firmadas. Los archivos son públicos.');
  }
}

// --- Factory ---

const globalForStorage = globalThis as unknown as {
  storage: StorageProvider | undefined;
};

export function getStorage(): StorageProvider {
  if (globalForStorage.storage) return globalForStorage.storage;
  // Aquí se puede swappear a S3/Cloudinary según STORAGE_PROVIDER env
  globalForStorage.storage = new LocalStorageProvider();
  return globalForStorage.storage;
}

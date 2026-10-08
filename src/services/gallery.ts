/**
 * Servicio de galería — consume la API real.
 *
 * Reemplaza al mock de FASE 2. Los tipos exportados son la forma que
 * consume el frontend; la transformación desde el shape de Prisma se
 * hace aquí.
 */

// --- Tipos del frontend (lo que consumen los componentes) ---

export type MediaType = 'image' | 'video';

/** Datos técnicos de captura (EXIF). Todo nullable: solo imágenes con EXIF. */
export interface PhotoExifInfo {
  width: number | null;
  height: number | null;
  cameraMake: string | null;
  cameraModel: string | null;
  lensModel: string | null;
  focalLength: number | null;
  aperture: number | null;
  shutterSpeed: number | null;
  iso: number | null;
  /** ISO string (serializable para cliente) */
  takenAt: string | null;
}

export interface MediaFile {
  id: string;
  url: string;
  type: MediaType;
  alt: string | null;
  order: number;
  exif: PhotoExifInfo | null;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  coverImage: string | null;
  mosaicCount?: number;
}

export interface Mosaic {
  id: string;
  title: string;
  description: string | null;
  coverFileId: string | null;
  category: { id: string; name: string; slug: string };
  files: MediaFile[];
}

export interface CategoryWithMosaics {
  category: Category;
  mosaics: Mosaic[];
}

// --- Helpers de transformación ---

function transformCategory(raw: {
  id: string;
  slug: string;
  name: string;
  description: string;
  coverImage: string | null;
  _count?: { mosaics: number };
}): Category {
  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    description: raw.description,
    coverImage: raw.coverImage,
    mosaicCount: raw._count?.mosaics,
  };
}

interface RawFileExif {
  width: number | null;
  height: number | null;
  cameraMake: string | null;
  cameraModel: string | null;
  lensModel: string | null;
  focalLength: number | null;
  aperture: number | null;
  shutterSpeed: number | null;
  iso: number | null;
  takenAt: string | null;
}

function toIsoString(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) return null;
  return date.toISOString();
}

function transformExif(raw: Partial<RawFileExif>): PhotoExifInfo | null {
  const exif: PhotoExifInfo = {
    width: raw.width ?? null,
    height: raw.height ?? null,
    cameraMake: raw.cameraMake ?? null,
    cameraModel: raw.cameraModel ?? null,
    lensModel: raw.lensModel ?? null,
    focalLength: raw.focalLength ?? null,
    aperture: raw.aperture ?? null,
    shutterSpeed: raw.shutterSpeed ?? null,
    iso: raw.iso ?? null,
    takenAt: toIsoString(raw.takenAt),
  };
  const hasData =
    exif.cameraModel !== null ||
    exif.lensModel !== null ||
    exif.focalLength !== null ||
    exif.aperture !== null ||
    exif.shutterSpeed !== null ||
    exif.iso !== null;
  return hasData ? exif : null;
}

function transformFile(raw: {
  id: string;
  url: string;
  type: 'IMAGE' | 'VIDEO';
  altText: string | null;
  order: number;
} & Partial<RawFileExif>): MediaFile {
  return {
    id: raw.id,
    url: raw.url,
    type: raw.type === 'IMAGE' ? 'image' : 'video',
    alt: raw.altText,
    order: raw.order,
    exif: raw.type === 'IMAGE' ? transformExif(raw) : null,
  };
}

function transformMosaic(raw: {
  id: string;
  title: string;
  description: string | null;
  coverFileId: string | null;
  category: { id: string; name: string; slug: string };
  files: Array<{
    id: string;
    url: string;
    type: 'IMAGE' | 'VIDEO';
    altText: string | null;
    order: number;
  } & Partial<RawFileExif>>;
}): Mosaic {
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    coverFileId: raw.coverFileId,
    category: raw.category,
    files: raw.files
      .slice()
      .sort((a, b) => a.order - b.order)
      .map(transformFile),
  };
}

// --- Fetch helpers ---

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

function getApiBase(): string {
  // En server components usamos URL absoluta; en client puede ser relativo.
  // IMPORTANTE: en server ir directo al proceso local (INTERNAL_APP_URL),
  // NUNCA por NEXT_PUBLIC_APP_URL: la URL pública pasa por el túnel/Funnel
  // y el hairpin desde dentro de la red muere con ConnectTimeout.
  if (typeof window === 'undefined') {
    return process.env.INTERNAL_APP_URL ?? 'http://localhost:3000';
  }
  return '';
}

async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getApiBase()}${path}`, {
    ...init,
    headers: { ...init?.headers },
    cache: 'no-store',
  });
  const json = (await res.json().catch(() => ({}))) as ApiResponse<T>;
  if (!res.ok || !json.success || json.data === undefined) {
    throw new Error(json.error?.message ?? `Error ${res.status}`);
  }
  return json.data;
}

// --- API pública ---

/** Lista de categorías para la home */
export async function getCategories(): Promise<Category[]> {
  const raw = await apiGet<
    Array<{
      id: string;
      slug: string;
      name: string;
      description: string;
      coverImage: string | null;
      _count?: { mosaics: number };
    }>
  >('/api/categories');
  return raw.map(transformCategory);
}

/** Categoría por slug */
export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const all = await getCategories();
  return all.find((c) => c.slug === slug) ?? null;
}

/** Mosaicos de una categoría por slug */
export async function getMosaicsByCategory(slug: string): Promise<Mosaic[]> {
  const raw = await apiGet<
    Array<{
      id: string;
      title: string;
      description: string | null;
      coverFileId: string | null;
      category: { id: string; name: string; slug: string };
      files: Array<{
        id: string;
        url: string;
        type: 'IMAGE' | 'VIDEO';
        altText: string | null;
        order: number;
      }>;
    }>
  >(`/api/mosaics?categorySlug=${encodeURIComponent(slug)}`);
  return raw.map(transformMosaic);
}

/** Categoría + mosaicos en una llamada combinada */
export async function getCategoryWithMosaics(
  slug: string,
): Promise<CategoryWithMosaics | null> {
  const [category, mosaics] = await Promise.all([
    getCategoryBySlug(slug),
    getMosaicsByCategory(slug),
  ]);
  if (!category) return null;
  return { category, mosaics };
}

// --- Servicios ---

export interface Service {
  id: string;
  title: string;
  slug: string;
  description: string;
  priceLabel: string | null;
  priceNote: string | null;
  durationLabel: string | null;
  features: string[];
  icon: string | null;
  image: string | null;
  order: number;
  visible: boolean;
}

function parseFeatures(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((f): f is string => typeof f === 'string').slice(0, 20);
  }
  if (typeof raw === 'string') {
    try {
      return parseFeatures(raw ? JSON.parse(raw) : []);
    } catch {
      return [];
    }
  }
  return [];
}

function transformService(raw: {
  id: string;
  title: string;
  slug: string;
  description: string;
  priceLabel: string | null;
  priceNote: string | null;
  durationLabel: string | null;
  features: unknown;
  icon: string | null;
  image: string | null;
  order: number;
  visible: boolean;
}): Service {
  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    description: raw.description,
    priceLabel: raw.priceLabel,
    priceNote: raw.priceNote,
    durationLabel: raw.durationLabel,
    features: parseFeatures(raw.features),
    icon: raw.icon,
    image: raw.image,
    order: raw.order,
    visible: raw.visible,
  };
}

/** Servicios visibles para la home. Si falla o no hay, devuelve [] (sección oculta). */
export async function getServices(): Promise<Service[]> {
  try {
    const raw = await apiGet<Array<Record<string, unknown>>>('/api/services');
    return raw.map((s) =>
      transformService({
        id: String(s['id'] ?? ''),
        title: String(s['title'] ?? ''),
        slug: String(s['slug'] ?? ''),
        description: String(s['description'] ?? ''),
        priceLabel: (s['priceLabel'] as string | null) ?? null,
        priceNote: (s['priceNote'] as string | null) ?? null,
        durationLabel: (s['durationLabel'] as string | null) ?? null,
        features: s['features'],
        icon: (s['icon'] as string | null) ?? null,
        image: (s['image'] as string | null) ?? null,
        order: Number(s['order'] ?? 0),
        visible: Boolean(s['visible'] ?? true),
      }),
    );
  } catch {
    return [];
  }
}

/** Servicio por slug (para la página de detalle). */
export async function getServiceBySlug(slug: string): Promise<Service | null> {
  const all = await getServices();
  return all.find((s) => s.slug === slug) ?? null;
}

/** Texto plano para extractos (la descripción puede traer HTML sanitizado). */
export function plainText(html: string, max = 160): string {
  const text = html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>\s*<p>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '…';
}

// --- Marcas (Marquee "Han confiado en nosotros") ---

export interface Brand {
  id: string;
  name: string;
  website: string | null;
  order: number;
  visible: boolean;
}

/** Marcas visibles para el Marquee. Si falla o no hay, devuelve [] (sección oculta). */
export async function getBrands(): Promise<Brand[]> {
  try {
    return await apiGet<Brand[]>('/api/brands');
  } catch {
    return [];
  }
}

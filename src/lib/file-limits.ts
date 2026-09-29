// Constantes de límites de archivos — sin imports pesados.
// Este archivo es seguro importar desde client components.

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
export const MAX_VIDEO_SIZE = 20 * 1024 * 1024; // 20 MB
export const MIN_IMAGE_SIDE = 800;
export const MAX_IMAGE_SIDE = 8000;

// Límites por mosaico — ver CONTRATOS_TECNICOS.md §5
export const MIN_IMAGES_PER_MOSAIC = 4;
export const MAX_IMAGES_PER_MOSAIC = 8;
export const MIN_VIDEOS_PER_MOSAIC = 2;
export const MAX_VIDEOS_PER_MOSAIC = 4;
export const MIN_FILES_PER_MOSAIC = 4;
export const MAX_FILES_PER_MOSAIC = 12;

export const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const;
export const ALLOWED_VIDEO_MIMES = ['video/mp4', 'video/webm'] as const;

export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIMES)[number];
export type AllowedVideoMime = (typeof ALLOWED_VIDEO_MIMES)[number];
export type AllowedMime = AllowedImageMime | AllowedVideoMime;

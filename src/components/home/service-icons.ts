import {
  Camera,
  Heart,
  Shirt,
  Package,
  User,
  Building2,
  Sparkles,
  Image as ImageIcon,
  Video as VideoIcon,
  Palette,
  Briefcase,
  Gift,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/** Iconos permitidos (misma lista cerrada que schemas/service.ts). */
const ICONS: Record<string, LucideIcon> = {
  Heart,
  Shirt,
  User,
  Package,
  Building2,
  Camera,
  Sparkles,
  Image: ImageIcon,
  Video: VideoIcon,
  Palette,
  Briefcase,
  Gift,
};

export const SERVICE_ICON_NAMES = Object.keys(ICONS);

export function serviceIcon(name: string | null): LucideIcon {
  if (name && name in ICONS) return ICONS[name] as LucideIcon;
  return Camera;
}

'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/Input';

/** Solo los campos tildados viajan al backend (el resto queda como está). */
export interface ExifPayload {
  cameraMake?: string;
  cameraModel?: string;
  lensModel?: string;
  focalLength?: number;
  aperture?: number;
  shutterSpeed?: number;
  iso?: number;
  takenAt?: string;
}

export interface ExifInitial {
  cameraMake?: string | null;
  cameraModel?: string | null;
  lensModel?: string | null;
  focalLength?: number | null;
  aperture?: number | null;
  shutterSpeed?: number | null;
  iso?: number | null;
  takenAt?: string | null;
}

interface ExifFieldsFormProps {
  idPrefix: string;
  initial?: ExifInitial;
  onChange: (payload: ExifPayload) => void;
}

type FieldKey =
  | 'cameraMake'
  | 'cameraModel'
  | 'lensModel'
  | 'focalLength'
  | 'aperture'
  | 'shutterSpeed'
  | 'iso'
  | 'takenAt';

const FIELDS: Array<{
  key: FieldKey;
  label: string;
  hint: string;
  input: 'text' | 'number' | 'date';
  placeholder: string;
}> = [
  { key: 'cameraMake', label: 'Marca', hint: 'Ej. Canon', input: 'text', placeholder: 'Canon' },
  { key: 'cameraModel', label: 'Cámara', hint: 'Ej. Canon EOS R5', input: 'text', placeholder: 'Canon EOS R5' },
  { key: 'lensModel', label: 'Lente', hint: 'Ej. RF85mm F1.2', input: 'text', placeholder: 'RF85mm F1.2 L USM' },
  { key: 'focalLength', label: 'Focal (mm)', hint: 'Ej. 85', input: 'number', placeholder: '85' },
  { key: 'aperture', label: 'Apertura (ƒ/)', hint: 'Ej. 1.8', input: 'number', placeholder: '1.8' },
  { key: 'shutterSpeed', label: 'Velocidad', hint: 'Ej. 1/250 o 0.004', input: 'text', placeholder: '1/250' },
  { key: 'iso', label: 'ISO', hint: 'Ej. 100', input: 'number', placeholder: '100' },
  { key: 'takenAt', label: 'Fecha de captura', hint: '', input: 'date', placeholder: '' },
];

/** Acepta "1/250" o segundos ("0.004", "2"). null si no parsea. */
function parseShutter(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const frac = t.match(/^1\s*\/\s*(\d+(?:[.,]\d+)?)$/);
  const denomRaw = frac?.[1];
  if (denomRaw) {
    const d = parseFloat(denomRaw.replace(',', '.'));
    return d > 0 ? 1 / d : null;
  }
  const n = parseFloat(t.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseNumber(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = parseFloat(t.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function toDateInput(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function initialRaw(key: FieldKey, initial?: ExifInitial): string {
  if (!initial) return '';
  const v = initial[key];
  if (v === null || v === undefined) return '';
  if (key === 'shutterSpeed' && typeof v === 'number') {
    return v >= 1 ? String(Math.round(v * 10) / 10) : `1/${Math.round(1 / v)}`;
  }
  if (key === 'takenAt' && typeof v === 'string') return toDateInput(v);
  return String(v);
}

/**
 * Ficha técnica por foto con checkboxes por campo.
 * Emite solo los campos tildados (con valores parseados).
 */
export function ExifFieldsForm({ idPrefix, initial, onChange }: ExifFieldsFormProps) {
  const [enabled, setEnabled] = useState<Record<FieldKey, boolean>>(() => ({
    cameraMake: !!initial?.cameraMake,
    cameraModel: !!initial?.cameraModel,
    lensModel: !!initial?.lensModel,
    focalLength: initial?.focalLength != null,
    aperture: initial?.aperture != null,
    shutterSpeed: initial?.shutterSpeed != null,
    iso: initial?.iso != null,
    takenAt: !!initial?.takenAt,
  }));
  const [raw, setRaw] = useState<Record<FieldKey, string>>(() => ({
    cameraMake: initialRaw('cameraMake', initial),
    cameraModel: initialRaw('cameraModel', initial),
    lensModel: initialRaw('lensModel', initial),
    focalLength: initialRaw('focalLength', initial),
    aperture: initialRaw('aperture', initial),
    shutterSpeed: initialRaw('shutterSpeed', initial),
    iso: initialRaw('iso', initial),
    takenAt: initialRaw('takenAt', initial),
  }));

  const emit = (nextEnabled: Record<FieldKey, boolean>, nextRaw: Record<FieldKey, string>) => {
    const payload: ExifPayload = {};
    if (nextEnabled.cameraMake && nextRaw.cameraMake.trim()) {
      payload.cameraMake = nextRaw.cameraMake.trim();
    }
    if (nextEnabled.cameraModel && nextRaw.cameraModel.trim()) {
      payload.cameraModel = nextRaw.cameraModel.trim();
    }
    if (nextEnabled.lensModel && nextRaw.lensModel.trim()) {
      payload.lensModel = nextRaw.lensModel.trim();
    }
    if (nextEnabled.focalLength) {
      const n = parseNumber(nextRaw.focalLength);
      if (n !== null) payload.focalLength = n;
    }
    if (nextEnabled.aperture) {
      const n = parseNumber(nextRaw.aperture);
      if (n !== null) payload.aperture = n;
    }
    if (nextEnabled.shutterSpeed) {
      const n = parseShutter(nextRaw.shutterSpeed);
      if (n !== null) payload.shutterSpeed = n;
    }
    if (nextEnabled.iso) {
      const n = parseNumber(nextRaw.iso);
      if (n !== null) payload.iso = Math.round(n);
    }
    if (nextEnabled.takenAt && nextRaw.takenAt) {
      payload.takenAt = nextRaw.takenAt;
    }
    onChange(payload);
  };

  const toggle = (key: FieldKey) => {
    const next = { ...enabled, [key]: !enabled[key] };
    setEnabled(next);
    emit(next, raw);
  };

  const change = (key: FieldKey, value: string) => {
    const next = { ...raw, [key]: value };
    setRaw(next);
    emit(enabled, next);
  };

  const invalid = (key: 'focalLength' | 'aperture' | 'shutterSpeed' | 'iso'): boolean => {
    if (!enabled[key] || !raw[key].trim()) return false;
    if (key === 'shutterSpeed') return parseShutter(raw[key]) === null;
    return parseNumber(raw[key]) === null;
  };

  return (
    <div className="space-y-3">
      {FIELDS.map((f) => {
        const id = `${idPrefix}-${f.key}`;
        const on = enabled[f.key];
        const bad =
          f.key === 'focalLength' ||
          f.key === 'aperture' ||
          f.key === 'shutterSpeed' ||
          f.key === 'iso'
            ? invalid(f.key)
            : false;
        return (
          <div key={f.key} className="flex items-start gap-3">
            <input
              id={`${id}-check`}
              type="checkbox"
              checked={on}
              onChange={() => toggle(f.key)}
              className="mt-2.5 h-4 w-4 shrink-0 border border-border bg-transparent accent-accent"
              aria-label={`Incluir ${f.label}`}
            />
            <div className={cn('flex-1', !on && 'opacity-40')}>
              <Input
                id={id}
                label={f.label}
                hint={f.hint || undefined}
                type={f.input === 'date' ? 'date' : f.input === 'number' ? 'number' : 'text'}
                placeholder={f.placeholder}
                value={raw[f.key]}
                onChange={(e) => change(f.key, e.target.value)}
                disabled={!on}
                error={bad ? 'Valor no válido' : undefined}
              />
            </div>
          </div>
        );
      })}
      <p className="text-xs text-fg-muted">
        Solo viajan los campos tildados. La ubicación (GPS) nunca se guarda.
      </p>
    </div>
  );
}

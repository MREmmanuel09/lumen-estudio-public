import { describe, expect, it } from 'vitest';
import {
  formatCameraName,
  formatExifLine,
  formatShutterSpeed,
  hasPhotoExif,
} from './exif-format';

describe('formatShutterSpeed', () => {
  it('devuelve null para null', () => {
    expect(formatShutterSpeed(null)).toBeNull();
  });

  it('formatea fracciones de segundo', () => {
    expect(formatShutterSpeed(0.004)).toBe('1/250');
    expect(formatShutterSpeed(0.5)).toBe('1/2');
  });

  it('formatea segundos enteros y con decimal', () => {
    expect(formatShutterSpeed(2)).toBe('2"');
    expect(formatShutterSpeed(1.46)).toBe('1.5"');
  });
});

describe('hasPhotoExif', () => {
  it('es false cuando no hay ningún dato', () => {
    expect(
      hasPhotoExif({
        focalLength: null,
        aperture: null,
        shutterSpeed: null,
        iso: null,
      }),
    ).toBe(false);
  });

  it('es true con al menos un dato', () => {
    expect(
      hasPhotoExif({
        focalLength: 85,
        aperture: null,
        shutterSpeed: null,
        iso: null,
      }),
    ).toBe(true);
  });
});

describe('formatExifLine', () => {
  it('arma la línea completa con separador ·', () => {
    expect(
      formatExifLine({
        focalLength: 85,
        aperture: 1.8,
        shutterSpeed: 0.004,
        iso: 100,
      }),
    ).toBe('85 mm · ƒ/1.8 · 1/250 · ISO 100');
  });

  it('incluye solo los datos presentes', () => {
    expect(
      formatExifLine({
        focalLength: 50,
        aperture: null,
        shutterSpeed: null,
        iso: null,
      }),
    ).toBe('50 mm');
  });

  it('devuelve null sin datos', () => {
    expect(
      formatExifLine({
        focalLength: null,
        aperture: null,
        shutterSpeed: null,
        iso: null,
      }),
    ).toBeNull();
  });
});

describe('formatCameraName', () => {
  it('evita repetir la marca cuando el modelo ya la incluye', () => {
    expect(formatCameraName('Canon', 'Canon EOS R5')).toBe('Canon EOS R5');
    expect(formatCameraName('canon', 'Canon EOS R5')).toBe('Canon EOS R5');
  });

  it('combina marca y modelo si difieren', () => {
    expect(formatCameraName('Canon', 'EOS R5')).toBe('Canon EOS R5');
  });

  it('maneja datos parciales', () => {
    expect(formatCameraName('Canon', null)).toBe('Canon');
    expect(formatCameraName(null, 'X100V')).toBe('X100V');
    expect(formatCameraName(null, null)).toBeNull();
  });
});

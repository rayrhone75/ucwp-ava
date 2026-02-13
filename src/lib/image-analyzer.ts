import sharp from 'sharp';
import type { PreflightResult, PreflightWarning } from '@/types/preflight';

const MIN_DPI = 150;
const IDEAL_DPI = 300;
const MIN_DIMENSION = 100;
const MAX_DIMENSION = 25000;

// Estimate DPI based on image dimensions — assumes a typical 12" wide gang sheet
const ASSUMED_PRINT_WIDTH_INCHES = 12;

export async function analyzeImage(buffer: Buffer): Promise<PreflightResult> {
  const metadata = await sharp(buffer).metadata();
  const warnings: PreflightWarning[] = [];

  const width = metadata.width || 0;
  const height = metadata.height || 0;
  const format = metadata.format || 'unknown';
  const hasAlpha = metadata.hasAlpha || false;
  const channels = metadata.channels || 0;
  const fileSize = buffer.length;

  // Estimate DPI: if image is placed at full width on a 12" sheet
  const estimatedDPI = width > 0 ? Math.round(width / ASSUMED_PRINT_WIDTH_INCHES) : 0;

  // Check dimensions
  if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
    warnings.push({
      level: 'error',
      message: `Image is too small (${width}x${height}px). Minimum is ${MIN_DIMENSION}px on each side.`,
    });
  }

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    warnings.push({
      level: 'error',
      message: `Image exceeds maximum dimensions (${width}x${height}px). Max is ${MAX_DIMENSION}px.`,
    });
  }

  // Check estimated DPI
  if (estimatedDPI > 0 && estimatedDPI < MIN_DPI) {
    warnings.push({
      level: 'warn',
      message: `Estimated print resolution is ${estimatedDPI} DPI (at full sheet width). We recommend at least ${IDEAL_DPI} DPI for sharp prints.`,
    });
  } else if (estimatedDPI >= MIN_DPI && estimatedDPI < IDEAL_DPI) {
    warnings.push({
      level: 'info',
      message: `Estimated ${estimatedDPI} DPI at full width — acceptable but ${IDEAL_DPI} DPI is ideal.`,
    });
  }

  // Check format
  if (format === 'jpeg' || format === 'jpg') {
    warnings.push({
      level: 'info',
      message: 'JPEG format detected. For best results with transparency, use PNG.',
    });
  }

  // Check transparency
  if (!hasAlpha) {
    warnings.push({
      level: 'info',
      message: 'No transparency channel detected. DTF prints work best with transparent backgrounds (PNG).',
    });
  }

  // Determine overall status
  let status: 'pass' | 'warn' | 'fail' = 'pass';
  if (warnings.some((w) => w.level === 'error')) {
    status = 'fail';
  } else if (warnings.some((w) => w.level === 'warn')) {
    status = 'warn';
  }

  return {
    width,
    height,
    format,
    hasAlpha,
    channels,
    fileSize,
    estimatedDPI,
    warnings,
    status,
  };
}

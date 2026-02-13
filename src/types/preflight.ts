export interface PreflightResult {
  width: number;
  height: number;
  format: string;
  hasAlpha: boolean;
  channels: number;
  fileSize: number;
  estimatedDPI: number;
  warnings: PreflightWarning[];
  status: 'pass' | 'warn' | 'fail';
}

export interface PreflightWarning {
  level: 'info' | 'warn' | 'error';
  message: string;
}

'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, CheckCircle, AlertTriangle, XCircle, FileImage, Loader2 } from 'lucide-react';
import type { PreflightResult } from '@/types/preflight';
import { cn, formatBytes } from '@/lib/utils';

export default function PreflightChecker() {
  const [result, setResult] = useState<PreflightResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const analyzeFile = useCallback(async (file: File) => {
    setError(null);
    setResult(null);
    setFileName(file.name);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch('/api/preflight', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Analysis failed');
      }

      const data: PreflightResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze image');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) analyzeFile(file);
    },
    [analyzeFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) analyzeFile(file);
    },
    [analyzeFile]
  );

  const statusIcon = {
    pass: <CheckCircle className="text-emerald-400" size={20} />,
    warn: <AlertTriangle className="text-amber-400" size={20} />,
    fail: <XCircle className="text-red-400" size={20} />,
  };

  const statusLabel = {
    pass: { text: 'Ready to Print', color: 'text-emerald-400' },
    warn: { text: 'Needs Attention', color: 'text-amber-400' },
    fail: { text: 'Not Print-Ready', color: 'text-red-400' },
  };

  const warningColors = {
    info: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    warn: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    error: 'text-red-400 bg-red-400/10 border-red-400/20',
  };

  return (
    <div className="flex flex-col h-full p-3">
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors',
          dragging
            ? 'border-violet-500 bg-violet-500/10'
            : 'border-zinc-700 hover:border-zinc-500 bg-zinc-800/30'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/tiff"
          onChange={handleFileInput}
          className="hidden"
        />
        {loading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={32} className="text-violet-400 animate-spin" />
            <p className="text-sm text-zinc-400">Analyzing...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload size={32} className="text-zinc-500" />
            <p className="text-sm text-zinc-300">Drop an image here or click to upload</p>
            <p className="text-xs text-zinc-500">PNG, JPEG, WebP, TIFF — up to 15MB</p>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mt-3 p-2.5 rounded-lg bg-red-400/10 border border-red-400/20">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="mt-3 space-y-3 flex-1 overflow-y-auto ava-scrollbar">
          {/* Status header */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
            {statusIcon[result.status]}
            <div className="flex-1">
              <p className={cn('text-sm font-medium', statusLabel[result.status].color)}>
                {statusLabel[result.status].text}
              </p>
              {fileName && (
                <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                  <FileImage size={10} /> {fileName}
                </p>
              )}
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-lg bg-zinc-800/30 border border-zinc-700/30">
              <p className="text-[10px] text-zinc-500 uppercase">Dimensions</p>
              <p className="text-sm text-zinc-200">{result.width} x {result.height}px</p>
            </div>
            <div className="p-2.5 rounded-lg bg-zinc-800/30 border border-zinc-700/30">
              <p className="text-[10px] text-zinc-500 uppercase">Est. DPI</p>
              <p className={cn('text-sm', result.estimatedDPI >= 300 ? 'text-emerald-400' : result.estimatedDPI >= 150 ? 'text-amber-400' : 'text-red-400')}>
                {result.estimatedDPI}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-zinc-800/30 border border-zinc-700/30">
              <p className="text-[10px] text-zinc-500 uppercase">Format</p>
              <p className="text-sm text-zinc-200">{result.format.toUpperCase()}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-zinc-800/30 border border-zinc-700/30">
              <p className="text-[10px] text-zinc-500 uppercase">Transparency</p>
              <p className={cn('text-sm', result.hasAlpha ? 'text-emerald-400' : 'text-amber-400')}>
                {result.hasAlpha ? 'Yes' : 'No'}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-zinc-800/30 border border-zinc-700/30 col-span-2">
              <p className="text-[10px] text-zinc-500 uppercase">File Size</p>
              <p className="text-sm text-zinc-200">{formatBytes(result.fileSize)}</p>
            </div>
          </div>

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Notes</p>
              {result.warnings.map((w, i) => (
                <div
                  key={i}
                  className={cn('px-2.5 py-2 rounded-lg border text-xs', warningColors[w.level])}
                >
                  {w.message}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

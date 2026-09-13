import React from 'react';
import { AlertTriangle, Database, RefreshCw } from 'lucide-react';
import { Button } from '../common/Button';

interface AdminDataStateProps {
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

export const AdminDataState: React.FC<AdminDataStateProps> = ({
  loading,
  error,
  onRetry,
  empty,
  emptyTitle = 'Belum ada data operasional',
  emptyDescription = 'Tambahkan data pertama untuk mulai menjalankan operasional.',
}) => {
  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-gray-200 bg-white" role="status">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <RefreshCw className="h-6 w-6 animate-spin text-brand-blue" />
          <span className="text-xs font-semibold">Memuat data operasional langsung...</span>
        </div>
      </div>
    );
  }

  if (error) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan saat membaca data operasional.';
    return (
      <div className="rounded-lg border border-red-200 bg-white p-6 sm:p-8" role="alert">
        <div className="flex max-w-2xl items-start gap-4">
          <div className="rounded-md bg-red-50 p-2.5 text-red-600"><AlertTriangle className="h-5 w-5" /></div>
          <div>
            <h2 className="font-display text-lg font-bold text-dark">Data operasional tidak tersedia</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">{message}</p>
            <p className="mt-2 text-xs text-gray-400">Tidak ada data contoh yang ditampilkan sebagai pengganti.</p>
            {onRetry && (
              <Button variant="secondary" size="sm" className="mt-5" onClick={onRetry}>
                <RefreshCw className="h-3.5 w-3.5" /> Coba lagi
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (empty) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white px-6 text-center">
        <Database className="h-7 w-7 text-gray-300" />
        <h2 className="mt-4 font-display text-base font-bold text-dark">{emptyTitle}</h2>
        <p className="mt-1 max-w-md text-sm text-gray-500">{emptyDescription}</p>
      </div>
    );
  }

  return null;
};

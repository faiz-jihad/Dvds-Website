import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export const StoreDataState: React.FC<{ loading?: boolean; error?: unknown; retry?: () => void }> = ({ loading, error, retry }) => {
  if (loading) return <div className="flex min-h-[55vh] items-center justify-center" role="status"><RefreshCw className="h-6 w-6 animate-spin text-brand-blue" /><span className="sr-only">Loading live store data</span></div>;
  if (!error) return null;
  return (
    <div className="mx-auto flex min-h-[55vh] max-w-xl flex-col items-center justify-center px-6 text-center" role="alert">
      <div className="rounded-full bg-amber-50 p-3 text-amber-600"><AlertTriangle className="h-6 w-6" /></div>
      <h1 className="mt-4 font-display text-2xl font-bold text-dark">Store data is temporarily unavailable</h1>
      <p className="mt-2 text-sm leading-relaxed text-gray-500">{error instanceof Error ? error.message : 'Please try again shortly.'}</p>
      {retry && <Button variant="secondary" className="mt-6" onClick={retry}><RefreshCw className="h-4 w-4" /> Try again</Button>}
    </div>
  );
};

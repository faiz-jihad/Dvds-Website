import React from 'react';
import { AlertTriangle, Database, RefreshCw } from 'lucide-react';
import { Button } from '../common/Button';
import { AdminBackendError } from '../../lib/adminApi';

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
  emptyTitle = 'No operational data found',
  emptyDescription = 'Add your first record to begin managing operations.',
}) => {
  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-gray-200 bg-white" role="status">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <RefreshCw className="h-6 w-6 animate-spin text-brand-blue" />
          <span className="text-xs font-semibold">Loading live store data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    const isSchemaInit = error instanceof AdminBackendError && error.code === 'SCHEMA_NOT_READY';
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 sm:p-8 shadow-xs" role="alert">
        <div className="flex max-w-2xl items-start gap-4">
          <div className="rounded-lg bg-blue-50 p-3 text-brand-blue">
            <Database className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-lg font-bold text-dark">
              {isSchemaInit ? 'Database Schema Initialisation Required' : 'Unable to Load Operational Data'}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
              {isSchemaInit
                ? (error as Error).message
                : error instanceof Error ? error.message : 'A connection error occurred while reaching store services. Please try again shortly.'}
            </p>
            {isSchemaInit && (
              <div className="mt-3 rounded-md bg-gray-50 border border-gray-200 p-3 text-xs text-gray-600">
                <span className="font-semibold text-dark block mb-1">Quick Setup Guide:</span>
                <span>Apply all pending migrations in order from (<code className="font-mono text-brand-blue bg-white px-1 py-0.5 rounded border border-gray-200">supabase/migrations</code>) in your Supabase SQL Editor to enable all store features.</span>
              </div>
            )}
            {onRetry && (
              <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
                <RefreshCw className="h-3.5 w-3.5" /> Check Connection
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

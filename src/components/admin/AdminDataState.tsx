import React from 'react';
import { Database, Download, RefreshCw } from 'lucide-react';
import { Button } from '../common/Button';
import { AdminBackendError } from '../../lib/adminApi';
import adminSchemaRepairUrl from '../../../supabase/repair_admin_schema.sql?url';

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
              {isSchemaInit ? 'Database update required for this feature' : 'Unable to Load Operational Data'}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
              {isSchemaInit
                ? (error as Error).message
                : error instanceof Error ? error.message : 'A connection error occurred while reaching store services. Please try again shortly.'}
            </p>
            {isSchemaInit && (
              <div className="mt-3 rounded-md bg-gray-50 border border-gray-200 p-3 text-xs text-gray-600">
                <span className="font-semibold text-dark block mb-2">Missing database components</span>
                {error.details.length > 0 && <ul className="list-disc pl-4 space-y-1 break-words mb-3">
                  {error.details.map((detail) => <li key={detail}>{detail}</li>)}
                </ul>}
                <p>The payment and user-access update can be installed with the repair SQL below. Open your connected project in the Supabase SQL Editor, run the complete file, then recheck this page. Your existing products, users and orders are preserved.</p>
                <p className="mt-2">For other missing components, apply the corresponding pending files in <code>supabase/migrations</code>. Other admin pages remain accessible.</p>
                <a href={adminSchemaRepairUrl} download="repair_admin_schema.sql" className="mt-3 inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 font-semibold text-brand-blue hover:bg-blue-50">
                  <Download className="h-3.5 w-3.5" /> Download repair SQL
                </a>
              </div>
            )}
            {onRetry && (
              <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
                <RefreshCw className="h-3.5 w-3.5" /> {isSchemaInit ? 'Recheck database' : 'Try again'}
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

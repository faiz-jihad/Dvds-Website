import React from 'react';
import { AlertTriangle, RefreshCw, LogIn, UserPlus, Lock } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from './Button';

export const StoreDataState: React.FC<{
  loading?: boolean;
  error?: unknown;
  retry?: () => void;
}> = ({ loading, error, retry }) => {
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center" role="status">
        <RefreshCw className="h-6 w-6 animate-spin text-brand-blue" />
        <span className="sr-only">Loading live store data</span>
      </div>
    );
  }

  if (!error) return null;

  const errorMessage = error instanceof Error ? error.message : 'Please try again shortly.';
  const isAuthError =
    typeof errorMessage === 'string' &&
    (errorMessage.toLowerCase().includes('sign in') ||
      errorMessage.toLowerCase().includes('authenticated') ||
      errorMessage.toLowerCase().includes('not logged in') ||
      errorMessage.toLowerCase().includes('unauthorized') ||
      errorMessage.toLowerCase().includes('jwt'));

  if (isAuthError) {
    return (
      <div className="mx-auto flex min-h-[40vh] max-w-md flex-col items-center justify-center px-6 py-10 text-center" role="alert">
        <h2 className="font-display text-2xl font-bold text-dark tracking-tight">
          Sign In Required
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-gray-500 leading-relaxed max-w-sm">
          Please sign in to access your personal profile details, order history, and saved addresses.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
          <Link
            to="/login"
            state={{ from: location.pathname }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-brand-blue hover:bg-brand-blue/90 text-white text-xs font-semibold transition-colors shadow-xs"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In</span>
          </Link>
          <Link
            to="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-dark text-xs font-semibold transition-colors shadow-xs"
          >
            <UserPlus className="w-4 h-4 text-gray-500" />
            <span>Create Account</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[45vh] max-w-xl flex-col items-center justify-center px-6 text-center" role="alert">
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-amber-700">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h2 className="mt-4 font-display text-2xl font-bold text-dark">Data temporarily unavailable</h2>
      <p className="mt-2 text-sm leading-relaxed text-gray-500">{errorMessage}</p>
      {retry && (
        <Button variant="secondary" className="mt-6" onClick={retry}>
          <RefreshCw className="h-4 w-4" /> Try again
        </Button>
      )}
    </div>
  );
};

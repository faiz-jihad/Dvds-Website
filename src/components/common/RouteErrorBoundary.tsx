import React, { useEffect } from 'react';
import { useRouteError, Link } from 'react-router-dom';
import { Button } from './Button';
import { RefreshCw, Home } from 'lucide-react';

export const RouteErrorBoundary: React.FC = () => {
  const error = useRouteError() as Error | undefined;

  useEffect(() => {
    const isChunkError =
      error?.message &&
      (error.message.includes('dynamically imported module') ||
        error.message.includes('Loading chunk') ||
        error.message.includes('Failed to fetch'));

    if (isChunkError && typeof window !== 'undefined') {
      const lastReload = sessionStorage.getItem('last_chunk_reload');
      const now = Date.now();
      // Guard against infinite reload loops: only auto-reload once every 10 seconds
      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        sessionStorage.setItem('last_chunk_reload', now.toString());
        window.location.reload();
      }
    }
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6 py-16 bg-white text-dark">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-brand-blue-soft text-brand-blue flex items-center justify-center mx-auto">
          <RefreshCw className="w-8 h-8 animate-spin-slow" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono uppercase tracking-widest text-brand-blue">
            AZ Rayan DVDs • Archive
          </span>
          <h1 className="font-display font-bold text-3xl text-dark">
            Something unexpected occurred
          </h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            We encountered a temporary hiccup while loading this film collection. Please refresh or return to the main catalogue.
          </p>
          {error?.message && (
            <div className="mt-3 p-3 bg-gray-50 rounded-sm border border-gray-200 text-xs font-mono text-gray-500 text-left overflow-x-auto">
              {error.message}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            variant="primary"
            size="md"
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reload Page</span>
          </Button>

          <Link to="/" className="w-full sm:w-auto">
            <Button variant="outline" size="md" className="w-full sm:w-auto gap-2">
              <Home className="w-4 h-4" />
              <span>Return to Storefront</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

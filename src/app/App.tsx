import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from './routes';
import { AdminAuthProvider } from '../auth/AdminAuth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 mins
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminAuthProvider>
        <React.Suspense
          fallback={(
            <div className="min-h-screen bg-white flex items-center justify-center" role="status">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-brand-blue" />
              <span className="sr-only">Loading page</span>
            </div>
          )}
        >
          <RouterProvider router={router} />
        </React.Suspense>
      </AdminAuthProvider>
    </QueryClientProvider>
  );
};

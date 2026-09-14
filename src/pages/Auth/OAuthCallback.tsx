import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

/**
 * OAuthCallback – handles the redirect after Google OAuth.
 * Supabase redirects to /auth/callback with the session tokens in the URL hash.
 * We read the intended destination from sessionStorage and navigate there.
 */
export const OAuthCallback: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Give Supabase JS client time to process the hash fragment and set the session
    const processCallback = async () => {
      try {
        // supabase.auth.getSession() will internally process the #access_token hash
        if (supabase) {
          await supabase.auth.getSession();
        }
      } catch {
        // ignore – onAuthStateChange in CustomerAuth will handle session
      }

      // Read stored destination, default to /account
      const redirectPath = sessionStorage.getItem('oauth_redirect_path') || '/account';
      sessionStorage.removeItem('oauth_redirect_path');
      navigate(redirectPath, { replace: true });
    };

    processCallback();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
        <p className="text-sm font-medium text-gray-600">Signing you in…</p>
      </div>
    </div>
  );
};

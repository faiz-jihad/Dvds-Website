import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

/**
 * OAuthCallback – handles redirect after OAuth (Google, etc.).
 * Supabase returns session tokens either in the URL hash fragment (#access_token=...)
 * or in query parameters (?code=... for PKCE).
 * We process the session, ensure it is stored, and navigate to the intended destination.
 */
export const OAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const processCallback = async () => {
      try {
        // 1. Check for errors returned in query string or hash fragment
        const searchParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));

        const errorDesc =
          hashParams.get('error_description') ||
          searchParams.get('error_description') ||
          hashParams.get('error') ||
          searchParams.get('error');

        if (errorDesc) {
          const readableError = decodeURIComponent(errorDesc.replace(/\+/g, ' '));
          console.warn('[OAuthCallback] Authentication error:', readableError);
          if (isMounted) setErrorMessage(readableError);
          setTimeout(() => {
            if (isMounted) navigate('/login', { replace: true });
          }, 3500);
          return;
        }

        // 2. Exchange code if using PKCE flow
        const code = searchParams.get('code');
        if (code && supabase) {
          await supabase.auth.exchangeCodeForSession(window.location.href);
        } else if (supabase) {
          // 3. For implicit hash flow (#access_token=...), getSession() triggers token extraction
          const { data: { session } } = await supabase.auth.getSession();

          if (!session) {
            const authClient = supabase;
            // Wait up to 1.5 seconds for onAuthStateChange to establish the session
            await new Promise<void>((resolve) => {
              const { data: authListener } = authClient.auth.onAuthStateChange((event, newSession) => {
                if (newSession || event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                  authListener.subscription.unsubscribe();
                  resolve();
                }
              });
              setTimeout(() => {
                authListener.subscription.unsubscribe();
                resolve();
              }, 1500);
            });
          }
        }
      } catch (err: any) {
        console.warn('[OAuthCallback] Callback parsing encountered an issue:', err);
      }

      if (!isMounted) return;

      // 4. Retrieve intended redirect destination, default to /account
      const redirectPath = sessionStorage.getItem('oauth_redirect_path') || '/account';
      sessionStorage.removeItem('oauth_redirect_path');

      // Navigate to destination
      navigate(redirectPath, { replace: true });
    };

    processCallback();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50/50 px-4">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm p-8 bg-white rounded-2xl border border-gray-100 shadow-sm">
        {errorMessage ? (
          <div className="space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-red-50 text-red-600 flex items-center justify-center font-bold text-lg">
              !
            </div>
            <h2 className="text-base font-bold text-dark">Sign In Unsuccessful</h2>
            <p className="text-xs text-gray-500 leading-relaxed">{errorMessage}</p>
            <p className="text-[11px] text-gray-400 font-medium">Redirecting to login…</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="h-10 w-10 mx-auto animate-spin rounded-full border-3 border-gray-200 border-t-brand-blue" />
            <h2 className="text-base font-bold text-dark">Signing you in…</h2>
            <p className="text-xs text-gray-500">Connecting your Google account and verifying security credentials.</p>
          </div>
        )}
      </div>
    </div>
  );
};

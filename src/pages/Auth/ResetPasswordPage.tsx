import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LockKeyhole, Eye, EyeOff, ArrowRight, Sun, Moon, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { useCustomerAuth } from '../../auth/CustomerAuth';
import { useThemeStore } from '../../stores/useThemeStore';
import { useUiStore } from '../../stores/useUiStore';
import { Seo } from '../../components/common/Seo';
import { supabase } from '../../lib/supabase';

export const ResetPasswordPage: React.FC = () => {
  const { updatePassword } = useCustomerAuth();
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const addToast = useUiStore((state) => state.addToast);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isVerifyingSession, setIsVerifyingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // Check if recovery session or access token is present
    const verifyRecoverySession = async () => {
      try {
        if (!supabase) {
          if (isMounted) setIsVerifyingSession(false);
          return;
        }

        // 1. Check for error description in query or hash (e.g. otp_expired, access_denied)
        const searchParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const errorDesc = searchParams.get('error_description') || hashParams.get('error_description');
        const errorCode = searchParams.get('error_code') || hashParams.get('error_code');

        if (errorDesc || errorCode) {
          if (isMounted) {
            setHasValidSession(false);
            setIsVerifyingSession(false);
          }
          return;
        }

        // 2. PKCE code exchange if redirected with ?code=...
        const code = searchParams.get('code');
        if (code) {
          try {
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);
            if (!error && data?.session) {
              if (isMounted) {
                setHasValidSession(true);
                setIsVerifyingSession(false);
              }
              return;
            }
          } catch (codeErr) {
            console.warn('[ResetPasswordPage] PKCE exchange notice:', codeErr);
          }
        }

        // 3. Existing active session check
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          if (isMounted) {
            setHasValidSession(true);
            setIsVerifyingSession(false);
          }
          return;
        }

        // 4. Listen for recovery state change
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
          if (!isMounted) return;
          if (event === 'PASSWORD_RECOVERY' || (session && event === 'SIGNED_IN')) {
            setHasValidSession(true);
            setIsVerifyingSession(false);
          }
        });

        // Timeout fallback after 3 seconds
        setTimeout(() => {
          if (isMounted) {
            setIsVerifyingSession(false);
          }
        }, 3000);

        return () => {
          authListener?.subscription?.unsubscribe();
        };
      } catch (err) {
        if (isMounted) setIsVerifyingSession(false);
      }
    };

    verifyRecoverySession();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await updatePassword(password);
      if (res.success) {
        setSuccess(true);
        addToast('Password successfully updated!', 'success');
        setTimeout(() => {
          navigate('/account', { replace: true });
        }, 3000);
      } else {
        setError(res.message || 'Unable to update password. Your recovery link may have expired.');
      }
    } catch (err: any) {
      setError(err?.message || 'An error occurred while updating your password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#F8FAFC] dark:bg-[#07090E] text-dark dark:text-white transition-colors duration-200">
      <Seo
        title="Set New Password — DVDs Zone UK"
        description="Choose a new secure password for your DVDs Zone account."
        canonicalPath="/reset-password"
        noIndex={true}
        siteName="DVDs Zone"
      />
      <div className="max-w-md w-full">
        {/* Header link & theme toggle */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-dark dark:hover:text-white transition-colors"
          >
            <span>Return to Sign In</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs text-gray-400 dark:text-gray-500 font-medium">
              Create New Password
            </span>
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#141A26] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors shadow-2xs cursor-pointer"
              title={isDark ? "Switch to Light theme" : "Switch to Dark theme"}
              aria-label="Toggle color theme"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-[#0E131F] rounded-xl p-5 sm:p-8 md:p-10 border border-gray-200 dark:border-white/10 shadow-xs text-dark dark:text-white">
          <div className="text-center mb-8">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-dark dark:text-white tracking-tight">
              Set New Password
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              Please enter and confirm your new password below.
            </p>
          </div>

          {success ? (
            <div className="space-y-6 text-center">
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm leading-relaxed">
                <div className="flex items-center justify-center gap-2 font-bold mb-1.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Password Reset Successful</span>
                </div>
                Your password has been changed securely. You will now be redirected to your account.
              </div>

              <div className="pt-2">
                <Link
                  to="/account"
                  className="w-full h-11 rounded-xl bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <span>Go to My Account</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : isVerifyingSession ? (
            <div className="py-8 text-center text-xs text-gray-500 dark:text-gray-400">
              Verifying your recovery link...
            </div>
          ) : !hasValidSession ? (
            <div className="space-y-4 text-center">
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 text-xs sm:text-sm leading-relaxed">
                <div className="flex items-center justify-center gap-2 font-bold mb-1.5">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Session Expired or Missing</span>
                </div>
                The recovery link may have expired or already been used. Please request a new link to reset your password.
              </div>

              <Link
                to="/forgot-password"
                className="w-full h-11 rounded-xl bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <span>Request New Reset Link</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 dark:text-gray-500">
                    <LockKeyhole className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    placeholder="Minimum 6 characters"
                    className="h-11 w-full rounded-lg border border-gray-300 dark:border-white/15 bg-white dark:bg-[#141A26] pl-10 pr-11 text-sm text-dark dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none transition focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-gray-400 hover:text-dark dark:hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 dark:text-gray-500">
                    <LockKeyhole className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    placeholder="Repeat your new password"
                    className="h-11 w-full rounded-lg border border-gray-300 dark:border-white/15 bg-white dark:bg-[#141A26] pl-10 pr-11 text-sm text-dark dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none transition focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !password || !confirmPassword}
                className="w-full h-11 mt-2 rounded-xl bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold text-sm transition-colors active:scale-[0.99] disabled:opacity-70 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                {submitting ? (
                  <span>Updating Password...</span>
                ) : (
                  <>
                    <span>Save New Password</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

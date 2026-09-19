import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, LockKeyhole, Eye, EyeOff, ArrowRight, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useCustomerAuth } from '../../auth/CustomerAuth';
import { useUiStore } from '../../stores/useUiStore';
import { sanitizeRedirectPath } from '../../lib/utils';

export const LoginPage: React.FC = () => {
  const { login, loginWithGoogle, customer } = useCustomerAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const addToast = useUiStore((state) => state.addToast);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  const searchParams = new URLSearchParams(location.search);
  const redirectParam = searchParams.get('redirect');
  const rawFrom = (location.state as { from?: string } | null)?.from || redirectParam || '/account';
  const from = sanitizeRedirectPath(rawFrom, '/account');
  const isCheckoutRedirect = from.startsWith('/checkout');

  // Handle brute-force cooldown timer
  React.useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timer = setInterval(() => {
      setCooldownRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  // If already logged in, redirect
  React.useEffect(() => {
    if (customer) {
      navigate(from, { replace: true });
    }
  }, [customer, from, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldownRemaining > 0) {
      setError(`Too many login attempts. Please wait ${cooldownRemaining}s before trying again.`);
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const res = await login(email, password);
      if (res.success) {
        setFailedAttempts(0);
        addToast('Welcome back to DVDs Zone!', 'success');
        navigate(from, { replace: true });
      } else {
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        if (nextAttempts >= 5) {
          setCooldownRemaining(30);
          setError('Too many failed attempts. For your security, please wait 30 seconds.');
        } else {
          // Generic authentication error prevents account enumeration
          setError('Invalid email or password. Please verify your details.');
        }
      }
    } catch (err: any) {
      setError('An error occurred during authentication. Please retry.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleSubmitting(true);
    try {
      const res = await loginWithGoogle(from);
      if (res.success) {
        addToast('Redirecting to Google...', 'info');
      } else if (res.message) {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err?.message || 'Google authentication failed.');
    } finally {
      setGoogleSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#F8FAFC] dark:bg-[#07090E] text-dark dark:text-white transition-colors duration-200">
      <div className="max-w-md w-full">
        {/* Header link */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-dark dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Store</span>
          </Link>
          <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
            Secure Account Access
          </span>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-[#0E131F] rounded-xl p-5 sm:p-8 md:p-10 border border-gray-200 dark:border-white/10 shadow-xs text-dark dark:text-white">

          <div className="text-center mb-8">
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-dark dark:text-white tracking-tight">
              Customer Sign In
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              Access your order history, delivery tracking, and saved wishlist.
            </p>
          </div>

          {/* Error notice */}
          {error && (
            <div className="mb-6 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 p-3 text-xs text-red-700 dark:text-red-300 leading-relaxed" role="alert">
              {error}
            </div>
          )}

          {/* Checkout Redirect Notice */}
          {isCheckoutRedirect && (
            <div className="mb-6 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/90 dark:bg-blue-950/30 p-4 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-3 shadow-xs">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/50 text-brand-blue dark:text-blue-300 rounded-lg shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-blue-950 dark:text-blue-100 text-sm">Sign in to complete checkout</p>
                <p className="text-blue-800/80 dark:text-blue-300 mt-1 leading-relaxed">
                  Please sign in or create an account to proceed with your order, access saved delivery addresses, and track delivery securely.
                </p>
              </div>
            </div>
          )}

          {/* Email / Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 dark:text-gray-500">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                  placeholder="e.g. name@example.co.uk"
                  className="h-11 w-full rounded-lg border border-gray-300 dark:border-white/15 bg-white dark:bg-[#141A26] pl-10 pr-4 text-sm text-dark dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none transition focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 dark:text-gray-500">
                  <LockKeyhole className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
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

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 mt-2 rounded-xl bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold text-sm transition-colors active:scale-[0.99] disabled:opacity-70 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              {submitting ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In to Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wider">
              <span className="bg-white dark:bg-[#0E131F] px-3 text-gray-400 dark:text-gray-500 font-medium">Or continue with</span>
            </div>
          </div>

          {/* Google OAuth Button below actual login button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleSubmitting || submitting}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-gray-300 dark:border-white/15 bg-white dark:bg-[#141A26] hover:bg-gray-50 dark:hover:bg-white/10 text-dark dark:text-white text-sm font-semibold shadow-xs transition cursor-pointer disabled:opacity-60"
          >
            {/* Google SVG Icon */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{googleSubmitting ? 'Connecting Google...' : 'Continue with Google'}</span>
          </button>

          {/* Footer note */}
          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-white/10 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              New customer?{' '}
              <Link
                to={from !== '/account' ? `/register?redirect=${encodeURIComponent(from)}` : '/register'}
                state={{ from }}
                className="font-bold text-brand-blue dark:text-blue-400 hover:underline"
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>

        {/* Staff portal link */}
        <div className="mt-6 text-center">
          <Link to="/admin/login" className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition">
            Store Staff &amp; Administrators: Go to Backoffice →
          </Link>
        </div>
      </div>
    </div>
  );
};

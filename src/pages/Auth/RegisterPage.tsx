import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, LockKeyhole, Eye, EyeOff, User, ArrowRight, ShieldCheck, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useCustomerAuth } from '../../auth/CustomerAuth';
import { useUiStore } from '../../stores/useUiStore';

export const RegisterPage: React.FC = () => {
  const { register, loginWithGoogle, customer } = useCustomerAuth();
  const navigate = useNavigate();
  const addToast = useUiStore((state) => state.addToast);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [error, setError] = useState('');

  // If already logged in, redirect
  React.useEffect(() => {
    if (customer) {
      navigate('/account', { replace: true });
    }
  }, [customer, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await register(email, password, fullName);
      if (res.success) {
        addToast('Account created successfully! Welcome to AZ Rayan DVDs.', 'success');
        navigate('/account', { replace: true });
      } else {
        setError(res.message || 'Registration could not be completed.');
      }
    } catch (err: any) {
      setError(err?.message || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleSubmitting(true);
    try {
      const res = await loginWithGoogle('/account');
      if (res.success) {
        addToast('Account registered with Google', 'success');
        navigate('/account', { replace: true });
      } else if (res.message) {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err?.message || 'Google registration failed.');
    } finally {
      setGoogleSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50/70">
      <div className="max-w-md w-full">
        {/* Header link */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-dark transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Store</span>
          </Link>
          <span className="text-xs text-gray-400 font-medium">
            Secure Registration
          </span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl p-5 sm:p-8 md:p-10 border border-gray-200 shadow-xs">

          <div className="text-center mb-8">
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-dark tracking-tight">
              Create Customer Account
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-gray-500">
              Join the collector community for seamless tracking & member benefits.
            </p>
          </div>

          {/* Member perks row */}
          <div className="mb-6 grid grid-cols-3 gap-2 bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
            <div className="text-[10px] text-gray-600">
              <span className="block font-bold text-dark text-xs">Royal Mail</span>
              Live Tracking
            </div>
            <div className="text-[10px] text-gray-600 border-x border-gray-200">
              <span className="block font-bold text-dark text-xs">Wishlist</span>
              Save Editions
            </div>
            <div className="text-[10px] text-gray-600">
              <span className="block font-bold text-dark text-xs">Fast Checkout</span>
              Saved Address
            </div>
          </div>

          {/* Error notice */}
          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 leading-relaxed" role="alert">
              {error}
            </div>
          )}

          {/* Google OAuth Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleSubmitting || submitting}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-dark text-sm font-semibold shadow-xs transition cursor-pointer disabled:opacity-60"
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
            <span>{googleSubmitting ? 'Connecting Google...' : 'Sign up with Google'}</span>
          </button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wider">
              <span className="bg-white px-3 text-gray-400 font-medium">Or register with email</span>
            </div>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="e.g. Oliver Clarke"
                  className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 text-sm text-dark placeholder-gray-400 outline-none transition focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                  placeholder="e.g. oliver.clarke@example.co.uk"
                  className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 text-sm text-dark placeholder-gray-400 outline-none transition focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                  <LockKeyhole className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                  className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-11 text-sm text-dark placeholder-gray-400 outline-none transition focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-gray-400 hover:text-dark cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                  <LockKeyhole className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                  className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 text-sm text-dark placeholder-gray-400 outline-none transition focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 mt-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-all active:scale-[0.99] disabled:opacity-70 flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <span>Creating Account...</span>
              ) : (
                <>
                  <span>Create Collector Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-brand-blue hover:underline">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

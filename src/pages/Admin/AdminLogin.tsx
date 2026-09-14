import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Lock, Mail, AlertCircle } from 'lucide-react';
import { useAdminAuth } from '../../auth/AdminAuth';

export const AdminLogin: React.FC = () => {
  const { user, isLoading, login } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from || '/admin';

  useEffect(() => {
    if (!isLoading && user) navigate(from, { replace: true });
  }, [from, isLoading, navigate, user]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    const result = await login(email, password, remember);
    setSubmitting(false);
    if (result.success) navigate(from, { replace: true });
    else setError(result.message);
  };

  return (
    <main className="min-h-screen bg-white grid lg:grid-cols-2">
      {/* Left Column: Natural Photography Background, Clean & Editorial */}
      <section className="relative hidden lg:flex flex-col justify-between p-12 xl:p-16 bg-[#0f172a] text-white">
        {/* Background photo */}
        <img
          src="https://res.cloudinary.com/lsrzjokx/image/upload/v1789363111/ChatGPT_Image_14_Sep_2026_12.18.13.png"
          alt="Physical Media Archive"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />

        {/* Clean solid dark overlay for high contrast and legibility */}
        <div className="absolute inset-0 bg-[#0a0f18]/75" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-white px-2.5 py-1 rounded shadow-xs">
            <img src="/brand/logo.png" alt="AZ Rayan LTD" className="h-7 w-auto object-contain" />
          </div>
          <span className="h-5 w-px bg-white/20" />
          <span className="text-xs font-mono uppercase tracking-widest text-gray-300">
            Store Backoffice
          </span>
        </div>

        {/* Headline & Description */}
        <div className="relative z-10 max-w-lg my-auto py-12">
          <h1 className="font-display text-4xl xl:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Manage your store with confidence.
          </h1>
          <p className="mt-5 text-base text-gray-300 leading-relaxed font-normal">
            Curate DVD editions, oversee order fulfillment, track inventory, and review customer activity from one focused workspace.
          </p>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-gray-400">
          <span>AZ Rayan Ltd (No. 13894195) • Birmingham, UK</span>
        </div>
      </section>

      {/* Right Column: Ultra Clean, Solid & Professional Form */}
      <section className="flex min-h-screen items-center justify-center p-4 sm:p-8 md:p-12 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Back link */}
          <div className="mb-6">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-dark transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to storefront</span>
            </Link>
          </div>

          {/* Clean Login Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-8 md:p-10 shadow-xs">
            <div className="mb-6">
              <h2 className="font-display text-2xl font-bold text-dark tracking-tight">
                Admin Sign In
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Enter your credentials to access the management backoffice.
              </p>

              <div className="mt-4 p-3 rounded-lg bg-blue-50/80 border border-blue-200/70 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-blue-950 block text-[11px]">Default Admin Credentials:</span>
                  <span className="font-mono text-[11px] text-blue-800">admin@azrayan.co.uk • Admin123!</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('admin@azrayan.co.uk');
                    setPassword('Admin123!');
                  }}
                  className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium text-[11px] transition-colors cursor-pointer"
                >
                  Auto-fill
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div
                className="mb-6 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 leading-relaxed"
                role="alert"
              >
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Address */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="name@azrayan.co.uk"
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-dark placeholder-gray-400 outline-none transition focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-700">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-10 text-sm text-dark placeholder-gray-400 outline-none transition focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-gray-400 hover:text-dark transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="pt-1">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-600 select-none">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue cursor-pointer"
                  />
                  <span>Keep signed in on this device</span>
                </label>
              </div>

              {/* Solid Submit Button - No Gradient */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-10 mt-2 rounded-lg bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold text-sm transition-colors active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                {submitting ? 'Verifying credentials...' : 'Sign In'}
              </button>
            </form>
          </div>

          {/* Simple Clean Footer */}
          <div className="mt-8 text-center text-xs text-gray-400">
            <p>Authorised store personnel only.</p>
          </div>
        </div>
      </section>
    </main>
  );
};

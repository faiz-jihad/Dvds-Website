import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD, useAdminAuth } from '../../auth/AdminAuth';

export const AdminLogin: React.FC = () => {
  const { user, isLoading, isDemoMode, login } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(isDemoMode ? DEMO_ADMIN_EMAIL : '');
  const [password, setPassword] = useState(isDemoMode ? DEMO_ADMIN_PASSWORD : '');
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
    <main className="min-h-screen bg-[#f4f5f7] grid lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden lg:flex overflow-hidden bg-[#0d1726] p-12 text-white flex-col justify-between">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,#1769e0_0,transparent_38%)]" />
        <div className="relative flex items-center gap-3">
          <div className="bg-white px-2.5 py-1 rounded-sm shadow-xs">
            <img src="/brand/logo.png" alt="AZ Rayan LTD" className="h-8 w-auto object-contain" />
          </div>
          <span className="h-6 w-px bg-white/20" />
          <span className="text-xs uppercase tracking-[0.22em] text-white/60">Backoffice</span>
        </div>

        <div className="relative max-w-xl">
          <div className="mb-7 inline-flex h-12 w-12 items-center justify-center rounded-lg border border-white/15 bg-white/10">
            <ShieldCheck className="h-6 w-6 text-blue-300" />
          </div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-blue-300">Secure store operations</p>
          <h1 className="font-display text-5xl font-extrabold leading-[1.06] tracking-tight">
            Your store,<br />under control.
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-slate-300">
            Manage products, fulfil orders, monitor stock, and review revenue from one focused workspace.
          </p>
        </div>

        <div className="relative flex items-center gap-3 text-xs text-white/50">
          <LockKeyhole className="h-4 w-4" />
          <span>Protected access • Role-based permissions • Encrypted session</span>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-10 inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition-colors hover:text-dark">
            <ArrowLeft className="h-4 w-4" />
            Back to storefront
          </Link>

          <div className="mb-8 lg:hidden">
            <img src="/brand/logo-transparent.png" alt="AZ Rayan LTD" className="h-10 w-auto object-contain" />
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,.08)] sm:p-9">
            <div className="mb-7">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-brand-blue-soft text-brand-blue">
                <LockKeyhole className="h-5 w-5" />
              </div>
              <h2 className="font-display text-2xl font-extrabold tracking-tight text-dark">Admin sign in</h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">Use your authorised staff account to continue.</p>
            </div>

            {error && (
              <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-600">Email address</span>
                <input
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="h-12 w-full rounded-md border border-gray-300 bg-white px-4 text-sm text-dark outline-none transition focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10"
                  placeholder="you@company.co.uk"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-600">Password</span>
                <span className="relative block">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    className="h-12 w-full rounded-md border border-gray-300 bg-white px-4 pr-12 text-sm text-dark outline-none transition focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-gray-400 transition hover:text-dark"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </span>
              </label>

              <label className="flex cursor-pointer items-center gap-3 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 accent-brand-blue"
                />
                Keep me signed in on this device
              </label>

              <Button type="submit" size="lg" className="w-full" isLoading={submitting}>
                Sign in to backoffice
              </Button>
            </form>

            {isDemoMode && (
              <div className="mt-6 rounded-md border border-blue-100 bg-brand-blue-soft/60 p-4 text-xs leading-relaxed text-gray-600">
                <strong className="block text-dark">Preview credentials</strong>
                <span>{DEMO_ADMIN_EMAIL}</span><br />
                <span>{DEMO_ADMIN_PASSWORD}</span>
              </div>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-gray-400">AZ Rayan DVDs • Authorised personnel only</p>
        </div>
      </section>
    </main>
  );
};

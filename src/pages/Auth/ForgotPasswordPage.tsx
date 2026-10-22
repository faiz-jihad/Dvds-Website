import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, ArrowLeft, Sun, Moon, CheckCircle2, AlertCircle } from 'lucide-react';
import { useCustomerAuth } from '../../auth/CustomerAuth';
import { useThemeStore } from '../../stores/useThemeStore';
import { Seo } from '../../components/common/Seo';

export const ForgotPasswordPage: React.FC = () => {
  const { resetPassword } = useCustomerAuth();
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark';

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sentSuccess, setSentSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await resetPassword(email);
      // Always show generic success state to prevent account enumeration
      setSentSuccess(true);
    } catch {
      // Still show generic success state unless it was an explicit client format failure
      setSentSuccess(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#F8FAFC] dark:bg-[#07090E] text-dark dark:text-white transition-colors duration-200">
      <Seo
        title="Forgot Password — DVDs Zone UK"
        description="Reset your DVDs Zone customer account password. Enter your email to receive a secure recovery link."
        canonicalPath="/forgot-password"
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
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Sign In</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs text-gray-400 dark:text-gray-500 font-medium">
              Account Recovery
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
              <Mail className="w-6 h-6" />
            </div>
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-dark dark:text-white tracking-tight">
              Reset Your Password
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              Enter your registered email address and we'll send you a secure link to reset your password.
            </p>
          </div>

          {sentSuccess ? (
            <div className="space-y-6 text-center">
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm leading-relaxed">
                <div className="flex items-center justify-center gap-2 font-bold mb-1.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Check Your Inbox</span>
                </div>
                If an account exists with <strong className="text-dark dark:text-white">{email}</strong>, we have dispatched a password recovery link. Please check your inbox and spam folder.
              </div>

              <div className="pt-2">
                <Link
                  to="/login"
                  className="w-full h-11 rounded-xl bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <span>Return to Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <button
                type="button"
                onClick={() => setSentSuccess(false)}
                className="text-xs text-gray-500 hover:text-dark dark:hover:text-white transition-colors underline cursor-pointer"
              >
                Didn't receive an email? Send again
              </button>
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
                    autoComplete="email"
                    placeholder="e.g. name@example.co.uk"
                    className="h-11 w-full rounded-lg border border-gray-300 dark:border-white/15 bg-white dark:bg-[#141A26] pl-10 pr-4 text-sm text-dark dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none transition focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !email.trim()}
                className="w-full h-11 mt-2 rounded-xl bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold text-sm transition-colors active:scale-[0.99] disabled:opacity-70 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                {submitting ? (
                  <span>Sending Recovery Link...</span>
                ) : (
                  <>
                    <span>Send Recovery Link</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-3">
                <Link
                  to="/login"
                  className="text-xs font-semibold text-gray-500 hover:text-dark dark:hover:text-white transition-colors"
                >
                  Remember your password? <span className="text-brand-blue underline">Sign In</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

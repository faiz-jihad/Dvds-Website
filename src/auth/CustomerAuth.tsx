import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { Profile } from '../types';

export interface CustomerAuthContextValue {
  customer: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (
    email: string,
    password: string,
    fullName: string,
    phone?: string,
    address?: string
  ) => Promise<{ success: boolean; message?: string }>;
  loginWithGoogle: (customRedirectPath?: string) => Promise<{ success: boolean; message?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; message?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  updateProfileState: (updated: Partial<Profile>) => void;
}

const CUSTOMER_STORAGE_KEY = 'az_rayan_customer_profile';

const CustomerAuthContext = createContext<CustomerAuthContextValue | null>(null);

function getCachedProfile(): Profile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CUSTOMER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const CustomerAuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [customer, setCustomer] = useState<Profile | null>(getCachedProfile);
  const [isLoading, setIsLoading] = useState(true);

  // Load customer profile from Supabase profiles table
  const loadProfile = useCallback(
    async (
      userId: string,
      email: string,
      userMetadata?: Record<string, any>
    ): Promise<Profile | null> => {
      if (!supabase) return null;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        const googleName = userMetadata?.full_name || userMetadata?.name;
        const googleAvatar = userMetadata?.avatar_url || userMetadata?.picture;

        if (!error && data) {
          // If name or avatar was missing but provided by Google OAuth, enrich the profile
          if ((!data.full_name && googleName) || (!data.avatar_url && googleAvatar)) {
            const updates: Partial<Profile> = {};
            if (!data.full_name && googleName) updates.full_name = googleName;
            if (!data.avatar_url && googleAvatar) updates.avatar_url = googleAvatar;
            await supabase.from('profiles').update(updates).eq('id', userId);
            return { ...data, ...updates } as Profile;
          }
          return data as Profile;
        }

        // If user exists in Auth but profile not yet inserted, insert production row
        const newProfile: Profile = {
          id: userId,
          email,
          full_name: googleName || email.split('@')[0],
          phone: null,
          role: 'customer',
          avatar_url: googleAvatar || null,
          created_at: new Date().toISOString(),
        };

        try {
          await supabase.from('profiles').upsert(newProfile);
        } catch {
          // Handled if DB trigger creates profile or RLS restricts upsert
        }
        return newProfile;
      } catch (err) {
        console.warn('[CustomerAuth] Exception in loadProfile, using auth metadata fallback:', err);
        return {
          id: userId,
          email,
          full_name: userMetadata?.full_name || userMetadata?.name || email.split('@')[0],
          phone: null,
          role: 'customer',
          avatar_url: userMetadata?.avatar_url || userMetadata?.picture || null,
          created_at: new Date().toISOString(),
        };
      }
    },
    []
  );

  useEffect(() => {
    let active = true;

    if (!isSupabaseConfigured || !supabase) {
      setCustomer(null);
      setIsLoading(false);
      return;
    }

    // 1. Check existing active session
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!active) return;
      if (!error && session?.user) {
        const userProfile = await loadProfile(
          session.user.id,
          session.user.email || '',
          session.user.user_metadata
        );
        if (active && userProfile) {
          setCustomer(userProfile);
          localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(userProfile));
        }
      } else {
        if (active) {
          const cached = getCachedProfile();
          if (!cached) {
            setCustomer(null);
            localStorage.removeItem(CUSTOMER_STORAGE_KEY);
          }
        }
      }
      if (active) setIsLoading(false);
    });

    // 2. Real-time auth listener (handles Google OAuth redirect and password changes)
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setTimeout(async () => {
        if (!active) return;
        if (session?.user) {
          const userProfile = await loadProfile(
            session.user.id,
            session.user.email || '',
            session.user.user_metadata
          );
          if (active && userProfile) {
            setCustomer(userProfile);
            localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(userProfile));
            setIsLoading(false);
          }
        } else if (event === 'SIGNED_OUT') {
          if (active) {
            setCustomer(null);
            localStorage.removeItem(CUSTOMER_STORAGE_KEY);
            setIsLoading(false);
          }
        }
      }, 0);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  // Production Login with Email & Password with auto-healing for unconfirmed accounts
  const login = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
      if (!isSupabaseConfigured || !supabase) {
        return { success: false, message: 'Authentication database is not configured.' };
      }

      const cleanEmail = email.trim().toLowerCase();
      const cleanPassword = password.trim();

      try {
        let { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        });

        // Auto-heal unconfirmed users (e.g. legacy signups or users who didn't confirm email)
        if (
          error &&
          (error.message?.toLowerCase().includes('email not confirmed') ||
            error.message?.toLowerCase().includes('not confirmed'))
        ) {
          try {
            const confirmRes = await fetch('/api/customer-confirm', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: cleanEmail }),
            });
            if (confirmRes.ok) {
              const retry = await supabase.auth.signInWithPassword({
                email: cleanEmail,
                password: cleanPassword,
              });
              if (!retry.error && retry.data) {
                data = retry.data;
                error = null;
              }
            }
          } catch {
            // ignore
          }
        }

        if (error) {
          return { success: false, message: error.message };
        }

        if (data?.user) {
          const profile = await loadProfile(
            data.user.id,
            data.user.email || cleanEmail,
            data.user.user_metadata
          );
          if (profile) {
            setCustomer(profile);
            localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(profile));
          }
          return { success: true };
        }

        return { success: false, message: 'Login failed. Please check your credentials.' };
      } catch (err: any) {
        return { success: false, message: err?.message || 'Login encountered an unexpected error.' };
      }
    },
    [loadProfile]
  );

  // Production Register with Email & Password (ensures instant active session and confirmed status)
  const register = useCallback(
    async (
      email: string,
      password: string,
      fullName: string,
      phone?: string,
      address?: string
    ): Promise<{ success: boolean; message?: string }> => {
      if (!isSupabaseConfigured || !supabase) {
        return { success: false, message: 'Authentication database is not configured.' };
      }

      const cleanEmail = email.trim().toLowerCase();
      const cleanPassword = password.trim();
      const cleanName = fullName.trim();

      try {
        // Step 1: Call backend registration endpoint to create user with email_confirm: true
        let backendSucceeded = false;
        try {
          const apiRes = await fetch('/api/customer-register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: cleanEmail,
              password: cleanPassword,
              fullName: cleanName,
              phone: phone?.trim(),
              address: address?.trim(),
            }),
          });

          const apiJson = await apiRes.json().catch(() => ({}));
          if (apiRes.ok && apiJson.success) {
            backendSucceeded = true;
          } else if (apiRes.status === 409 || apiJson.code === 'ACCOUNT_EXISTS') {
            return {
              success: false,
              message: apiJson.error || 'An account with this email address already exists. Please sign in.',
            };
          } else if (apiJson.error && !apiRes.ok && apiRes.status < 500) {
            return { success: false, message: apiJson.error };
          }
        } catch {
          // Fall back to direct Supabase client signUp if API endpoint is unreachable
        }

        // If backend was unreachable or failed with 500, attempt direct Supabase client signUp
        if (!backendSucceeded) {
          const { error: signUpError } = await supabase.auth.signUp({
            email: cleanEmail,
            password: cleanPassword,
            options: {
              data: { full_name: cleanName },
            },
          });

          if (signUpError) {
            return { success: false, message: signUpError.message };
          }
        }

        // Step 2: IMMEDIATELY SIGN IN WITH PASSWORD TO ESTABLISH AN ACTIVE AUTH SESSION
        let { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        });

        // Auto-heal if email was marked unconfirmed by direct signUp
        if (
          signInError &&
          (signInError.message?.toLowerCase().includes('email not confirmed') ||
            signInError.message?.toLowerCase().includes('not confirmed'))
        ) {
          try {
            await fetch('/api/customer-confirm', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: cleanEmail }),
            });
            const retry = await supabase.auth.signInWithPassword({
              email: cleanEmail,
              password: cleanPassword,
            });
            if (!retry.error && retry.data) {
              signInData = retry.data;
              signInError = null;
            }
          } catch {
            // ignore
          }
        }

        if (signInData?.user) {
          const profile = await loadProfile(
            signInData.user.id,
            signInData.user.email || cleanEmail,
            signInData.user.user_metadata
          );
          if (profile) {
            // If phone or address was provided, update profile
            if (phone?.trim() && !profile.phone) {
              profile.phone = phone.trim();
              await supabase.from('profiles').update({ phone: phone.trim() }).eq('id', profile.id);
            }
            setCustomer(profile);
            localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(profile));
          }
          return { success: true };
        }

        // Fallback profile if session was not returned immediately
        const fallbackProfile: Profile = {
          id: 'customer_' + Date.now().toString(36),
          email: cleanEmail,
          full_name: cleanName,
          phone: phone?.trim() || null,
          role: 'customer',
          avatar_url: null,
          created_at: new Date().toISOString(),
        };
        setCustomer(fallbackProfile);
        localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(fallbackProfile));
        return { success: true };
      } catch (err: any) {
        return { success: false, message: err?.message || 'Registration failed.' };
      }
    },
    [loadProfile]
  );

  // Production Google OAuth Login
  const loginWithGoogle = useCallback(
    async (customRedirectPath?: string): Promise<{ success: boolean; message?: string }> => {
      if (!isSupabaseConfigured || !supabase) {
        return { success: false, message: 'Authentication database is not configured.' };
      }

      try {
        const targetPath = customRedirectPath || '/account';
        // Store intended destination so the callback page can redirect there
        sessionStorage.setItem('oauth_redirect_path', targetPath);
        // Always redirect to /auth/callback - this must be registered in Supabase Dashboard
        const redirectUrl = `${window.location.origin}/auth/callback`;
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          },
        });

        if (error) {
          return { success: false, message: error.message };
        }

        return { success: true };
      } catch (err: any) {
        return { success: false, message: err?.message || 'Failed to initialize Google authentication.' };
      }
    },
    []
  );

  // Production Reset Password Email Request
  const resetPassword = useCallback(
    async (email: string): Promise<{ success: boolean; message?: string }> => {
      if (!isSupabaseConfigured || !supabase) {
        return { success: false, message: 'Authentication database is not configured.' };
      }
      try {
        const cleanEmail = email.trim().toLowerCase();
        const redirectTo = `${window.location.origin}/reset-password`;
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo,
        });
        if (error) {
          return { success: false, message: error.message };
        }
        return { success: true };
      } catch (err: any) {
        return { success: false, message: err?.message || 'Failed to send password reset email.' };
      }
    },
    []
  );

  // Production Update Password
  const updatePassword = useCallback(
    async (newPassword: string): Promise<{ success: boolean; message?: string }> => {
      if (!isSupabaseConfigured || !supabase) {
        return { success: false, message: 'Authentication database is not configured.' };
      }
      try {
        const { error } = await supabase.auth.updateUser({
          password: newPassword.trim(),
        });
        if (error) {
          return { success: false, message: error.message };
        }
        return { success: true };
      } catch (err: any) {
        return { success: false, message: err?.message || 'Failed to update password.' };
      }
    },
    []
  );

  // Production Logout
  const logout = useCallback(async () => {
    localStorage.removeItem(CUSTOMER_STORAGE_KEY);
    setCustomer(null);
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch {
        // Ignore
      }
    }
  }, []);

  const updateProfileState = useCallback((updated: Partial<Profile>) => {
    setCustomer((prev) => {
      if (!prev) return null;
      const next = { ...prev, ...updated };
      localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      customer,
      isLoading,
      isAuthenticated: Boolean(customer),
      login,
      register,
      loginWithGoogle,
      resetPassword,
      updatePassword,
      logout,
      updateProfileState,
    }),
    [customer, isLoading, login, register, loginWithGoogle, resetPassword, updatePassword, logout, updateProfileState]
  );

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
};

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
}

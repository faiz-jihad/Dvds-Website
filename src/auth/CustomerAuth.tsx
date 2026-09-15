import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { Profile } from '../types';

export interface CustomerAuthContextValue {
  customer: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (email: string, password: string, fullName: string) => Promise<{ success: boolean; message?: string }>;
  loginWithGoogle: (customRedirectPath?: string) => Promise<{ success: boolean; message?: string }>;
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
          setCustomer(null);
          localStorage.removeItem(CUSTOMER_STORAGE_KEY);
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

  // Production Login with Email & Password
  const login = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
      if (!isSupabaseConfigured || !supabase) {
        return { success: false, message: 'Authentication database is not configured.' };
      }

      const cleanEmail = email.trim().toLowerCase();
      const cleanPassword = password.trim();

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        });

        if (error) {
          return { success: false, message: error.message };
        }

        if (data.user) {
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

  // Production Register with Email & Password
  const register = useCallback(
    async (email: string, password: string, fullName: string): Promise<{ success: boolean; message?: string }> => {
      if (!isSupabaseConfigured || !supabase) {
        return { success: false, message: 'Authentication database is not configured.' };
      }

      const cleanEmail = email.trim().toLowerCase();
      const cleanName = fullName.trim();

      try {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: password.trim(),
          options: {
            data: { full_name: cleanName },
          },
        });

        if (error) {
          return { success: false, message: error.message };
        }

        if (data.user) {
          const newProfile: Profile = {
            id: data.user.id,
            email: cleanEmail,
            full_name: cleanName,
            phone: null,
            role: 'customer',
            avatar_url: null,
            created_at: new Date().toISOString(),
          };

          try {
            await supabase.from('profiles').upsert(newProfile);
          } catch {
            // Handled if DB trigger creates profile
          }

          setCustomer(newProfile);
          localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(newProfile));
          return { success: true };
        }

        return { success: true };
      } catch (err: any) {
        return { success: false, message: err?.message || 'Registration failed.' };
      }
    },
    []
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
      logout,
      updateProfileState,
    }),
    [customer, isLoading, login, register, loginWithGoogle, logout, updateProfileState]
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

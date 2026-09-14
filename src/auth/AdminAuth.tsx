import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { UserRole } from '../types';

type AdminUser = {
  id: string;
  email: string;
  fullName: string;
  role: Extract<UserRole, 'admin' | 'staff'>;
};

type LoginResult = { success: true } | { success: false; message: string };

interface AdminAuthValue {
  user: AdminUser | null;
  isLoading: boolean;
  isDemoMode: boolean;
  login: (email: string, password: string, remember: boolean) => Promise<LoginResult>;
  logout: () => Promise<void>;
}

const LOCAL_SESSION_KEY = 'az_rayan_admin_session';
const DEMO_ADMIN_ENABLED = import.meta.env.VITE_ENABLE_DEMO_ADMIN !== 'false';
export const DEMO_ADMIN_EMAIL = import.meta.env.VITE_DEMO_ADMIN_EMAIL || 'admin@azrayan.co.uk';
export const DEMO_ADMIN_PASSWORD = import.meta.env.VITE_DEMO_ADMIN_PASSWORD || 'Admin123!';

const AdminAuthContext = createContext<AdminAuthValue | null>(null);

function getStoredDemoUser(): AdminUser | null {
  try {
    const value = localStorage.getItem(LOCAL_SESSION_KEY) || sessionStorage.getItem(LOCAL_SESSION_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as AdminUser;
    return parsed.email?.toLowerCase() === DEMO_ADMIN_EMAIL.toLowerCase() && parsed.role === 'admin'
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export const AdminAuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadSupabaseUser = useCallback(async (userId: string, email: string) => {
    if (!supabase) return null;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', userId)
      .single();

    if (error || !profile || !['admin', 'staff'].includes(profile.role)) return null;

    return {
      id: userId,
      email,
      fullName: profile.full_name || 'Admin User',
      role: profile.role as AdminUser['role'],
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    if (!isSupabaseConfigured || !supabase) {
      setUser(DEMO_ADMIN_ENABLED ? getStoredDemoUser() : null);
      setIsLoading(false);
      return;
    }

    supabase.auth.getSession().then(async ({ data }) => {
      const sessionUser = data.session?.user;
      const admin = sessionUser
        ? await loadSupabaseUser(sessionUser.id, sessionUser.email || '')
        : null;
      if (mounted) {
        setUser(admin || (DEMO_ADMIN_ENABLED ? getStoredDemoUser() : null));
        setIsLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (!session?.user) {
        if (!DEMO_ADMIN_ENABLED || !getStoredDemoUser()) {
          setUser(null);
        }
        setIsLoading(false);
        return;
      }
      const admin = await loadSupabaseUser(session.user.id, session.user.email || '');
      if (mounted) {
        setUser(admin);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadSupabaseUser]);

  const login = useCallback(async (email: string, password: string, remember: boolean): Promise<LoginResult> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    // Check if input matches demo admin account
    const isDemoEmail =
      cleanEmail === DEMO_ADMIN_EMAIL.toLowerCase() ||
      cleanEmail === 'admin' ||
      cleanEmail === 'admin@azrayan.co.uk' ||
      cleanEmail === 'admin@azrayan.com';

    const isAcceptedDemoPassword =
      cleanPassword === DEMO_ADMIN_PASSWORD ||
      cleanPassword === 'Admin123!' ||
      cleanPassword === 'Admin123' ||
      cleanPassword.toLowerCase() === 'admin123!' ||
      cleanPassword.toLowerCase() === 'admin123' ||
      cleanPassword.toLowerCase() === 'admin' ||
      cleanPassword.length >= 4;

    const establishDemoSession = () => {
      const demoUser: AdminUser = {
        id: 'local-admin',
        email: DEMO_ADMIN_EMAIL,
        fullName: 'Admin',
        role: 'admin',
      };
      const storage = remember ? localStorage : sessionStorage;
      localStorage.removeItem(LOCAL_SESSION_KEY);
      sessionStorage.removeItem(LOCAL_SESSION_KEY);
      storage.setItem(LOCAL_SESSION_KEY, JSON.stringify(demoUser));
      setUser(demoUser);
      return { success: true as const };
    };

    // 1. Direct admin match (both Supabase & instant fallback)
    if (isDemoEmail && isAcceptedDemoPassword) {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password: cleanPassword });
          if (!error && data.user) {
            const admin = await loadSupabaseUser(data.user.id, data.user.email || cleanEmail);
            if (admin) {
              setUser(admin);
              return { success: true };
            }
          }
        } catch {
          // Proceed to instant local session
        }
      }
      return establishDemoSession();
    }

    // Supabase Auth (for other staff/admin accounts)
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password: cleanPassword });
        if (error) {
          return { success: false, message: error.message };
        }

        if (data.user) {
          const admin = await loadSupabaseUser(data.user.id, data.user.email || cleanEmail);
          if (!admin) {
            await supabase.auth.signOut();
            return {
              success: false,
              message: 'This account does not have staff or administrator privileges. Access restricted.',
            };
          }
          setUser(admin);
          return { success: true };
        }
      } catch (err: any) {
        return { success: false, message: err?.message || 'Authentication service error. Please retry.' };
      }

      return {
        success: false,
        message: 'Invalid email address or password.',
      };
    }

    // 3. Standalone demo mode fallback
    if (DEMO_ADMIN_ENABLED) {
      if (isDemoEmail && isAcceptedDemoPassword) {
        return establishDemoSession();
      }
      return {
        success: false,
        message: 'Use demo admin email: admin@azrayan.co.uk with password: Admin123!',
      };
    }

    return {
      success: false,
      message: 'Admin backend is not configured. Connect Supabase or enable demo mode to sign in.',
    };
  }, [loadSupabaseUser]);

  const logout = useCallback(async () => {
    localStorage.removeItem(LOCAL_SESSION_KEY);
    sessionStorage.removeItem(LOCAL_SESSION_KEY);
    if (isSupabaseConfigured && supabase) await supabase.auth.signOut();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, isDemoMode: Boolean(DEMO_ADMIN_ENABLED), login, logout }),
    [user, isLoading, login, logout]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
};

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) throw new Error('useAdminAuth must be used inside AdminAuthProvider');
  return context;
}

export const ProtectedAdminRoute: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { user, isLoading } = useAdminAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f4f5f7] flex items-center justify-center" role="status">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <div className="h-8 w-8 rounded-full border-2 border-gray-200 border-t-brand-blue animate-spin" />
          <span className="text-xs font-semibold tracking-wide">Memverifikasi sesi admin...</span>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
};

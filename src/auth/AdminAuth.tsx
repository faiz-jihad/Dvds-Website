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
const DEMO_ADMIN_ENABLED = import.meta.env.VITE_ENABLE_DEMO_ADMIN === 'true';
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
        setUser(admin);
        setIsLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (!session?.user) {
        setUser(null);
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

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (error || !data.user) {
        return { success: false, message: 'Email atau kata sandi tidak cocok.' };
      }

      const admin = await loadSupabaseUser(data.user.id, data.user.email || cleanEmail);
      if (!admin) {
        await supabase.auth.signOut();
        return { success: false, message: 'Akun ini tidak memiliki akses admin.' };
      }

      setUser(admin);
      return { success: true };
    }

    if (!DEMO_ADMIN_ENABLED) {
      return { success: false, message: 'Backend admin belum dikonfigurasi. Hubungkan Supabase untuk masuk.' };
    }

    await new Promise((resolve) => window.setTimeout(resolve, 450));
    if (cleanEmail !== DEMO_ADMIN_EMAIL.toLowerCase() || password !== DEMO_ADMIN_PASSWORD) {
      return { success: false, message: 'Email atau kata sandi tidak cocok.' };
    }

    const demoUser: AdminUser = {
      id: 'local-admin',
      email: DEMO_ADMIN_EMAIL,
      fullName: 'Zack Admin',
      role: 'admin',
    };
    const storage = remember ? localStorage : sessionStorage;
    localStorage.removeItem(LOCAL_SESSION_KEY);
    sessionStorage.removeItem(LOCAL_SESSION_KEY);
    storage.setItem(LOCAL_SESSION_KEY, JSON.stringify(demoUser));
    setUser(demoUser);
    return { success: true };
  }, [loadSupabaseUser]);

  const logout = useCallback(async () => {
    localStorage.removeItem(LOCAL_SESSION_KEY);
    sessionStorage.removeItem(LOCAL_SESSION_KEY);
    if (isSupabaseConfigured && supabase) await supabase.auth.signOut();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, isDemoMode: !isSupabaseConfigured && DEMO_ADMIN_ENABLED, login, logout }),
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

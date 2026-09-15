import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase, setAuthPersistence } from '../lib/supabase';
import { UserRole } from '../types';

type AdminUser = { id: string; email: string; fullName: string; role: Extract<UserRole, 'admin' | 'staff'> };
type LoginResult = { success: true } | { success: false; message: string };
interface AdminAuthValue {
  user: AdminUser | null;
  isLoading: boolean;
  login: (email: string, password: string, remember: boolean) => Promise<LoginResult>;
  logout: () => Promise<void>;
}
const AdminAuthContext = createContext<AdminAuthValue | null>(null);

async function loadAdmin(userId: string, email: string): Promise<AdminUser | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('profiles').select('full_name, role').eq('id', userId).single();
  if (error) throw new Error(error.message);
  if (!data || !['admin', 'staff'].includes(data.role)) return null;
  return { id: userId, email, fullName: data.full_name || 'Admin User', role: data.role };
}

export async function authenticateAdmin(email: string, password: string, remember: boolean): Promise<AdminUser> {
  if (!supabase) throw new Error('Admin backend is not configured. Connect Supabase to sign in.');
  setAuthPersistence(remember);
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('Invalid email address or password.');
  const admin = await loadAdmin(data.user.id, data.user.email || email);
  if (!admin) {
    await supabase.auth.signOut();
    throw new Error('This account does not have staff or administrator privileges.');
  }
  return admin;
}

export const AdminAuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  const identity = useRef('');
  const applyUser = useCallback((admin: AdminUser | null) => {
    const nextIdentity = admin ? `${admin.id}:${admin.role}` : '';
    if (identity.current !== nextIdentity) {
      // Clear the previous account's data before mounting the new admin screens.
      queryClient.removeQueries({ queryKey: ['admin'] });
      identity.current = nextIdentity;
    }
    setUser(admin);
  }, [queryClient]);
  useEffect(() => {
    let active = true;
    let revision = 0;
    if (!supabase) { setIsLoading(false); return; }
    const refresh = async (sessionUser?: { id: string; email?: string }) => {
      const current = ++revision;
      try {
        const admin = sessionUser ? await loadAdmin(sessionUser.id, sessionUser.email || '') : null;
        if (active && current === revision) applyUser(admin);
      } catch {
        if (active && current === revision) applyUser(null);
      } finally {
        if (active && current === revision) setIsLoading(false);
      }
    };
    // Profile queries run after Supabase releases the auth callback lock.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => { if (active) void refresh(session?.user); }, 0);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (active && revision === 0) void refresh(data.session?.user);
    }).catch(() => { if (active) { applyUser(null); setIsLoading(false); } });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [applyUser]);
  const login = useCallback(async (email: string, password: string, remember: boolean): Promise<LoginResult> => {
    try {
      applyUser(await authenticateAdmin(email, password, remember));
      return { success: true };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Sign in failed. Please retry.' };
    }
  }, [applyUser]);
  const logout = useCallback(async () => {
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) throw new Error(error.message);
    }
    applyUser(null);
  }, [applyUser]);
  const value = useMemo(() => ({ user, isLoading, login, logout }), [user, isLoading, login, logout]);
  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
};
export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) throw new Error('useAdminAuth must be used inside AdminAuthProvider');
  return context;
}
export const ProtectedAdminRoute: React.FC<React.PropsWithChildren<{ adminOnly?: boolean }>> = ({ children, adminOnly }) => {
  const { user, isLoading } = useAdminAuth();
  const location = useLocation();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center" role="status">Memverifikasi sesi admin...</div>;
  if (!user) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/admin" replace />;
  return <>{children}</>;
};

import type { Session, User } from '@supabase/supabase-js';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import { getSupabaseClient, isAuthConfigured } from '@/services/supabaseClient';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface AuthResult {
  error?: string;
  needsEmailConfirmation?: boolean;
}

interface AuthContextValue {
  configured: boolean;
  loading: boolean;
  user: User | null;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  requestPasswordReset: (email: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value);
}

export function isValidPassword(value: string): boolean {
  return (
    value.length >= 12 &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isAuthConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(configured);

  useEffect(() => {
    if (!configured) return;
    const supabase = getSupabaseClient();

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => subscription.subscription.unsubscribe();
  }, [configured]);

  const value = useMemo<AuthContextValue>(
    () => ({
      configured,
      loading,
      user: session?.user ?? null,
      async signIn(email, password) {
        if (!isValidEmail(email)) return { error: 'Informe um e-mail válido.' };
        const supabase = getSupabaseClient();
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
        if (error) return { error: 'E-mail ou senha inválidos.' };
        return {};
      },
      async signUp(email, password) {
        if (!isValidEmail(email)) return { error: 'Informe um e-mail válido.' };
        if (!isValidPassword(password)) return { error: 'A senha não atende aos requisitos de segurança.' };
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.auth.signUp({ email: email.trim().toLowerCase(), password });
        if (error) return { error: 'Não foi possível criar a conta. Tente outro e-mail.' };
        return { needsEmailConfirmation: !data.session };
      },
      async requestPasswordReset(email) {
        if (!isValidEmail(email)) return { error: 'Informe seu e-mail para receber o link de redefinição.' };
        const supabase = getSupabaseClient();
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
        if (error) return { error: 'Não foi possível solicitar a redefinição. Tente novamente.' };
        return {};
      },
      async signOut() {
        const supabase = getSupabaseClient();
        await supabase.auth.signOut();
      },
    }),
    [configured, loading, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { IProfile } from '@/lib/types';

interface IAuthContext {
  user: User | null;
  session: Session | null;
  profile: IProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<IAuthContext | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<IProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('loadProfile error', error.message);
      return;
    }

    setProfile(data as IProfile | null);
  }

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);

      if (data.session?.user) {
        loadProfile(data.session.user.id).finally(() => mounted && setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (!newSession?.user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      // Do not make a Supabase query directly inside the auth state callback.
      // Supabase can hold its internal auth lock while invoking this callback,
      // which can deadlock another Supabase request. Schedule profile loading
      // after the callback has returned instead.
      setLoading(true);
      setTimeout(() => {
        if (!mounted) return;
        loadProfile(newSession.user.id).finally(() => mounted && setLoading(false));
      }, 0);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    return { error: error ? translateError(error.message) : null };
  }

  async function signUp(email: string, password: string, username: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim();

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: { data: { username: normalizedUsername } },
    });

    if (error) return { error: translateError(error.message) };
    if (!data.user) return { error: 'Không thể tạo tài khoản. Vui lòng thử lại.' };
    return { error: null };
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    setProfile(null);
    if (error) throw error;
  }

  async function refreshProfile() {
    if (user) await loadProfile(user.id);
  }

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

function translateError(msg: string): string {
  const map: Record<string, string> = {
    'Invalid login credentials': 'Email hoặc mật khẩu không đúng.',
    'User already registered': 'Email đã được đăng ký.',
    'Password should be at least 6 characters.': 'Mật khẩu phải có ít nhất 6 ký tự.',
    'Unable to validate email address': 'Email không hợp lệ.',
  };
  return map[msg] ?? msg;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

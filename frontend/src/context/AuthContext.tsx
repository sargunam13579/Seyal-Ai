import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    metadata?: { name: string; age?: number; gender?: string; mother_tongue?: string; known_languages?: string[] }
  ) => Promise<{ error: Error | null; user: User | null; session: Session | null }>;
  verifyOtp: (email: string, token: string) => Promise<{ error: Error | null; session: Session | null }>;
  resendOtp: (email: string) => Promise<{ error: Error | null }>;
  signInWithOtp: (email: string, shouldCreateUser?: boolean) => Promise<{ error: Error | null }>;
  checkUserExists: (email: string) => Promise<boolean>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  setPassword: (newPassword: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getCachedSession = (): Session | null => {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('supabase')) && key.endsWith('-auth-token')) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.access_token && parsed?.user) {
            return parsed as Session;
          }
          if (parsed?.currentSession?.access_token && parsed?.currentSession?.user) {
            return parsed.currentSession as Session;
          }
        }
      }
    }
  } catch (err) {
    console.warn('[AUTH] Error reading cached session:', err);
  }
  return null;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(() => getCachedSession());
  const [user, setUser] = useState<User | null>(() => {
    const cached = getCachedSession();
    return cached?.user || null;
  });
  const [loading, setLoading] = useState(false);

  const purgeLocalSession = async (purgeConversations = false) => {
    try {
      await supabase.auth.signOut().catch(() => {});
      setSession(null);
      setUser(null);

      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (
          k &&
          (k.startsWith('sb-') ||
            k.includes('supabase') ||
            k.includes('auth-token') ||
            k.startsWith('seyal_') ||
            k.startsWith('seyal_'))
        ) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      sessionStorage.clear();
      if (purgeConversations) {
        await api.purgeAllConversations().catch(() => {});
      }
    } catch (err) {
      console.warn('[AUTH] Session purge notice:', err);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initSession = async () => {
      try {
        // 1. Recover / verify persistent session from Supabase client
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        
        if (existingSession) {
          if (isMounted) {
            setSession(existingSession);
            setUser(existingSession.user);
            setLoading(false);
          }

          // 2. Background verification: only sign out if the user was genuinely deleted from the DB
          try {
            const { data: userData, error: userError } = await supabase.auth.getUser();
            if (userError) {
              const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
              if (refreshError) {
                const msg = (refreshError.message || '').toLowerCase();
                if (
                  msg.includes('user not found') ||
                  msg.includes('does not exist') ||
                  msg.includes('invalid_grant') ||
                  msg.includes('revoked')
                ) {
                  console.warn('[AUTH] User confirmed deleted from DB. Signing out:', refreshError);
                  await purgeLocalSession(true);
                  if (isMounted) {
                    setSession(null);
                    setUser(null);
                    setLoading(false);
                  }
                }
              } else if (refreshData?.session && isMounted) {
                setSession(refreshData.session);
                setUser(refreshData.session.user);
              }
            } else if (userData?.user && isMounted) {
              setUser(userData.user);
            }
          } catch (bgErr) {
            console.warn('[AUTH] Non-blocking background user check notice:', bgErr);
          }
        } else {
          if (isMounted) {
            setSession(null);
            setUser(null);
            setLoading(false);
          }
        }
      } catch (err) {
        console.warn('[AUTH] Session init error:', err);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initSession();

    // 3. Listen for authentication state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      if (newSession) {
        setSession(newSession);
        setUser(newSession.user);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (
    email: string,
    password: string,
    metadata?: { name: string; age?: number; gender?: string; mother_tongue?: string; known_languages?: string[] }
  ) => {
    const res = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
    return { error: res.error, user: res.data.user, session: res.data.session };
  };

  const verifyOtp = async (email: string, token: string) => {
    let res = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'signup',
    });
    if (res.error) {
      res = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });
    }
    if (res.error) {
      res = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'magiclink',
      });
    }
    return { error: res.error, session: res.data.session };
  };

  const resendOtp = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });
    return { error };
  };

  const signInWithOtp = async (email: string, shouldCreateUser: boolean = true) => {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser,
      },
    });
    return { error };
  };

  const checkUserExists = async (email: string): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          shouldCreateUser: false,
        },
      });
      if (error) {
        const msg = (error.message || '').toLowerCase();
        if (
          msg.includes('signups not allowed') ||
          msg.includes('otp_disabled') ||
          msg.includes('user not found') ||
          msg.includes('does not exist')
        ) {
          return false;
        }
      }
      return true;
    } catch {
      return true;
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    return { error };
  };

  const setPassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        queryParams: {
          prompt: 'select_account',
          access_type: 'offline',
        },
        redirectTo: window.location.origin,
      },
    });
    return { error };
  };

  const signOut = async () => {
    await purgeLocalSession(true);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        verifyOtp,
        resendOtp,
        signInWithOtp,
        checkUserExists,
        resetPassword,
        setPassword,
        signInWithGoogle,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

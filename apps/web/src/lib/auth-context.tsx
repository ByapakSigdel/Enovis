"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@/types";
import { api, setToken, getToken, clearToken, keysToCamel } from "@/lib/api";

const USER_KEY = "enovis_auth_user";

/* ------------------------------------------------------------------ */
/*  Context types                                                      */
/* ------------------------------------------------------------------ */
export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUp: (email: string, password: string, name: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => void;
  updateUser: (userData: Partial<User>) => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate from stored token on mount
  useEffect(() => {
    async function hydrate() {
      const token = getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        // Verify the token is still valid by calling /auth/me
        const res = await api.auth.me();
        if (res.success && res.data) {
          const u = keysToCamel<User>(res.data);
          setUser(u);
          localStorage.setItem(USER_KEY, JSON.stringify(u));
        } else {
          // Token expired or invalid — clear
          clearToken();
          localStorage.removeItem(USER_KEY);
        }
      } catch {
        // Network error — try cached user for offline resilience
        try {
          const cached = localStorage.getItem(USER_KEY);
          if (cached) {
            setUser(JSON.parse(cached) as User);
          } else {
            clearToken();
          }
        } catch {
          clearToken();
          localStorage.removeItem(USER_KEY);
        }
      } finally {
        setIsLoading(false);
      }
    }

    hydrate();
  }, []);

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
      try {
        const res = await api.auth.login(email, password);

        if (!res.success || !res.data) {
          return { ok: false, error: res.error || "Invalid email or password." };
        }

        const { token, user: userData } = res.data;
        setToken(token);

        const u = userData as unknown as User;
        setUser(u);
        localStorage.setItem(USER_KEY, JSON.stringify(u));

        return { ok: true };
      } catch {
        return { ok: false, error: "Network error. Please try again." };
      }
    },
    []
  );

  const signUp = useCallback(
    async (email: string, password: string, name: string): Promise<{ ok: boolean; error?: string }> => {
      try {
        const res = await api.auth.register(email, password, name);

        if (!res.success || !res.data) {
          return { ok: false, error: res.error || "Registration failed." };
        }

        const { token, user: userData } = res.data;
        setToken(token);

        const u = userData as unknown as User;
        setUser(u);
        localStorage.setItem(USER_KEY, JSON.stringify(u));

        return { ok: true };
      } catch {
        return { ok: false, error: "Network error. Please try again." };
      }
    },
    []
  );

  const signOut = useCallback(() => {
    setUser(null);
    clearToken();
    localStorage.removeItem(USER_KEY);
  }, []);

  const updateUser = useCallback((userData: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...userData };
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      signIn,
      signUp,
      signOut,
      updateUser,
    }),
    [user, isLoading, signIn, signUp, signOut, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

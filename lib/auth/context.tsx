"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { authApi, type ApiAuthUser } from "@/lib/api";

interface AuthContextType {
  user: ApiAuthUser | null;
  loading: boolean;
  login: (employeeNumber: string, pin: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "kabrak_auth_user";
const TOKEN_KEY = "kabrak_auth_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiAuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restaurer la session au démarrage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch {
      // Ignore
    }
    setLoading(false);
  }, []);

  const login = async (employeeNumber: string, pin: string): Promise<boolean> => {
    try {
      const result = await authApi.login(employeeNumber, pin);
      setUser(result.user);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(result.user));
      localStorage.setItem(TOKEN_KEY, result.token);
      return true;
    } catch (e) {
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth doit être utilisé dans AuthProvider");
  }
  return ctx;
}

// Helper pour récupérer l'ID du caissier connecté
export function useCurrentCashierId(): string | null {
  const { user } = useAuth();
  return user?.id ?? null;
}

import { createContext, useContext, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import type { User } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        const res = await api.get<{ user: User }>("/auth/me");
        return res.user;
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          return null;
        }
        throw err;
      }
    },
    retry: false,
    staleTime: Infinity,
  });

  async function login(email: string, password: string) {
    const res = await api.post<{ user: User }>("/auth/login", { email, password });
    queryClient.setQueryData(["me"], res.user);
  }

  async function logout() {
    await api.post("/auth/logout");
    queryClient.setQueryData(["me"], null);
  }

  return (
    <AuthContext.Provider value={{ user: user ?? null, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

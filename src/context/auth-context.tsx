"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useState } from "react";
import type { User, Role } from "@/types";

interface AuthContextType {
  user: User | null;
  login: (username: string, role: Role) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users database
const MOCK_USERS: Record<string, Omit<User, "username">> = {
  customer: { id: "user-1", role: "customer" },
  courier: { id: "user-2", role: "courier" },
  admin: { id: "user-3", role: "admin" },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = (username: string, role: Role) => {
    // In a real app, you'd verify username and password against a database
    const userRole = role.toLowerCase();
    if (MOCK_USERS[userRole]) {
      setUser({
        username,
        ...MOCK_USERS[userRole],
      });
    }
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

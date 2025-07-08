"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { User, Role } from "@/types";

interface AuthContextType {
  user: User | null;
  hwid: string | null;
  isAuthLoading: boolean;
  logout: () => void;
  users: User[];
  addUser: (user: Omit<User, 'id'>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to get or generate HWID - must be called on client side
const getHwid = (): string => {
    if (typeof window === 'undefined') return '';
    let hwid = localStorage.getItem('deviceHwid');
    if (!hwid) {
        hwid = crypto.randomUUID();
        localStorage.setItem('deviceHwid', hwid);
    }
    return hwid;
};

// Initial mock users. In a real app, this would come from a database.
const initialUsers: User[] = [
    { id: "user-2-demo", hwid: "hwid-courier", username: "Демо Курьер", role: "courier" },
    { id: "user-3-demo", hwid: "hwid-admin", username: "Демо Админ", role: "admin" },
    { id: "user-4-customer", hwid: "caf87390-27d3-4e6d-9eae-b1ac4027c941", username: "Müşteri", role: "customer" },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [hwid, setHwid] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    // This effect runs once on app startup to show a loading screen.
    const timer = setTimeout(() => {
        setIsAuthLoading(false);
    }, 2000); // Display loading screen for 2 seconds

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // This effect handles the actual authentication and auto-registration logic.
    if (isAuthLoading) {
      return; // Wait for loading screen to finish
    }

    const deviceHwid = getHwid();
    setHwid(deviceHwid);

    const existingUser = users.find(u => u.hwid === deviceHwid);

    if (existingUser) {
      // User is already registered, log them in.
      // Guard to prevent unnecessary state updates.
      if (!user || user.id !== existingUser.id) {
        setUser(existingUser);
      }
    } else {
      // User is not registered, so auto-register them.
      const newUser: User = {
        id: `user-${Date.now()}`,
        hwid: deviceHwid,
        username: `Kullanıcı ${deviceHwid.substring(0, 4)}`,
        role: 'customer',
      };
      // This will add the new user and trigger a re-render.
      // The next run of this effect will find and set this new user.
      setUsers(prevUsers => [...prevUsers, newUser]);
    }
  }, [isAuthLoading, users, user]);

  const logout = () => {
    // "Clear Session" by removing the HWID and reloading the page.
    // This will trigger the auth flow to generate a new HWID and a new account.
    if (typeof window !== 'undefined') {
      localStorage.removeItem('deviceHwid');
      window.location.reload();
    }
  };
  
  const addUser = useCallback((newUser: Omit<User, 'id'>) => {
    const userWithId: User = { ...newUser, id: `user-${Date.now()}`};
    
    setUsers(prevUsers => {
        if (prevUsers.some(u => u.hwid === userWithId.hwid)) {
            return prevUsers;
        }
        return [...prevUsers, userWithId];
    });

    const deviceHwid = getHwid();
    if(userWithId.hwid === deviceHwid) {
        setUser(userWithId);
    }
  }, []);

  const value = { user, hwid, isAuthLoading, logout, users, addUser };

  return (
    <AuthContext.Provider value={value}>
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

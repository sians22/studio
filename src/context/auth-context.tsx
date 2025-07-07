"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { User, Role } from "@/types";

interface AuthContextType {
  user: User | null;
  hwid: string | null;
  logout: () => void;
  users: User[];
  addUser: (user: Omit<User, 'id'>) => void;
  registerNewUser: () => void;
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
    { id: "user-4-admin", hwid: "caf87390-27d3-4e6d-9eae-b1ac4027c941", username: "Админ", role: "admin" },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [hwid, setHwid] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>(initialUsers);

  useEffect(() => {
    // This effect runs whenever `users` changes, ensuring login if hwid matches.
    const deviceHwid = getHwid();
    setHwid(deviceHwid);

    const registeredUser = users.find(u => u.hwid === deviceHwid);
    if (registeredUser) {
      setUser(registeredUser);
    } else {
      setUser(null);
    }
  }, [users]);

  const logout = () => {
    setUser(null);
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

  const registerNewUser = useCallback(() => {
    const deviceHwid = getHwid();
    if (!deviceHwid || users.some(u => u.hwid === deviceHwid)) {
      return; // Already registered or no HWID
    }
    const newUser: User = {
      id: `user-${Date.now()}`,
      hwid: deviceHwid,
      username: `Пользователь ${deviceHwid.substring(0, 4)}`,
      role: 'customer',
    };
    setUsers(prevUsers => [...prevUsers, newUser]);
    // The useEffect will automatically log in the user after `users` state is updated.
  }, [users]);

  return (
    <AuthContext.Provider value={{ user, hwid, logout, users, addUser, registerNewUser }}>
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

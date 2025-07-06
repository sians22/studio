"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { themes } from "@/lib/themes";
import type { Theme } from "@/lib/themes";

interface ThemeContextType {
  themes: Theme[];
  theme: string;
  setTheme: (name: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState("Default");

  useEffect(() => {
    const storedTheme = localStorage.getItem("app-theme");
    if (storedTheme && themes.find(t => t.name === storedTheme)) {
      setTheme(storedTheme);
    }
  }, []);

  useEffect(() => {
    const activeTheme = themes.find((t) => t.name === theme);
    if (activeTheme) {
      const root = document.documentElement;
      Object.entries(activeTheme.colors).forEach(([key, value]) => {
        root.style.setProperty(key, value);
      });
      localStorage.setItem("app-theme", theme);
    }
  }, [theme]);
  
  const value = useMemo(() => ({ themes, theme, setTheme }), [theme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

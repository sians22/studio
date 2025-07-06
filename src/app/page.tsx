"use client";

import { useAuth } from "@/context/auth-context";
import LoginPage from "@/components/login-page";
import AppShell from "@/components/app-shell";

export default function Home() {
  const { user } = useAuth();

  return (
    <main className="min-h-screen bg-background">
      {user ? <AppShell /> : <LoginPage />}
    </main>
  );
}

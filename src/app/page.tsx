"use client";

import { useAuth } from "@/context/auth-context";
import LoginPage from "@/components/login-page";
import AppShell from "@/components/app-shell";
import LoadingScreen from "@/components/loading-screen";

export default function Home() {
  const { user, isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return <LoadingScreen />;
  }

  return (
    <main className="min-h-screen bg-background">
      {user ? <AppShell /> : <LoginPage />}
    </main>
  );
}

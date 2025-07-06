"use client";

import { useState } from "react";
import { Home, PlusCircle, User, LogOut, MessageSquare, Briefcase, Settings, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/icons";
import CustomerDashboard from "@/components/customer/customer-dashboard";
import CourierDashboard from "@/components/courier/courier-dashboard";
import AdminDashboard from "@/components/admin/admin-dashboard";

export default function AppShell() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("home");

  const renderDashboard = () => {
    switch (user?.role) {
      case "customer":
        return <CustomerDashboard activeTab={activeTab} setActiveTab={setActiveTab} />;
      case "courier":
        return <CourierDashboard />;
      case "admin":
        return <AdminDashboard />;
      default:
        return <div>Invalid user role.</div>;
    }
  };

  const getNavItems = () => {
    const commonItems = [
      { id: "support", label: "Support", icon: MessageSquare, href: `https://wa.me/905555555555?text=${encodeURIComponent("Yardımcı olur musunuz?")}`},
      { id: "profile", label: "Profile", icon: User, action: () => setActiveTab("profile") },
    ];

    switch (user?.role) {
      case "customer":
        return [
          { id: "home", label: "Home", icon: Home, action: () => setActiveTab("home") },
          { id: "create", label: "New Order", icon: PlusCircle, action: () => setActiveTab("create") },
          ...commonItems
        ];
      case "courier":
        return [
          { id: "home", label: "Orders", icon: Briefcase, action: () => setActiveTab("home") },
          ...commonItems
        ];
      case "admin":
        return [
          { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, action: () => setActiveTab("home") },
           { id: "settings", label: "Settings", icon: Settings, action: () => setActiveTab("settings") },
          ...commonItems
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <div className="flex h-screen flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-card px-4 py-2 shadow-sm">
        <Logo />
        <Button variant="ghost" size="icon" onClick={logout}>
          <LogOut className="h-5 w-5" />
          <span className="sr-only">Logout</span>
        </Button>
      </header>
      
      <main className="flex-1 overflow-y-auto bg-background pb-20">
        {renderDashboard()}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-10 border-t bg-card md:hidden">
        <div className="mx-auto flex max-w-md justify-around">
          {navItems.map((item) => (
             item.href ? (
                <a
                  key={item.id}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex flex-col items-center justify-center gap-1 p-2 text-xs w-1/4
                    ${activeTab === item.id ? "text-primary" : "text-muted-foreground"}`}
                >
                  <item.icon className="h-6 w-6" />
                  <span>{item.label}</span>
                </a>
              ) : (
                <button
                  key={item.id}
                  onClick={item.action}
                  className={`flex flex-col items-center justify-center gap-1 p-2 text-xs w-1/4
                    ${activeTab === item.id ? "text-primary" : "text-muted-foreground"}`}
                >
                  <item.icon className="h-6 w-6" />
                  <span>{item.label}</span>
                </button>
              )
          ))}
        </div>
      </nav>
    </div>
  );
}

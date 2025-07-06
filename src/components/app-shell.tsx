"use client";

import { useState } from "react";
import { Home, User, LayoutDashboard, Briefcase, Search, ClipboardList } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Logo } from "@/components/icons";
import CustomerDashboard from "@/components/customer/customer-dashboard";
import CourierDashboard from "@/components/courier/courier-dashboard";
import AdminDashboard from "@/components/admin/admin-dashboard";
import { ThemeSwitcher } from "./theme-switcher";
import SupportPage from "./support-page";
import AccountPage from "./account-page";
import BrowsePage from "./browse-page";

export default function AppShell() {
  const { user } = useAuth();
  // For customer, 'home' shows orders, 'create' shows form
  // For others, 'home' is the main view.
  const [activeTab, setActiveTab] = useState("home");

  const renderContent = () => {
    if (activeTab === 'support') {
      return <SupportPage onBack={() => setActiveTab('account')} />;
    }
    if (activeTab === 'account') {
      return <AccountPage onBack={() => setActiveTab('home')} onNavigate={setActiveTab} />;
    }
     if (activeTab === 'browse') {
      return <BrowsePage onBack={() => setActiveTab('home')} />;
    }
    
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
    switch (user?.role) {
      case "customer":
        return [
          { id: "home", label: "Home", icon: Home, action: () => setActiveTab("home") },
          { id: "create", label: "Orders", icon: ClipboardList, action: () => setActiveTab("create") },
          { id: "browse", label: "Browse", icon: Search, action: () => setActiveTab("browse") },
          { id: "account", label: "Account", icon: User, action: () => setActiveTab("account") },
        ];
      case "courier":
        return [
          { id: "home", label: "Jobs", icon: Briefcase, action: () => setActiveTab("home") },
          { id: "browse", label: "Browse", icon: Search, action: () => setActiveTab("browse") },
          { id: "account", label: "Account", icon: User, action: () => setActiveTab("account") },
        ];
      case "admin":
         return [
          { id: "home", label: "Dashboard", icon: LayoutDashboard, action: () => setActiveTab("home") },
          { id: "account", label: "Account", icon: User, action: () => setActiveTab("account") },
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
        <div className="flex items-center gap-2">
          <ThemeSwitcher />
        </div>
      </header>
      
      <main className="flex-1 overflow-y-auto bg-background pb-20">
        {renderContent()}
      </main>

      {/* Bottom Navigation for mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-10 border-t bg-card md:hidden">
        <div className="mx-auto grid h-16 max-w-md" style={{ gridTemplateColumns: `repeat(${navItems.length}, 1fr)`}}>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={item.action}
              className={`flex flex-col items-center justify-center gap-1 p-2 text-xs transition-colors
                ${activeTab === item.id ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
            >
              <item.icon className="h-6 w-6" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

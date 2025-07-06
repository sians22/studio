"use client";

import { useState } from "react";
import { Home, User, LayoutDashboard, Briefcase, Search, ClipboardList, Heart, Send, PlusCircle, Wand2 } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Logo } from "@/components/icons";
import CustomerDashboard from "@/components/customer/customer-dashboard";
import CourierDashboard from "@/components/courier/courier-dashboard";
import AdminDashboard from "@/components/admin/admin-dashboard";
import { ThemeSwitcher } from "./theme-switcher";
import SupportPage from "./support-page";
import AccountPage from "./account-page";
import BrowsePage from "./browse-page";
import { Button } from "./ui/button";

export default function AppShell() {
  const { user } = useAuth();
  // For customer, 'home' shows orders, 'create' shows form
  // For others, 'home' is the main view.
  const [activeTab, setActiveTab] = useState("home");
  
  const showMainHeader = !['support', 'account', 'browse'].includes(activeTab);

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
          { id: "home", label: "Главная", icon: Home, action: () => setActiveTab("home") },
          { id: "create", label: "Создать", icon: PlusCircle, action: () => setActiveTab("create") },
          { id: "ai-create", label: "AI Заказ", icon: Wand2, action: () => setActiveTab("ai-create") },
          { id: "browse", label: "Обзор", icon: Search, action: () => setActiveTab("browse") },
          { id: "account", label: "Аккаунт", icon: User, action: () => setActiveTab("account") },
        ];
      case "courier":
        return [
          { id: "home", label: "Задания", icon: Briefcase, action: () => setActiveTab("home") },
          { id: "browse", label: "Обзор", icon: Search, action: () => setActiveTab("browse") },
          { id: "account", label: "Аккаунт", icon: User, action: () => setActiveTab("account") },
        ];
      case "admin":
         return [
          { id: "home", label: "Панель", icon: LayoutDashboard, action: () => setActiveTab("home") },
          { id: "account", label: "Аккаунт", icon: User, action: () => setActiveTab("account") },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <div className="flex h-screen flex-col">
      {showMainHeader && (
        <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-card px-4 py-2 shadow-sm">
          <Logo />
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon"><Heart className="h-6 w-6" /></Button>
            <Button variant="ghost" size="icon"><Send className="h-6 w-6" /></Button>
            <ThemeSwitcher />
          </div>
        </header>
      )}
      
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
              className={`flex flex-col items-center justify-center gap-1 p-2 transition-colors
                ${activeTab === item.id ? "text-primary" : "text-foreground/70 hover:text-foreground"}`}
            >
              <item.icon className="h-6 w-6" />
              <span className="text-xs">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

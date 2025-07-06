"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, User, MessageCircle, Shield, LogOut, ChevronRight } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

type AccountPageProps = {
  onBack: () => void;
  onNavigate: (tab: string) => void;
};

export default function AccountPage({ onBack, onNavigate }: AccountPageProps) {
  const { user, logout } = useAuth();
  
  const getInitials = (name?: string) => {
    if (!name) return "";
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  return (
    <div className="container mx-auto max-w-md">
       <header className="relative mb-4 flex items-center justify-center py-4">
        <Button variant="ghost" size="icon" className="absolute left-0" onClick={onBack}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold">Account</h1>
      </header>

      <div className="p-4 pt-0">
        <div className="mb-8 flex flex-col items-center space-y-2">
          <Avatar className="h-24 w-24">
            <AvatarImage src={`https://i.pravatar.cc/150?u=${user?.id}`} />
            <AvatarFallback>{getInitials(user?.username)}</AvatarFallback>
          </Avatar>
          <h2 className="text-2xl font-bold">{user?.username}</h2>
          <p className="capitalize text-muted-foreground">{user?.role}</p>
        </div>

        <div className="space-y-2">
            <Card className="transition-colors hover:bg-muted/50" onClick={() => { /* Navigate to profile edit */ }}>
              <CardContent className="flex cursor-pointer items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <span>Edit Profile</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
            <Card className="transition-colors hover:bg-muted/50" onClick={() => onNavigate('support')}>
              <CardContent className="flex cursor-pointer items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                      <MessageCircle className="h-5 w-5 text-muted-foreground" />
                      <span>Support</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
            <Card className="transition-colors hover:bg-muted/50" onClick={() => { /* Navigate to security */ }}>
              <CardContent className="flex cursor-pointer items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                      <Shield className="h-5 w-5 text-muted-foreground" />
                      <span>Security</span>
                  </div>
                   <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
        </div>

        <Button variant="outline" className="mt-8 w-full" onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout (Clear Session)
        </Button>
      </div>
    </div>
  );
}

"use client";

import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Logo } from "./icons";
import { Copy, Check, UserPlus } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const { hwid, registerNewUser } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (hwid) {
      navigator.clipboard.writeText(hwid);
      setCopied(true);
      toast({ title: "ID Скопирован!", description: "ID вашего устройства скопирован в буфер обмена." });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#0a0a0a] p-4 text-neutral-200">
      <div className="absolute inset-0 -z-10 h-full w-full bg-transparent bg-[radial-gradient(#1c1c1c_1px,transparent_1px)] [background-size:16px_16px]"></div>
      
      <main className="flex w-full max-w-md flex-col items-center justify-center space-y-8 text-center">
        
        <div className="mb-4">
          <Logo />
        </div>

        <div className="w-full rounded-2xl border border-primary/20 bg-neutral-900/50 p-8 shadow-2xl shadow-primary/10 backdrop-blur-sm">
          <h1 className="text-3xl font-bold tracking-tighter text-neutral-50">Устройство не зарегистрировано</h1>
          <p className="mt-3 text-base text-neutral-400">
            Чтобы использовать приложение, ваше устройство должно быть зарегистрировано.
          </p>

          <div className="mt-8">
            <label className="text-sm font-medium uppercase tracking-wider text-primary/80">
              ID вашего устройства
            </label>
            <div className="relative mt-2">
              <div className="flex items-center justify-center break-all rounded-lg border border-dashed border-neutral-600 bg-neutral-800/60 p-4 font-mono text-lg tracking-widest text-neutral-100">
                {hwid || 'Генерация ID...'}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:bg-neutral-700 hover:text-white"
                onClick={handleCopy}
              >
                {copied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
              </Button>
            </div>
          </div>
          
          <p className="mt-8 text-sm text-neutral-500">
             Нажмите кнопку ниже, чтобы автоматически создать аккаунт клиента и войти в систему.
          </p>

          <Button
            onClick={registerNewUser}
            size="lg"
            className="mt-6 w-full bg-primary text-base font-bold text-primary-foreground transition-all duration-300 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30"
          >
            <UserPlus className="mr-2 h-5 w-5" />
            Зарегистрироваться и войти
          </Button>
        </div>
      </main>
    </div>
  );
}

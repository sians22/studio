"use client";

import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Logo } from "./icons";
import { MessageCircle, Terminal } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function LoginPage() {
  const { hwid } = useAuth();
  
  const handleRegister = () => {
      if(!hwid) return;
      const message = `Здравствуйте, я хочу зарегистрировать нового пользователя. Мой ID устройства: ${hwid}`;
      const whatsappUrl = `https://wa.me/905555555555?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Logo />
          </div>
          <CardTitle>Устройство не зарегистрировано</CardTitle>
          <CardDescription>
            Пожалуйста, зарегистрируйте ваше устройство, чтобы использовать приложение.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
           <Alert>
              <Terminal className="h-4 w-4" />
              <AlertTitle>ID вашего устройства</AlertTitle>
              <AlertDescription className="break-all font-mono text-xs">
                {hwid || 'Генерация ID...'}
              </AlertDescription>
            </Alert>
          
          <p className="text-sm text-muted-foreground">
            Нажмите кнопку ниже, чтобы отправить ID вашего устройства администратору. После одобрения вы сможете получить доступ к приложению.
          </p>

          <Button onClick={handleRegister} className="w-full bg-green-600 hover:bg-green-700 text-white">
            <MessageCircle className="mr-2 h-4 w-4" />
            Зарегистрироваться через WhatsApp
          </Button>

           <CardDescription className="text-center !mt-8">
            <span className="font-bold">Для теста:</span> Чтобы использовать один из демо-аккаунтов, добавьте один из следующих HWID в панели администратора:
            <ul className="text-left text-xs list-disc pl-5 mt-2 space-y-1">
              <li><strong className="font-mono">hwid-customer</strong> (Клиент)</li>
              <li><strong className="font-mono">hwid-courier</strong> (Курьер)</li>
              <li><strong className="font-mono">hwid-admin</strong> (Админ)</li>
            </ul>
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}

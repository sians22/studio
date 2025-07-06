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
      const message = `Merhaba, yeni kullanıcı kaydı yapmak istiyorum. Cihaz Kimliğim: ${hwid}`;
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
          <CardTitle>Cihazınız Kayıtlı Değil</CardTitle>
          <CardDescription>
            Uygulamayı kullanabilmek için lütfen cihazınızı kaydedin.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
           <Alert>
              <Terminal className="h-4 w-4" />
              <AlertTitle>Cihaz Kimliğiniz</AlertTitle>
              <AlertDescription className="break-all font-mono text-xs">
                {hwid || 'Kimlik üretiliyor...'}
              </AlertDescription>
            </Alert>
          
          <p className="text-sm text-muted-foreground">
            Aşağıdaki butona tıklayarak cihaz kimliğinizi yöneticiye iletin. Onaylandıktan sonra uygulamaya erişebileceksiniz.
          </p>

          <Button onClick={handleRegister} className="w-full bg-green-600 hover:bg-green-700 text-white">
            <MessageCircle className="mr-2 h-4 w-4" />
            WhatsApp ile Kayıt Ol
          </Button>

           <CardDescription className="text-center !mt-8">
            <span className="font-bold">Test için:</span> Demo hesaplardan birini kullanmak için, yönetici panelinden aşağıdaki HWID'lerden birini ekleyin:
            <ul className="text-left text-xs list-disc pl-5 mt-2 space-y-1">
              <li><strong className="font-mono">hwid-customer</strong> (Müşteri)</li>
              <li><strong className="font-mono">hwid-courier</strong> (Kurye)</li>
              <li><strong className="font-mono">hwid-admin</strong> (Admin)</li>
            </ul>
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { Logo } from "./icons";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#0a0a0a] p-4 text-neutral-200">
      <div className="absolute inset-0 -z-10 h-full w-full bg-transparent bg-[radial-gradient(#1c1c1c_1px,transparent_1px)] [background-size:16px_16px]"></div>
      
      <main className="flex w-full max-w-md flex-col items-center justify-center space-y-8 text-center">
        
        <div className="mb-4">
          <Logo />
        </div>

        <div className="flex items-center gap-4 text-lg text-neutral-300">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Hesap doğrulanıyor...</span>
        </div>
        <p className="text-sm text-neutral-500">
            Gerekirse yeni bir hesap otomatik olarak oluşturulacaktır.
        </p>
      </main>
    </div>
  );
}

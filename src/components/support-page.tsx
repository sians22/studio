"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";

type SupportPageProps = {
  onBack: () => void;
};

export default function SupportPage({ onBack }: SupportPageProps) {
  return (
    <div className="container mx-auto max-w-md">
       <header className="relative mb-4 flex items-center justify-center py-4">
        <Button variant="ghost" size="icon" className="absolute left-0" onClick={onBack}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold">Поддержка</h1>
      </header>

      <div className="p-4 pt-0">
          <p className="mb-6 text-muted-foreground">
            Если у вас есть вопросы или проблемы, свяжитесь с нашей службой поддержки через WhatsApp.
          </p>

          <div className="mb-6 overflow-hidden rounded-lg">
            <Image
                alt="Команда поддержки"
                className="w-full object-cover"
                height={300}
                src="https://placehold.co/600x300.png"
                data-ai-hint="customer support team"
                width={600}
              />
          </div>

          <div className="flex items-center justify-between rounded-lg border bg-card p-4">
            <div>
              <h2 className="font-semibold">Связаться с поддержкой</h2>
              <p className="text-sm text-muted-foreground">Наша команда готова вам помочь.</p>
            </div>
            <Button asChild className="shrink-0 bg-accent text-accent-foreground hover:bg-accent/90">
              <a href={`https://wa.me/79286929192?text=${encodeURIComponent("Помогите, пожалуйста")}`} target="_blank" rel="noopener noreferrer">
                  Связаться с поддержкой
              </a>
            </Button>
          </div>
      </div>
    </div>
  );
}

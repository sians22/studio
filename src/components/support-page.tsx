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
        <h1 className="text-xl font-bold">Support</h1>
      </header>

      <div className="p-4 pt-0">
          <p className="mb-6 text-muted-foreground">
            If you have any questions or concerns, please contact our customer support team via WhatsApp.
          </p>

          <div className="mb-6 overflow-hidden rounded-lg">
            <Image
                alt="Customer support team"
                className="w-full object-cover"
                height={300}
                src="https://placehold.co/600x300.png"
                data-ai-hint="customer support team"
                width={600}
              />
          </div>

          <div className="flex items-center justify-between rounded-lg border bg-card p-4">
            <div>
              <h2 className="font-semibold">Contact Support</h2>
              <p className="text-sm text-muted-foreground">Our team is ready to assist you.</p>
            </div>
            <Button asChild className="shrink-0 bg-accent text-accent-foreground hover:bg-accent/90">
              <a href={`https://wa.me/905555555555?text=${encodeURIComponent("Yardımcı olur musunuz?")}`} target="_blank" rel="noopener noreferrer">
                  Contact Support
              </a>
            </Button>
          </div>
      </div>
    </div>
  );
}

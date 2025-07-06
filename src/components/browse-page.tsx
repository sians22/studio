"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

type BrowsePageProps = {
  onBack: () => void;
};

export default function BrowsePage({ onBack }: BrowsePageProps) {
  return (
    <div className="container mx-auto max-w-md">
       <header className="relative mb-4 flex items-center justify-center py-4">
        <Button variant="ghost" size="icon" className="absolute left-0" onClick={onBack}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold">Обзор</h1>
      </header>

      <div className="p-4 pt-0">
        <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Искать заказы или курьеров..." className="pl-10" />
        </div>

        <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
                <p>Функционал обзора в разработке.</p>
                <p>Скоро здесь можно будет искать.</p>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}

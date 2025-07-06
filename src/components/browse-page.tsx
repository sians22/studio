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
        <h1 className="text-xl font-bold">Browse</h1>
      </header>

      <div className="p-4 pt-0">
        <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search for orders or couriers..." className="pl-10" />
        </div>

        <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
                <p>Browse functionality is under development.</p>
                <p>Soon you will be able to search here.</p>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}

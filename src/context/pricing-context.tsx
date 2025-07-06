"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useState, useCallback } from "react";

export interface PricingTier {
  range: string;
  price: number;
}

interface PricingContextType {
  tiers: PricingTier[];
  setTiers: (tiers: PricingTier[]) => void;
}

const PricingContext = createContext<PricingContextType | undefined>(undefined);

const initialTiers: PricingTier[] = [
    { range: '0-3 km', price: 10 },
    { range: '3-5 km', price: 20 },
    { range: '5-10 km', price: 30 },
    { range: '10+ km', price: 50 },
];

export function PricingProvider({ children }: { children: ReactNode }) {
  const [tiers, setTiersState] = useState<PricingTier[]>(initialTiers);

  const setTiers = useCallback((newTiers: PricingTier[]) => {
    setTiersState(newTiers);
  }, []);

  return (
    <PricingContext.Provider value={{ tiers, setTiers }}>
      {children}
    </PricingContext.Provider>
  );
}

export function usePricing() {
  const context = useContext(PricingContext);
  if (context === undefined) {
    throw new Error("usePricing must be used within a PricingProvider");
  }
  return context;
}

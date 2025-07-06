"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useOrders } from '@/context/order-context';
import { useAuth } from '@/context/auth-context';
import { usePricing } from '@/context/pricing-context';
import { calculateDeliveryPrice } from '@/ai/flows/calculate-delivery-price';
import type { CalculateDeliveryPriceOutput } from '@/ai/flows/calculate-delivery-price';
import { Loader2, Rocket, MapPin, Wallet } from 'lucide-react';

const formSchema = z.object({
  pickupAddress: z.string().min(10, 'Please enter a valid pickup address.'),
  dropoffAddress: z.string().min(10, 'Please enter a valid drop-off address.'),
});

type CreateOrderFormProps = {
  onOrderCreated: () => void;
};

export default function CreateOrderForm({ onOrderCreated }: CreateOrderFormProps) {
  const { toast } = useToast();
  const { addOrder } = useOrders();
  const { user } = useAuth();
  const { tiers: pricingTiers } = usePricing();
  const [priceInfo, setPriceInfo] = useState<CalculateDeliveryPriceOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pickupAddress: '',
      dropoffAddress: '',
    },
  });

  async function handleCalculatePrice(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setPriceInfo(null);
    try {
      const result = await calculateDeliveryPrice({ ...values, pricingTiers });
      setPriceInfo(result);
    } catch (error) {
      console.error('Error calculating price:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not calculate delivery price. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleConfirmOrder() {
    if (priceInfo && user) {
      addOrder({
        customerId: user.id,
        pickupAddress: form.getValues('pickupAddress'),
        dropoffAddress: form.getValues('dropoffAddress'),
        price: priceInfo.priceTl,
        distance: priceInfo.distanceKm,
      });
      toast({
        title: 'Order Created!',
        description: 'Your order has been placed successfully.',
      });
      onOrderCreated();
    }
  }

  return (
    <div className="container mx-auto max-w-2xl p-4">
      <Card>
        <CardHeader>
          <CardTitle>Create a New Order</CardTitle>
          <CardDescription>
            Enter pickup and drop-off locations to get a price quote.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleCalculatePrice)}
              className="space-y-6"
            >
              <FormField
                control={form.control}
                name="pickupAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pickup Address</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Istiklal Avenue, Beyoglu, Istanbul" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dropoffAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Drop-off Address</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Sultanahmet Square, Fatih, Istanbul" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wallet className="mr-2 h-4 w-4" />
                )}
                Calculate Price
              </Button>
            </form>
          </Form>

          {priceInfo && (
            <Card className="mt-6 bg-secondary">
              <CardHeader>
                <CardTitle>Price Quote</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4" /> Distance</div>
                    <div className="font-bold">{priceInfo.distanceKm} km</div>
                </div>
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground"><Wallet className="h-4 w-4" /> Price</div>
                    <div className="text-2xl font-bold text-primary">{priceInfo.priceTl} TL</div>
                </div>
                <p className="text-xs text-muted-foreground pt-2">{priceInfo.pricingDetails}</p>
              </CardContent>
              <CardFooter>
                <Button className="w-full bg-accent hover:bg-accent/90" onClick={handleConfirmOrder}>
                  <Rocket className="mr-2 h-4 w-4" /> Confirm Order
                </Button>
              </CardFooter>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

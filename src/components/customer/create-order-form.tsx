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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useOrders } from '@/context/order-context';
import { useAuth } from '@/context/auth-context';
import { usePricing } from '@/context/pricing-context';
import { calculateDeliveryPrice } from '@/ai/flows/calculate-delivery-price';
import type { CalculateDeliveryPriceOutput } from '@/ai/flows/calculate-delivery-price';
import { Loader2, Rocket, MapPin, Wallet, Phone, MessageSquareText } from 'lucide-react';

const formSchema = z.object({
  pickupAddress: z.string().min(10, 'Please enter a valid pickup address.'),
  dropoffAddress: z.string().min(10, 'Please enter a valid drop-off address.'),
  senderPhone: z.string().min(10, 'Please enter a valid phone number.'),
  receiverPhone: z.string().min(10, 'Please enter a valid phone number.'),
  description: z.string().max(200, "Description can't be more than 200 characters.").optional(),
});

const allAddresses = [
    'Istiklal Avenue, Beyoglu, Istanbul',
    'Sultanahmet Square, Fatih, Istanbul',
    'Kadikoy Ferry Terminal, Kadikoy, Istanbul',
    'Bagdat Avenue, Kadikoy, Istanbul',
    'Besiktas Square, Besiktas, Istanbul',
    'Ortakoy Mosque, Besiktas, Istanbul',
    'Galata Tower, Beyoglu, Istanbul',
    'Nisantasi, Sisli, Istanbul',
    'Levent, Besiktas, Istanbul',
    'Maslak, Sariyer, Istanbul',
];

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
  
  const [pickupSuggestions, setPickupSuggestions] = useState<string[]>([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState<string[]>([]);
  const [activeSuggestion, setActiveSuggestion] = useState<'pickup' | 'dropoff' | null>(null);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pickupAddress: '',
      dropoffAddress: '',
      senderPhone: '',
      receiverPhone: '',
      description: '',
    },
  });
  
  const handleAddressChange = (value: string, fieldName: 'pickupAddress' | 'dropoffAddress') => {
    form.setValue(fieldName, value);
    if (value.length > 2) {
        const filtered = allAddresses.filter(addr => addr.toLowerCase().includes(value.toLowerCase()));
        if (fieldName === 'pickupAddress') {
            setPickupSuggestions(filtered);
            setActiveSuggestion('pickup');
        } else {
            setDropoffSuggestions(filtered);
            setActiveSuggestion('dropoff');
        }
    } else {
        setPickupSuggestions([]);
        setDropoffSuggestions([]);
        setActiveSuggestion(null);
    }
  };

  const handleSuggestionClick = (suggestion: string, fieldName: 'pickupAddress' | 'dropoffAddress') => {
      form.setValue(fieldName, suggestion, { shouldValidate: true });
      setPickupSuggestions([]);
      setDropoffSuggestions([]);
      setActiveSuggestion(null);
  };


  async function handleCalculatePrice(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setPriceInfo(null);
    try {
      const result = await calculateDeliveryPrice({ pickupAddress: values.pickupAddress, dropoffAddress: values.dropoffAddress, pricingTiers });
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
      const values = form.getValues();
      addOrder({
        customerId: user.id,
        pickupAddress: values.pickupAddress,
        dropoffAddress: values.dropoffAddress,
        senderPhone: values.senderPhone,
        receiverPhone: values.receiverPhone,
        description: values.description,
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
            Fill in the details below to get a price quote.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleCalculatePrice)}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="pickupAddress"
                  render={({ field }) => (
                    <FormItem className="relative">
                      <FormLabel>Pickup Address</FormLabel>
                      <FormControl>
                        <Input 
                            placeholder="e.g., Istiklal Avenue, Beyoglu, Istanbul" 
                            {...field}
                            onChange={e => handleAddressChange(e.target.value, 'pickupAddress')}
                            onFocus={e => handleAddressChange(e.target.value, 'pickupAddress')}
                            onBlur={() => setTimeout(() => setActiveSuggestion(null), 150)}
                            autoComplete="off"
                        />
                      </FormControl>
                      {activeSuggestion === 'pickup' && pickupSuggestions.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-card border rounded-md shadow-lg max-h-48 overflow-y-auto">
                              {pickupSuggestions.map(s => (
                                  <div key={s} onMouseDown={() => handleSuggestionClick(s, 'pickupAddress')} className="p-2 text-sm hover:bg-muted cursor-pointer">
                                      {s}
                                  </div>
                              ))}
                          </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dropoffAddress"
                  render={({ field }) => (
                     <FormItem className="relative">
                      <FormLabel>Drop-off Address</FormLabel>
                      <FormControl>
                        <Input 
                            placeholder="e.g., Sultanahmet Square, Fatih, Istanbul" 
                            {...field}
                            onChange={e => handleAddressChange(e.target.value, 'dropoffAddress')}
                            onFocus={e => handleAddressChange(e.target.value, 'dropoffAddress')}
                            onBlur={() => setTimeout(() => setActiveSuggestion(null), 150)}
                            autoComplete="off"
                        />
                      </FormControl>
                       {activeSuggestion === 'dropoff' && dropoffSuggestions.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-card border rounded-md shadow-lg max-h-48 overflow-y-auto">
                              {dropoffSuggestions.map(s => (
                                  <div key={s} onMouseDown={() => handleSuggestionClick(s, 'dropoffAddress')} className="p-2 text-sm hover:bg-muted cursor-pointer">
                                      {s}
                                  </div>
                              ))}
                          </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="senderPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sender's Phone</FormLabel>
                       <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <FormControl>
                          <Input type="tel" placeholder="555-555-5555" {...field} className="pl-10" />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="receiverPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Receiver's Phone</FormLabel>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <FormControl>
                           <Input type="tel" placeholder="555-555-5555" {...field} className="pl-10" />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <div className="md:col-span-2">
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                           <div className="relative">
                              <MessageSquareText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <FormControl>
                                <Textarea placeholder="e.g., It's a fragile item." {...field} className="pl-10" />
                              </FormControl>
                           </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                 </div>
              </div>
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : <Wallet />}
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

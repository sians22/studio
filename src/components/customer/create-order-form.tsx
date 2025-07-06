"use client";

import { useState, useRef } from 'react';
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
import { searchAddress } from '@/ai/flows/search-address';
import { Loader2, Rocket, MapPin, Wallet, Phone, MessageSquareText } from 'lucide-react';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  pickupAddress: z.string().min(10, 'Пожалуйста, введите действительный адрес отправления.'),
  dropoffAddress: z.string().min(10, 'Пожалуйста, введите действительный адрес доставки.'),
  senderPhone: z.string().min(10, 'Пожалуйста, введите действительный номер телефона.'),
  receiverPhone: z.string().min(10, 'Пожалуйста, введите действительный номер телефона.'),
  description: z.string().max(200, "Описание не может превышать 200 символов.").optional(),
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
  
  const [pickupSuggestions, setPickupSuggestions] = useState<string[]>([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState< 'pickup' | 'dropoff' | null>(null);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);


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
    form.setValue(fieldName, value, { shouldValidate: false });
    const setter = fieldName === 'pickupAddress' ? setPickupSuggestions : setDropoffSuggestions;

    if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
    }

    if (value.length < 3) {
        setter([]);
        return;
    }
    
    setIsSearching(fieldName);
    setter(['Поиск...']);

    debounceTimeout.current = setTimeout(async () => {
        try {
            const results = await searchAddress({ query: value });
            setter(results.length > 0 ? results : ['Ничего не найдено.']);
        } catch (error) {
            console.error("Error searching address:", error);
            setter(['Ошибка поиска.']);
        } finally {
            setIsSearching(null);
        }
    }, 500); // 500ms debounce
  };

  const handleSuggestionClick = (suggestion: string, fieldName: 'pickupAddress' | 'dropoffAddress') => {
      const isStatusMessage = ['Поиск...', 'Ничего не найдено.', 'Ошибка поиска.'].includes(suggestion);
      if (isStatusMessage) return;

      form.setValue(fieldName, suggestion, { shouldValidate: true });
      if (fieldName === 'pickupAddress') {
        setPickupSuggestions([]);
      } else {
        setDropoffSuggestions([]);
      }
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
        title: 'Ошибка',
        description: 'Не удалось рассчитать стоимость доставки. Пожалуйста, попробуйте еще раз.',
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
        title: 'Заказ создан!',
        description: 'Ваш заказ успешно размещен.',
      });
      onOrderCreated();
    }
  }

  const renderSuggestions = (suggestions: string[], fieldName: 'pickupAddress' | 'dropoffAddress') => {
      if (suggestions.length === 0) return null;
      
      const isLoading = isSearching === fieldName;

      return (
        <div className="absolute z-10 w-full mt-1 bg-card border rounded-md shadow-lg max-h-48 overflow-y-auto">
            {suggestions.map((s, i) => {
                const isStatusMessage = ['Поиск...', 'Ничего не найдено.', 'Ошибка поиска.'].includes(s);
                return (
                    <div 
                        key={`${s}-${i}`} 
                        onMouseDown={() => handleSuggestionClick(s, fieldName)} 
                        className={cn(
                          "p-2 text-sm flex items-center gap-2",
                          isStatusMessage ? 'text-muted-foreground' : 'cursor-pointer hover:bg-muted'
                        )}
                    >
                        {isLoading && s === 'Поиск...' && <Loader2 className="h-4 w-4 animate-spin" />}
                        {s}
                    </div>
                );
            })}
        </div>
      )
  }

  return (
    <div className="container mx-auto max-w-2xl p-4">
      <Card>
        <CardHeader>
          <CardTitle>Создать новый заказ</CardTitle>
          <CardDescription>
            Заполните детали ниже, чтобы получить расчет цены.
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
                    <FormItem>
                      <FormLabel>Адрес отправления</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input 
                              placeholder="например, ул. Тверская, Москва" 
                              {...field}
                              onChange={e => handleAddressChange(e.target.value, 'pickupAddress')}
                              onBlur={() => setTimeout(() => setPickupSuggestions([]), 150)}
                              autoComplete="off"
                          />
                        </FormControl>
                        {renderSuggestions(pickupSuggestions, 'pickupAddress')}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dropoffAddress"
                  render={({ field }) => (
                     <FormItem>
                      <FormLabel>Адрес доставки</FormLabel>
                       <div className="relative">
                        <FormControl>
                          <Input 
                              placeholder="например, Красная площадь, Москва" 
                              {...field}
                              onChange={e => handleAddressChange(e.target.value, 'dropoffAddress')}
                              onBlur={() => setTimeout(() => setDropoffSuggestions([]), 150)}
                              autoComplete="off"
                          />
                        </FormControl>
                         {renderSuggestions(dropoffSuggestions, 'dropoffAddress')}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="senderPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Телефон отправителя</FormLabel>
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
                      <FormLabel>Телефон получателя</FormLabel>
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
                          <FormLabel>Описание (необязательно)</FormLabel>
                           <div className="relative">
                              <MessageSquareText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <FormControl>
                                <Textarea placeholder="например, Хрупкий предмет." {...field} className="pl-10" />
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
                Рассчитать стоимость
              </Button>
            </form>
          </Form>

          {priceInfo && (
            <Card className="mt-6 bg-secondary">
              <CardHeader>
                <CardTitle>Расчет стоимости</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4" /> Расстояние</div>
                    <div className="font-bold">{priceInfo.distanceKm} km</div>
                </div>
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground"><Wallet className="h-4 w-4" /> Цена</div>
                    <div className="text-2xl font-bold text-primary">{priceInfo.priceTl} TL</div>
                </div>
                <p className="text-xs text-muted-foreground pt-2">{priceInfo.pricingDetails}</p>
              </CardContent>
              <CardFooter>
                <Button className="w-full bg-accent hover:bg-accent/90" onClick={handleConfirmOrder}>
                  <Rocket className="mr-2 h-4 w-4" /> Подтвердить заказ
                </Button>
              </CardFooter>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

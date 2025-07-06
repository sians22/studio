"use client";

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useOrders } from '@/context/order-context';
import { useAuth } from '@/context/auth-context';
import { usePricing } from '@/context/pricing-context';
import { createOrderFromText, CreateOrderFromTextOutput } from '@/ai/flows/create-order-from-text';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, MapPin, Wallet, Phone, MessageSquareText, Rocket, Wand2 } from 'lucide-react';

export default function AiOrderPage({ onOrderCreated }: { onOrderCreated: () => void }) {
  const { toast } = useToast();
  const { addOrder } = useOrders();
  const { user } = useAuth();
  const { tiers: pricingTiers } = usePricing();

  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<CreateOrderFromTextOutput | null>(null);

  const handleProcessRequest = async () => {
    if (!userInput.trim()) {
        toast({ variant: 'destructive', title: 'Ошибка', description: 'Пожалуйста, введите ваш запрос.' });
        return;
    }
    setIsLoading(true);
    setConfirmedOrder(null);
    try {
      const result = await createOrderFromText({
        query: userInput,
        pricingTiers,
      });
      setConfirmedOrder(result);
    } catch (error: any) {
      console.error(error);
      toast({ 
          variant: 'destructive', 
          title: 'Ошибка обработки запроса', 
          description: error.message,
          duration: 9000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmOrder = () => {
    if (!confirmedOrder || !user) return;
    addOrder({
      customerId: user.id,
      pickupAddress: confirmedOrder.pickupAddress,
      dropoffAddress: confirmedOrder.dropoffAddress,
      senderPhone: confirmedOrder.senderPhone || '',
      receiverPhone: confirmedOrder.receiverPhone || '',
      description: confirmedOrder.description,
      price: confirmedOrder.priceTl,
      distance: confirmedOrder.distanceKm,
    });
    toast({ title: 'Заказ создан!', description: 'Ваш заказ успешно размещен.' });
    onOrderCreated();
  };
  
  const resetState = () => {
      setUserInput('');
      setConfirmedOrder(null);
      setIsLoading(false);
  }

  if (confirmedOrder) {
    return (
        <div className="container mx-auto max-w-2xl p-4">
             <Card>
                <CardHeader>
                    <CardTitle>Подтвердите ваш заказ</CardTitle>
                    <CardDescription>Пожалуйста, проверьте детали, сгенерированные ИИ, перед подтверждением.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2 rounded-lg border p-3">
                        <div className="flex items-start gap-3">
                            <MapPin className="h-5 w-5 mt-1 text-primary" />
                            <div>
                                <p className="text-sm font-medium">Откуда:</p>
                                <p className="text-muted-foreground">{confirmedOrder.pickupAddress}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <MapPin className="h-5 w-5 mt-1 text-destructive" />
                            <div>
                                <p className="text-sm font-medium">Куда:</p>
                                <p className="text-muted-foreground">{confirmedOrder.dropoffAddress}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between rounded-lg bg-muted p-3">
                        <div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4" /> Расстояние</div>
                            <div className="font-bold">{confirmedOrder.distanceKm} km</div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Wallet className="h-4 w-4" /> Цена</div>
                            <div className="text-2xl font-bold text-primary">{confirmedOrder.priceTl} руб.</div>
                        </div>
                    </div>
                    
                    {confirmedOrder.senderPhone && <p className="text-sm"><Phone className="inline h-4 w-4 mr-2" /> <strong>Телефон отправителя:</strong> {confirmedOrder.senderPhone}</p>}
                    {confirmedOrder.receiverPhone && <p className="text-sm"><Phone className="inline h-4 w-4 mr-2" /> <strong>Телефон получателя:</strong> {confirmedOrder.receiverPhone}</p>}
                    {confirmedOrder.description && <p className="text-sm"><MessageSquareText className="inline h-4 w-4 mr-2" /> <strong>Примечание:</strong> {confirmedOrder.description}</p>}

                </CardContent>
                <CardFooter className="flex flex-col gap-2 md:flex-row">
                    <Button className="w-full" onClick={handleConfirmOrder}>
                        <Rocket className="mr-2"/>
                        Подтвердить и заказать
                    </Button>
                     <Button variant="outline" className="w-full" onClick={() => setConfirmedOrder(null)}>
                        Назад
                    </Button>
                </CardFooter>
             </Card>
        </div>
    )
  }

  return (
    <div className="container mx-auto max-w-2xl p-4">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Wand2 /> Создать заказ с помощью ИИ</CardTitle>
                <CardDescription>
                    Опишите ваш заказ в свободной форме. Например: "Нужно забрать документы из Таксима и доставить в Галатскую башню. Мой номер 555-123, получателя 555-456."
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Textarea 
                    placeholder="Напишите ваш запрос здесь..."
                    rows={6}
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    disabled={isLoading}
                />
            </CardContent>
            <CardFooter>
                 <Button className="w-full" onClick={handleProcessRequest} disabled={isLoading}>
                    {isLoading ? <Loader2 className="animate-spin" /> : <Sparkles className="mr-2"/>}
                    Обработать запрос
                </Button>
            </CardFooter>
        </Card>
    </div>
  );
}

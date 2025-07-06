"use client";

import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useOrders } from '@/context/order-context';
import { useAuth } from '@/context/auth-context';
import { usePricing } from '@/context/pricing-context';
import { processChat, ConversationalOrderOutput } from '@/ai/flows/conversational-order';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Sparkles, MapPin, Wallet, Phone, MessageSquareText, Rocket, Wand2, Send, User, Bot } from 'lucide-react';

type ChatMessage = {
  role: 'user' | 'model';
  content: string;
}

export default function AiOrderPage({ onOrderCreated }: { onOrderCreated: () => void }) {
  const { toast } = useToast();
  const { addOrder } = useOrders();
  const { user } = useAuth();
  const { tiers: pricingTiers } = usePricing();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [orderConfirmation, setOrderConfirmation] = useState<ConversationalOrderOutput['orderData'] | null>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Initial greeting from the bot
  useEffect(() => {
    const getInitialMessage = async () => {
        setIsLoading(true);
        try {
            const result = await processChat({ chatHistory: [], pricingTiers });
            setMessages([{ role: 'model', content: result.response }]);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Ошибка AI', description: error.message });
        } finally {
            setIsLoading(false);
        }
    };
    getInitialMessage();
  }, [pricingTiers, toast]);


  const handleSend = async () => {
    if (!input.trim() || isLoading || !user) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const result = await processChat({
        chatHistory: newMessages,
        pricingTiers,
      });
      
      setMessages(prev => [...prev, { role: 'model', content: result.response }]);

      if (result.isComplete && result.orderData) {
        addOrder({
            customerId: user.id,
            pickupAddress: result.orderData.pickupAddress,
            dropoffAddress: result.orderData.dropoffAddress,
            senderPhone: result.orderData.senderPhone,
            receiverPhone: result.orderData.receiverPhone,
            description: result.orderData.description,
            price: result.orderData.priceTl,
            distance: result.orderData.distanceKm,
        });
        setOrderConfirmation(result.orderData);
      }

    } catch (error: any) {
      console.error(error);
      toast({ 
          variant: 'destructive', 
          title: 'Ошибка обработки запроса', 
          description: error.message,
          duration: 9000,
      });
       setMessages(prev => [...prev, { role: 'model', content: "Что-то пошло не так. Пожалуйста, попробуйте еще раз." }]);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (orderConfirmation) {
     return (
        <div className="container mx-auto max-w-2xl p-4">
             <Card>
                <CardHeader>
                    <CardTitle>Заказ успешно размещен!</CardTitle>
                    <CardDescription>Спасибо! Ваш заказ был создан и скоро будет назначен курьер.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-2 rounded-lg border p-3">
                        <div className="flex items-start gap-3">
                            <MapPin className="h-5 w-5 mt-1 text-primary" />
                            <div>
                                <p className="text-sm font-medium">Откуда:</p>
                                <p className="text-muted-foreground">{orderConfirmation.pickupAddress}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <MapPin className="h-5 w-5 mt-1 text-destructive" />
                            <div>
                                <p className="text-sm font-medium">Куда:</p>
                                <p className="text-muted-foreground">{orderConfirmation.dropoffAddress}</p>
                            </div>
                        </div>
                    </div>
                     <p className="text-sm"><Wallet className="inline h-4 w-4 mr-2" /> <strong>Цена:</strong> {orderConfirmation.priceTl} руб.</p>
                </CardContent>
                <CardFooter>
                    <Button className="w-full" onClick={onOrderCreated}>
                        К моим заказам
                    </Button>
                </CardFooter>
             </Card>
        </div>
    )
  }


  return (
    <div className="container mx-auto max-w-2xl p-4 flex flex-col h-[calc(100vh-80px)] md:h-auto">
        <Card className="flex flex-col flex-1">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Wand2 /> Создать заказ с помощью AI</CardTitle>
                <CardDescription>
                    Ответьте на вопросы чат-бота, чтобы быстро оформить заказ на доставку.
                </CardDescription>
            </CardHeader>
            <CardContent ref={chatContainerRef} className="flex-1 space-y-4 overflow-y-auto pr-6">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                         {msg.role === 'model' && (
                            <div className="p-2 bg-primary/10 rounded-full">
                                <Bot className="h-5 w-5 text-primary" />
                            </div>
                        )}
                        <div className={`rounded-lg p-3 max-w-[80%] ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                            <p className="text-sm">{msg.content}</p>
                        </div>
                         {msg.role === 'user' && (
                            <div className="p-2 bg-muted rounded-full">
                                <User className="h-5 w-5 text-foreground" />
                            </div>
                        )}
                    </div>
                ))}
                {isLoading && (
                     <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary/10 rounded-full">
                            <Bot className="h-5 w-5 text-primary" />
                        </div>
                        <div className="rounded-lg p-3 bg-muted flex items-center">
                           <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        </div>
                    </div>
                )}
            </CardContent>
            <CardFooter className="pt-4 border-t">
                 <div className="flex w-full items-center space-x-2">
                    <Input 
                        placeholder="Напишите ваш ответ..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        disabled={isLoading}
                    />
                    <Button onClick={handleSend} disabled={isLoading}>
                        <Send className="h-4 w-4" />
                        <span className="sr-only">Отправить</span>
                    </Button>
                </div>
            </CardFooter>
        </Card>
    </div>
  );
}

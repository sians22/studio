"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useOrders } from '@/context/order-context';
import { useAuth } from '@/context/auth-context';
import { usePricing } from '@/context/pricing-context';
import { calculateDeliveryPrice, type CalculateDeliveryPriceOutput } from '@/ai/flows/calculate-delivery-price';
import { searchAddress } from '@/ai/flows/search-address';
import { Loader2, Rocket, MapPin, Wallet, Phone, MessageSquareText, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '../ui/card';

type OrderStep = 'pickup' | 'pickupDetails' | 'dropoff' | 'dropoffDetails' | 'senderPhone' | 'receiverPhone' | 'description' | 'calculating' | 'confirming' | 'done';

const initialFormData = {
  pickupAddress: '',
  pickupDetails: '',
  dropoffAddress: '',
  dropoffDetails: '',
  senderPhone: '',
  receiverPhone: '',
  description: '',
};

const steps: OrderStep[] = ['pickup', 'pickupDetails', 'dropoff', 'dropoffDetails', 'senderPhone', 'receiverPhone', 'description', 'confirming'];

export default function CreateOrderModal({ isOpen, onOpenChange }: { isOpen: boolean; onOpenChange: (open: boolean) => void; }) {
  const { toast } = useToast();
  const { addOrder } = useOrders();
  const { user } = useAuth();
  const { tiers: pricingTiers } = usePricing();
  
  const [step, setStep] = useState<OrderStep>('pickup');
  const [formData, setFormData] = useState(initialFormData);
  const [priceInfo, setPriceInfo] = useState<CalculateDeliveryPriceOutput | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  
  const currentStepIndex = steps.indexOf(step);
  const progressValue = currentStepIndex >= 0 ? ((currentStepIndex + 1) / steps.length) * 100 : 0;

  const resetState = useCallback(() => {
    setStep('pickup');
    setFormData(initialFormData);
    setPriceInfo(null);
    setSuggestions([]);
    setIsSearching(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      resetState();
    }
  }, [isOpen, resetState]);

  const handleNext = async () => {
    switch (step) {
      case 'pickup':
        if (formData.pickupAddress.length < 10) return;
        setStep('pickupDetails');
        break;
      case 'pickupDetails':
        setStep('dropoff');
        break;
      case 'dropoff':
        if (formData.dropoffAddress.length < 10) return;
        setStep('dropoffDetails');
        break;
      case 'dropoffDetails':
        setStep('senderPhone');
        break;
      case 'senderPhone':
        if (formData.senderPhone.length < 10) return;
        setStep('receiverPhone');
        break;
      case 'receiverPhone':
        if (formData.receiverPhone.length < 10) return;
        setStep('description');
        break;
      case 'description':
        setStep('calculating');
        try {
          const result = await calculateDeliveryPrice({ pickupAddress: formData.pickupAddress, dropoffAddress: formData.dropoffAddress, pricingTiers });
          setPriceInfo(result);
          setStep('confirming');
        } catch (error) {
          console.error('Error calculating price:', error);
          toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось рассчитать стоимость.' });
          setStep('description');
        }
        break;
      case 'confirming':
        if (priceInfo && user) {
          const finalPickupAddress = [formData.pickupAddress, formData.pickupDetails].filter(Boolean).join(', ');
          const finalDropoffAddress = [formData.dropoffAddress, formData.dropoffDetails].filter(Boolean).join(', ');
          
          addOrder({
            customerId: user.id,
            pickupAddress: finalPickupAddress,
            dropoffAddress: finalDropoffAddress,
            senderPhone: formData.senderPhone,
            receiverPhone: formData.receiverPhone,
            description: formData.description,
            price: priceInfo.priceTl,
            distance: priceInfo.distanceKm,
          });
          toast({ title: 'Заказ создан!', description: 'Ваш заказ успешно размещен.' });
          setStep('done');
        }
        break;
    }
    setSuggestions([]);
  };

  const handleBack = () => {
    const prevStepIndex = Math.max(0, currentStepIndex - 1);
    setStep(steps[prevStepIndex]);
    setSuggestions([]);
  };

  const handleAddressChange = (value: string, fieldName: 'pickupAddress' | 'dropoffAddress') => {
    setFormData(prev => ({...prev, [fieldName]: value}));
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

    if (value.length < 3) {
      setSuggestions([]);
      return;
    }
    
    setIsSearching(true);
    setSuggestions(['Поиск...']);

    debounceTimeout.current = setTimeout(async () => {
      try {
        const results = await searchAddress({ query: value });
        setSuggestions(results.length > 0 ? results : ['Ничего не найдено.']);
      } catch (error) {
        console.error("Error searching address:", error);
        setSuggestions(['Ошибка поиска.']);
      } finally {
        setIsSearching(false);
      }
    }, 500);
  };
  
  const handleSuggestionClick = (suggestion: string, fieldName: 'pickupAddress' | 'dropoffAddress') => {
    const isStatusMessage = ['Поиск...', 'Ничего не найдено.', 'Ошибка поиска.'].includes(suggestion);
    if (isStatusMessage) return;

    setFormData(prev => ({ ...prev, [fieldName]: suggestion }));
    setSuggestions([]);

    if (fieldName === 'pickupAddress') {
        setStep('pickupDetails');
    } else if (fieldName === 'dropoffAddress') {
        setStep('dropoffDetails');
    }
  };
  
  const renderAddressSuggestions = (fieldName: 'pickupAddress' | 'dropoffAddress') => {
    if (suggestions.length === 0) return null;
    return (
      <div className="absolute z-20 w-full mt-1 bg-card border rounded-md shadow-lg max-h-48 overflow-y-auto">
        {suggestions.map((s, i) => (
          <div key={`${s}-${i}`} onMouseDown={() => handleSuggestionClick(s, fieldName)} className={cn("p-2 text-sm flex items-center gap-2", isSearching && s === 'Поиск...' ? 'text-muted-foreground' : 'cursor-pointer hover:bg-muted')}>
            {isSearching && s === 'Поиск...' && <Loader2 className="h-4 w-4 animate-spin" />}
            {s}
          </div>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    switch (step) {
      case 'pickup':
        return (
          <div>
            <DialogDescription>Шаг 1: Введите адрес, откуда нужно забрать посылку.</DialogDescription>
            <div className="relative mt-4">
              <Input placeholder="Город, улица и номер дома" value={formData.pickupAddress} onChange={e => handleAddressChange(e.target.value, 'pickupAddress')} autoComplete="off" />
              {renderAddressSuggestions('pickupAddress')}
            </div>
          </div>
        );
      case 'pickupDetails':
        return (
          <div>
            <DialogDescription>Уточните адрес отправления (необязательно).</DialogDescription>
            <div className="relative mt-4">
              <Input placeholder="Квартира, офис, подъезд" value={formData.pickupDetails} onChange={e => setFormData({...formData, pickupDetails: e.target.value})} autoComplete="off" />
            </div>
          </div>
        );
      case 'dropoff':
        return (
            <div>
              <DialogDescription>Шаг 2: Введите адрес, куда нужно доставить.</DialogDescription>
              <div className="relative mt-4">
                <Input placeholder="Город, улица и номер дома" value={formData.dropoffAddress} onChange={e => handleAddressChange(e.target.value, 'dropoffAddress')} autoComplete="off" />
                {renderAddressSuggestions('dropoffAddress')}
              </div>
            </div>
          );
      case 'dropoffDetails':
        return (
          <div>
            <DialogDescription>Уточните адрес доставки (необязательно).</DialogDescription>
            <div className="relative mt-4">
              <Input placeholder="Квартира, офис, подъезд" value={formData.dropoffDetails} onChange={e => setFormData({...formData, dropoffDetails: e.target.value})} autoComplete="off" />
            </div>
          </div>
        );
      case 'senderPhone':
        return (
            <div>
              <DialogDescription>Шаг 3: Введите номер телефона отправителя.</DialogDescription>
              <div className="relative mt-4">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="tel" placeholder="555-555-5555" value={formData.senderPhone} onChange={e => setFormData({...formData, senderPhone: e.target.value})} className="pl-10"/>
              </div>
            </div>
          );
      case 'receiverPhone':
         return (
            <div>
              <DialogDescription>Шаг 4: Введите номер телефона получателя.</DialogDescription>
              <div className="relative mt-4">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="tel" placeholder="555-555-5555" value={formData.receiverPhone} onChange={e => setFormData({...formData, receiverPhone: e.target.value})} className="pl-10" />
              </div>
            </div>
          );
      case 'description':
        return (
            <div>
              <DialogDescription>Шаг 5: Добавьте описание (необязательно).</DialogDescription>
              <div className="relative mt-4">
                <MessageSquareText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Textarea placeholder="например, Хрупкий предмет." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="pl-10" />
              </div>
            </div>
          );
      case 'calculating':
        return <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
      case 'confirming':
        if (!priceInfo) return null;
        return (
          <Card className="bg-secondary">
            <CardHeader>
              <CardTitle>Подтверждение заказа</CardTitle>
              <DialogDescription>Проверьте детали и подтвердите заказ.</DialogDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4" /> Расстояние</span><span className="font-bold">{priceInfo.distanceKm} km</span></div>
              <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-muted-foreground"><Wallet className="h-4 w-4" /> Цена</span><span className="text-2xl font-bold text-primary">{priceInfo.priceTl} руб.</span></div>
              <p className="text-xs text-muted-foreground pt-2">{priceInfo.pricingDetails}</p>
            </CardContent>
          </Card>
        );
      case 'done':
         return (
             <div className="text-center py-10">
                <Rocket className="mx-auto h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-xl font-bold">Заказ успешно создан!</h3>
                <p className="text-muted-foreground">Курьер скоро будет назначен.</p>
             </div>
         );
      default:
        return null;
    }
  };

  const isNextDisabled = () => {
    switch(step) {
        case 'pickup': return formData.pickupAddress.length < 10;
        case 'pickupDetails': return false;
        case 'dropoff': return formData.dropoffAddress.length < 10;
        case 'dropoffDetails': return false;
        case 'senderPhone': return formData.senderPhone.length < 10;
        case 'receiverPhone': return formData.receiverPhone.length < 10;
        default: return false;
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Создать новый заказ</DialogTitle>
          <Progress value={progressValue} className="mt-2" />
        </DialogHeader>
        <div className="py-4">
          {renderContent()}
        </div>
        <DialogFooter>
          {step !== 'done' && step !== 'calculating' && currentStepIndex > 0 && (
            <Button variant="ghost" onClick={handleBack}><ArrowLeft className="mr-2 h-4 w-4" /> Назад</Button>
          )}
          {step === 'done' ? (
            <Button onClick={() => onOpenChange(false)} className="w-full">Закрыть</Button>
          ) : (
            step !== 'calculating' &&
            step !== 'pickup' &&
            step !== 'dropoff' && (
              <Button onClick={handleNext} disabled={isNextDisabled()}>
                {step === 'confirming' ? 'Подтвердить заказ' : step === 'description' ? 'Рассчитать стоимость' : 'Далее'}
              </Button>
            )
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

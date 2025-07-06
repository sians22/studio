"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { YMaps, Map, Placemark, Polyline } from '@pbe/react-yandex-maps';
import { useDebounce } from '@/hooks/use-debounce';
import { useToast } from '@/hooks/use-toast';
import { useOrders } from '@/context/order-context';
import { useAuth } from '@/context/auth-context';
import { usePricing } from '@/context/pricing-context';
import { searchAddress, SearchAddressOutput } from '@/ai/flows/search-address';
import { calculateDeliveryPrice, CalculateDeliveryPriceOutput } from '@/ai/flows/calculate-delivery-price';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowLeft, MapPin, Wallet, Phone, MessageSquareText, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';

type OrderStep = 'pickup' | 'dropoff' | 'details' | 'confirm';
type Address = { text: string; coords: [number, number] };

export default function MapOrderPage({ onOrderCreated }: { onOrderCreated: () => void }) {
  const { toast } = useToast();
  const { addOrder } = useOrders();
  const { user } = useAuth();
  const { tiers: pricingTiers } = usePricing();

  const [step, setStep] = useState<OrderStep>('pickup');
  const [pickup, setPickup] = useState<Address | null>(null);
  const [dropoff, setDropoff] = useState<Address | null>(null);
  const [priceInfo, setPriceInfo] = useState<CalculateDeliveryPriceOutput | null>(null);
  
  const [senderPhone, setSenderPhone] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [description, setDescription] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [suggestions, setSuggestions] = useState<SearchAddressOutput>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (debouncedSearchQuery.length > 2) {
      setIsSearching(true);
      searchAddress({ query: debouncedSearchQuery })
        .then(setSuggestions)
        .catch(() => toast({ variant: 'destructive', title: 'Ошибка поиска адреса' }))
        .finally(() => setIsSearching(false));
    } else {
      setSuggestions([]);
    }
  }, [debouncedSearchQuery, toast]);

  const handleSelectAddress = (address: Address) => {
    if (step === 'pickup') {
      setPickup(address);
      setStep('dropoff');
      setSearchQuery('');
      setSuggestions([]);
    } else if (step === 'dropoff') {
      setDropoff(address);
      setSearchQuery('');
      setSuggestions([]);
    }
  };

  const handleCalculate = async () => {
    if (!pickup || !dropoff) return;
    setIsLoading(true);
    try {
      const result = await calculateDeliveryPrice({
        pickupAddress: pickup.text,
        dropoffAddress: dropoff.text,
        pricingTiers,
      });
      setPriceInfo(result);
      setStep('details');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось рассчитать стоимость.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!pickup || !dropoff || !priceInfo || !user) return;
     if (senderPhone.length < 10 || receiverPhone.length < 10) {
        toast({ variant: 'destructive', title: 'Ошибка', description: 'Пожалуйста, введите корректные номера телефонов.' });
        return;
    }
    addOrder({
      customerId: user.id,
      pickupAddress: pickup.text,
      dropoffAddress: dropoff.text,
      senderPhone,
      receiverPhone,
      description,
      price: priceInfo.priceTl,
      distance: priceInfo.distanceKm,
    });
    toast({ title: 'Заказ создан!', description: 'Ваш заказ успешно размещен.' });
    onOrderCreated();
  };

  const reset = () => {
    setStep('pickup');
    setPickup(null);
    setDropoff(null);
    setPriceInfo(null);
    setSearchQuery('');
  };

  const mapState = useMemo(() => {
    if (priceInfo && priceInfo.routeGeometry.length > 0) {
      return { bounds: priceInfo.routeGeometry, zoom: undefined, center: undefined };
    }
    if (dropoff) return { center: dropoff.coords, zoom: 15, bounds: undefined };
    if (pickup) return { center: pickup.coords, zoom: 15, bounds: undefined };
    return { center: [43.318, 45.698], zoom: 12, bounds: undefined }; // Grozny coordinates
  }, [pickup, dropoff, priceInfo]);

  const apiKey = process.env.NEXT_PUBLIC_YANDEX_API_KEY;

  if (!apiKey) {
    return <div className="flex h-full items-center justify-center">Ошибка: Ключ API Яндекс не найден.</div>;
  }

  const renderPanelContent = () => {
    switch (step) {
      case 'pickup':
      case 'dropoff':
        return (
          <>
            <CardHeader>
              <CardTitle>{step === 'pickup' ? 'Откуда забрать?' : 'Куда доставить?'}</CardTitle>
              <CardDescription>Начните вводить адрес, чтобы увидеть предложения.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {pickup && (
                  <div className="flex-1 rounded-md bg-muted p-2 text-sm">
                    <span className="font-semibold">От:</span> {pickup.text}
                  </div>
                )}
                {dropoff && (
                  <div className="flex-1 rounded-md bg-muted p-2 text-sm">
                    <span className="font-semibold">До:</span> {dropoff.text}
                  </div>
                )}
              </div>
              <div className="relative mt-4">
                <Input
                  placeholder="Улица, дом..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                {isSearching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
              </div>
              {suggestions.length > 0 && (
                <div className="mt-2 max-h-48 overflow-y-auto rounded-md border">
                  {suggestions.map((s) => (
                    <div
                      key={s.coords.join(',')}
                      onClick={() => handleSelectAddress(s)}
                      className="cursor-pointer p-2 text-sm hover:bg-muted"
                    >
                      {s.address}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            {pickup && dropoff && (
              <CardFooter>
                <Button className="w-full" onClick={handleCalculate} disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin" /> : <Wallet />}
                  Рассчитать стоимость
                </Button>
              </CardFooter>
            )}
          </>
        );
      case 'details':
      case 'confirm':
        if (!priceInfo) return null;
        return (
          <>
            <CardHeader>
                <div className="flex items-center gap-2">
                   <Button variant="ghost" size="icon" onClick={() => { setPriceInfo(null); setStep('dropoff'); }}>
                        <ArrowLeft />
                   </Button>
                   <CardTitle>Детали заказа</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-muted p-3">
                  <div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4" /> Расстояние</div>
                      <div className="font-bold">{priceInfo.distanceKm} km</div>
                  </div>
                   <div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground"><Wallet className="h-4 w-4" /> Цена</div>
                      <div className="text-2xl font-bold text-primary">{priceInfo.priceTl} руб.</div>
                  </div>
              </div>
               <p className="text-xs text-muted-foreground">{priceInfo.pricingDetails}</p>
              
               <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                 <div className="space-y-2">
                   <label className="text-sm font-medium">Телефон отправителя</label>
                   <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type="tel" placeholder="Номер телефона" value={senderPhone} onChange={e => setSenderPhone(e.target.value)} className="pl-10" />
                   </div>
                 </div>
                 <div className="space-y-2">
                   <label className="text-sm font-medium">Телефон получателя</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type="tel" placeholder="Номер телефона" value={receiverPhone} onChange={e => setReceiverPhone(e.target.value)} className="pl-10" />
                    </div>
                 </div>
               </div>

                <div className="space-y-2">
                   <label className="text-sm font-medium">Примечание (необязательно)</label>
                    <div className="relative">
                        <MessageSquareText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Textarea placeholder="Что-то важное..." value={description} onChange={e => setDescription(e.target.value)} className="pl-10" />
                    </div>
                 </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={handleConfirm} disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : <Rocket />}
                Подтвердить и заказать
              </Button>
            </CardFooter>
          </>
        );
    }
  };

  return (
    <YMaps query={{ apikey: apiKey, lang: 'ru_RU' }}>
      <div className="relative h-full w-full">
        <Map
          instanceRef={mapRef}
          state={mapState}
          width="100%"
          height="100%"
          className="absolute inset-0"
          onLoad={(ymaps: any) => {
             if (mapRef.current && priceInfo?.routeGeometry) {
                mapRef.current.setBounds(mapRef.current.geoObjects.getBounds());
             }
          }}
        >
          {pickup && <Placemark geometry={pickup.coords} />}
          {dropoff && <Placemark geometry={dropoff.coords} />}
          {priceInfo && priceInfo.routeGeometry.length > 0 && (
            <Polyline
              geometry={priceInfo.routeGeometry}
              options={{
                strokeColor: '#007bff',
                strokeWidth: 4,
                strokeOpacity: 0.8,
              }}
            />
          )}
        </Map>
        <div className="absolute top-0 left-0 right-0 z-10 m-2 md:m-4">
            <Button variant="ghost" size="icon" onClick={onOrderCreated} className="absolute top-2 left-2 bg-card hover:bg-muted md:hidden">
              <ArrowLeft />
            </Button>
            <Card className="mx-auto max-w-md">
                {renderPanelContent()}
            </Card>
        </div>
      </div>
    </YMaps>
  );
}

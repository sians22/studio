
"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { YMaps, Map, Placemark } from '@pbe/react-yandex-maps';
import { useDebounce } from '@/hooks/use-debounce';
import { useToast } from '@/hooks/use-toast';
import { useOrders } from '@/context/order-context';
import { useAuth } from '@/context/auth-context';
import { usePricing } from '@/context/pricing-context';
import { searchAddress, SearchAddressOutput } from '@/ai/flows/search-address';
import { getAddressFromCoords } from '@/ai/flows/reverse-geocode';
import { calculateDeliveryPrice, CalculateDeliveryPriceOutput } from '@/ai/flows/calculate-delivery-price';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowLeft, MapPin, Wallet, Phone, MessageSquareText, Rocket, X, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type AddressFocus = 'pickup' | 'dropoff';
type Address = { address: string; coords: [number, number]; kind?: string };

const KIND_TRANSLATIONS: Record<string, string> = {
    house: 'Здания и адреса',
    street: 'Улицы',
    metro: 'Станции метро',
    district: 'Районы',
    locality: 'Населенные пункты',
    other: 'Другое'
};

export default function MapOrderPage({ onDone }: { onDone: () => void }) {
  const { toast } = useToast();
  const { addOrder } = useOrders();
  const { user } = useAuth();
  const { tiers: pricingTiers } = usePricing();
  
  const [addressFocus, setAddressFocus] = useState<AddressFocus>('pickup');

  const [pickup, setPickup] = useState<Address | null>(null);
  const [dropoff, setDropoff] = useState<Address | null>(null);
  const [priceInfo, setPriceInfo] = useState<CalculateDeliveryPriceOutput | null>(null);
  
  const [senderPhone, setSenderPhone] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [description, setDescription] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [suggestions, setSuggestions] = useState<SearchAddressOutput>([]);
  const [noResults, setNoResults] = useState(false);

  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const mapRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (debouncedSearchQuery) {
      setIsSearching(true);
      setSuggestions([]);
      setNoResults(false);
      searchAddress({ query: debouncedSearchQuery })
        .then(results => {
          setSuggestions(results);
          if (results.length === 0) {
            setNoResults(true);
          }
        })
        .catch((err) => toast({ variant: 'destructive', title: 'Ошибка поиска адреса', description: err.message }))
        .finally(() => setIsSearching(false));
    } else {
      setSuggestions([]);
      setNoResults(false);
    }
  }, [debouncedSearchQuery, toast]);
  
  const handleMapClick = async (e: any) => {
    if (isLoading) return;
    const coords: [number, number] = e.get('coords');
    if (!coords) return;

    setIsLoading(true);
    try {
      const result = await getAddressFromCoords({ coords });
      if (result) {
        handleSelectAddress(result);
      } else {
        toast({ variant: 'destructive', title: 'Адрес не найден', description: 'Не удалось определить адрес для этой точки.' });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Ошибка определения адреса', description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAddress = (address: Address) => {
    setSearchQuery('');
    setSuggestions([]);
    setNoResults(false);
    if (addressFocus === 'pickup') {
      setPickup(address);
      setAddressFocus('dropoff');
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setDropoff(address);
    }
  };

  useEffect(() => {
    const calculate = async () => {
      if (!pickup || !dropoff) return;

      setIsLoading(true);
      setPriceInfo(null);

      try {
        const result = await calculateDeliveryPrice({
          pickupAddress: pickup.address,
          dropoffAddress: dropoff.address,
          pickupCoords: pickup.coords,
          dropoffCoords: dropoff.coords,
          pricingTiers,
        });
        setPriceInfo(result);
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Ошибка расчета маршрута', description: error.message, duration: 9000 });
        setDropoff(null);
        setPriceInfo(null);
        setAddressFocus('dropoff');
      } finally {
        setIsLoading(false);
      }
    };
    calculate();
  }, [pickup, dropoff, pricingTiers, toast]);

  const handleConfirmOrder = () => {
    if (!pickup || !dropoff || !priceInfo || !user) return;
     if (senderPhone.length < 10 || receiverPhone.length < 10) {
        toast({ variant: 'destructive', title: 'Ошибка', description: 'Пожалуйста, введите корректные номера телефонов.' });
        return;
    }
    addOrder({
      customerId: user.id,
      pickupAddress: pickup.address,
      dropoffAddress: dropoff.address,
      senderPhone,
      receiverPhone,
      description,
      price: priceInfo.priceTl,
      distance: priceInfo.distanceKm,
    });
    setIsConfirmed(true);
  };
  
  const mapState = useMemo(() => {
    const boundsOptions = { checkZoomRange: true, zoomMargin: 35 };
    if (pickup && dropoff) {
      if (mapRef.current) setTimeout(() => mapRef.current.setBounds([pickup.coords, dropoff.coords], boundsOptions), 100);
      return { center: undefined, zoom: undefined, bounds: [pickup.coords, dropoff.coords] };
    }
    if (dropoff) return { center: dropoff.coords, zoom: 15, bounds: undefined };
    if (pickup) return { center: pickup.coords, zoom: 15, bounds: undefined };
    return { center: [43.318, 45.698], zoom: 12, bounds: undefined };
  }, [pickup, dropoff]);
  
  const apiKey = process.env.NEXT_PUBLIC_YANDEX_MAP_API_KEY;

  if (!apiKey || apiKey === 'YOUR_YANDEX_MAP_API_KEY_HERE') {
    return (
        <div className="flex h-screen flex-col items-center justify-center p-4 text-center">
            <Card className="max-w-sm"><CardHeader><CardTitle className="text-destructive">Ошибка Конфигурации</CardTitle><CardDescription>Ключ API Яндекс Карт не настроен в `.env` файле.</CardDescription></CardHeader></Card>
        </div>
    );
  }

  const renderPanel = () => {
    if (priceInfo) {
         return (
            <>
              <CardHeader className="p-4">
                <div className="flex items-center gap-2">
                   <Button variant="ghost" size="icon" onClick={() => { setPriceInfo(null); setDropoff(null); setAddressFocus('dropoff'); }}>
                        <ArrowLeft />
                   </Button>
                   <CardTitle>Подтверждение заказа</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-3 overflow-y-auto no-scrollbar p-4 pt-0">
                <div className="flex items-center justify-between rounded-lg bg-muted p-3">
                  <div>
                    <div className="text-sm text-muted-foreground">Расстояние</div>
                    <div className="font-bold">{priceInfo?.distanceKm} km</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Цена</div>
                    <div className="text-2xl font-bold text-primary">{priceInfo?.priceTl} руб.</div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{priceInfo?.pricingDetails}</p>
                
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-2"><label className="text-sm font-medium">Телефон отправителя</label><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="tel" placeholder="+7..." value={senderPhone} onChange={e => setSenderPhone(e.target.value)} className="pl-10" /></div></div>
                  <div className="space-y-2"><label className="text-sm font-medium">Телефон получателя</label><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="tel" placeholder="+7..." value={receiverPhone} onChange={e => setReceiverPhone(e.target.value)} className="pl-10" /></div></div>
                </div>
                <div className="space-y-2"><label className="text-sm font-medium">Примечание (необязательно)</label><div className="relative"><MessageSquareText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Textarea placeholder="Что-то важное..." value={description} onChange={e => setDescription(e.target.value)} className="pl-10" /></div></div>
              </CardContent>
              <CardFooter className="p-4">
                <Button className="w-full" onClick={handleConfirmOrder} disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin" /> : <><Rocket className="mr-2"/>Подтвердить и заказать</> }
                </Button>
              </CardFooter>
            </>
         );
    }
    
    return (
        <>
            <CardHeader>
                <CardTitle>Создать заказ</CardTitle>
                <CardDescription>Укажите адреса отправления и назначения.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col space-y-2 overflow-hidden">
                {/* Pickup Field */}
                <div 
                    className={cn(
                        "flex shrink-0 items-center gap-2 rounded-md border p-2",
                        addressFocus === 'pickup' && 'ring-2 ring-primary'
                    )}
                    onClick={() => {
                        if (addressFocus !== 'pickup') {
                            setAddressFocus('pickup');
                            setSearchQuery(pickup?.address || '');
                            setTimeout(() => inputRef.current?.focus(), 100);
                        }
                    }}
                >
                    {addressFocus === 'pickup' ? (
                        <div className="relative flex-1">
                            <MapPin className="pointer-events-none absolute left-1 top-1/2 h-5 w-5 -translate-y-1/2 text-green-500" />
                            <Input
                                ref={inputRef}
                                placeholder="Откуда?"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-auto w-full border-0 bg-transparent p-0 pl-7 focus-visible:ring-0 focus-visible:ring-offset-0"
                                autoFocus
                            />
                        </div>
                    ) : (
                        <>
                            <MapPin className="h-5 w-5 text-green-500" />
                            <div className="flex-1 cursor-pointer text-sm">
                                {pickup ? <span className="truncate">{pickup.address}</span> : <span className="text-muted-foreground">Откуда?</span>}
                            </div>
                        </>
                    )}
                    {pickup && (
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 shrink-0" 
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                setPickup(null); 
                                setPriceInfo(null);
                                setDropoff(null);
                                setSearchQuery('');
                                setAddressFocus('pickup');
                            }}
                        >
                            <X className="h-4 w-4"/>
                        </Button>
                    )}
                </div>

                {/* Dropoff Field */}
                <div 
                    className={cn(
                        "flex shrink-0 items-center gap-2 rounded-md border p-2",
                        addressFocus === 'dropoff' && 'ring-2 ring-primary'
                    )}
                    onClick={() => {
                        if (addressFocus !== 'dropoff') {
                            setAddressFocus('dropoff');
                            setSearchQuery(dropoff?.address || '');
                            setTimeout(() => inputRef.current?.focus(), 100);
                        }
                    }}
                >
                    {addressFocus === 'dropoff' ? (
                        <div className="relative flex-1">
                           <MapPin className="pointer-events-none absolute left-1 top-1/2 h-5 w-5 -translate-y-1/2 text-red-500" />
                           <Input
                               ref={inputRef}
                               placeholder="Куда?"
                               value={searchQuery}
                               onChange={(e) => setSearchQuery(e.target.value)}
                               className="h-auto w-full border-0 bg-transparent p-0 pl-7 focus-visible:ring-0 focus-visible:ring-offset-0"
                               autoFocus
                           />
                       </div>
                    ) : (
                        <>
                            <MapPin className="h-5 w-5 text-red-500" />
                            <div className="flex-1 cursor-pointer text-sm">
                                {dropoff ? <span className="truncate">{dropoff.address}</span> : <span className="text-muted-foreground">Куда?</span>}
                            </div>
                        </>
                    )}
                     {dropoff && (
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 shrink-0" 
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                setDropoff(null); 
                                setPriceInfo(null);
                                setSearchQuery('');
                                setAddressFocus('dropoff');
                            }}
                        >
                            <X className="h-4 w-4"/>
                        </Button>
                    )}
                </div>
                
                {/* Suggestions List */}
                <div className="flex-1 overflow-y-auto no-scrollbar pt-2">
                    {isSearching && (
                        <div className="flex items-center justify-center p-4 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin mr-2"/>
                            <span>Идет поиск...</span>
                        </div>
                    )}
                    {suggestions.length > 0 && !isSearching && (
                    <div className="rounded-md border">
                        {Object.entries(suggestions.reduce((acc: Record<string, SearchAddressOutput>, suggestion) => {
                            const kindKey = suggestion.kind || 'other';
                            const kind = KIND_TRANSLATIONS[kindKey] || KIND_TRANSLATIONS['other'];
                            if (!acc[kind]) acc[kind] = [];
                            acc[kind].push(suggestion);
                            return acc;
                        }, {})).map(([kind, items]) => (
                            <div key={kind}>
                                <p className="p-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/50">{kind}</p>
                                {items.map((s) => (
                                    <div key={s.address + s.coords.join(',')} onClick={() => handleSelectAddress(s)} className="cursor-pointer p-2 pl-4 text-sm hover:bg-muted">
                                    {s.address}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                    )}
                    {noResults && !isSearching && (
                        <div className="mt-2 rounded-md border p-4 text-center text-sm text-muted-foreground">
                            По вашему запросу ничего не найдено.
                        </div>
                    )}
                </div>
            </CardContent>
             {isLoading && (
                <CardFooter>
                    <div className="flex w-full items-center justify-center text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin mr-2"/>
                        <span>Расчет маршрута...</span>
                    </div>
                </CardFooter>
            )}
        </>
    )
  }
  
  if (isConfirmed) {
         return (
             <div className="relative flex h-full w-full items-center justify-center p-4" style={{height: "calc(100vh - 73px)"}}>
                <Card className="w-full max-w-md">
                    <CardContent className="flex flex-col items-center justify-center pt-6 text-center">
                        <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Заказ создан!</h2>
                        <p className="text-muted-foreground mb-6">Ваш заказ успешно размещен. Курьер будет назначен в ближайшее время.</p>
                        <Button className="w-full" onClick={onDone}>К моим заказам</Button>
                    </CardContent>
                </Card>
            </div>
         );
    }
    
  return (
    <YMaps query={{ apikey: apiKey, lang: 'ru_RU' }}>
      <div className="relative h-full w-full" style={{height: "calc(100vh - 73px)"}}>
        <Map
          instanceRef={mapRef}
          state={mapState}
          width="100%"
          height="100%"
          className={cn("absolute inset-0", isLoading && "cursor-wait")}
          onClick={handleMapClick}
        >
          {pickup && <Placemark geometry={pickup.coords} options={{preset: 'islands#greenDotIconWithCaption'}} properties={{iconCaption: 'Отсюда'}} />}
          {dropoff && <Placemark geometry={dropoff.coords} options={{preset: 'islands#redDotIconWithCaption'}} properties={{iconCaption: 'Сюда'}} />}
        </Map>
        
        <div className="pointer-events-none absolute inset-0 flex flex-col p-2 md:p-4">
            <Button variant="secondary" onClick={onDone} className="pointer-events-auto absolute top-4 left-4 z-10 md:hidden">
              <ArrowLeft />
            </Button>
             <div className="pointer-events-auto mt-14 flex w-full max-w-md flex-1 flex-col self-center md:mt-0 md:self-start">
                 <Card className="flex flex-1 flex-col overflow-hidden">
                    {renderPanel()}
                 </Card>
            </div>
        </div>
      </div>
    </YMaps>
  );
}


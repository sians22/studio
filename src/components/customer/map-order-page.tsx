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
import { Loader2, ArrowLeft, MapPin, Wallet, Phone, MessageSquareText, Rocket, Move, CheckCircle, X, LocateFixed } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';

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
  const [isLoading, setIsLoading] = useState(false); // For price calculation and reverse geocoding
  const [isPlacemarkDragging, setIsPlacemarkDragging] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);


  const mapRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (debouncedSearchQuery) {
      setIsSearching(true);
      setSuggestions([]); // Clear old suggestions immediately
      setNoResults(false);  // Reset no results state
      searchAddress({ query: debouncedSearchQuery })
        .then(results => {
          setSuggestions(results);
          if (results.length === 0) {
            setNoResults(true); // Set no results if API returns empty
          }
        })
        .catch((err) => toast({ variant: 'destructive', title: 'Ошибка поиска адреса', description: err.message }))
        .finally(() => setIsSearching(false));
    } else {
      setSuggestions([]);
      setNoResults(false); // Clear everything if query is empty
    }
  }, [debouncedSearchQuery, toast]);
  
  const handleMapClick = async (e: any) => {
    if (isLoading || isPlacemarkDragging || isGettingLocation) return;
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
    if (addressFocus === 'pickup') {
      setPickup(address);
      setAddressFocus('dropoff');
      if (dropoff) { // if dropoff exists, recalculate
          setDropoff(null);
          setPriceInfo(null);
      }
    } else {
      setDropoff(address);
    }
    setSearchQuery('');
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const handleGetMyLocation = () => {
    if (!navigator.geolocation) {
        toast({ variant: 'destructive', title: 'Геолокация не поддерживается', description: 'Ваш браузер не поддерживает определение местоположения.' });
        return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
            try {
                const result = await getAddressFromCoords({ coords });
                if (result) {
                    handleSelectAddress(result);
                } else {
                    toast({ variant: 'destructive', title: 'Адрес не найден', description: 'Не удалось определить адрес для вашего местоположения.' });
                }
            } catch (err: any) {
                toast({ variant: 'destructive', title: 'Ошибка определения адреса', description: err.message });
            } finally {
                setIsGettingLocation(false);
            }
        },
        (error) => {
            let message = 'Не удалось получить ваше местоположение.';
            if (error.code === error.PERMISSION_DENIED) {
                message = 'Вы запретили доступ к своему местоположению.';
            }
            toast({ variant: 'destructive', title: 'Ошибка геолокации', description: message });
            setIsGettingLocation(false);
        }
    );
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

  const handlePlacemarkDrag = async (e: any, pointType: 'pickup' | 'dropoff') => {
    setIsPlacemarkDragging(false);
    setPriceInfo(null);
    const newCoords = e.get('target').geometry.getCoordinates();
    
    setIsLoading(true);
    try {
        const result = await getAddressFromCoords({ coords: newCoords });
        if (result) {
            if (pointType === 'pickup') setPickup(result);
            else setDropoff(result);
        } else {
            toast({ variant: 'destructive', title: 'Адрес не найден' });
             if (pointType === 'pickup') setPickup(null);
             else setDropoff(null);
        }
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Ошибка', description: error.message });
    } finally {
        setIsLoading(false);
    }
  }
  
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
    if (isConfirmed) {
         return (
             <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                <h2 className="text-2xl font-bold mb-2">Заказ создан!</h2>
                <p className="text-muted-foreground mb-6">Ваш заказ успешно размещен. Курьер будет назначен в ближайшее время.</p>
                <Button className="w-full" onClick={onDone}>К моим заказам</Button>
            </div>
         );
    }
    
    if (priceInfo) {
         return (
            <>
              <CardHeader>
                <div className="flex items-center gap-2">
                   <Button variant="ghost" size="icon" onClick={() => { setPriceInfo(null); setDropoff(null); setAddressFocus('dropoff'); }}>
                        <ArrowLeft />
                   </Button>
                   <CardTitle>Подтверждение заказа</CardTitle>
                </div>
              </CardHeader>
              <CardContent className={cn("flex-1 space-y-4 overflow-y-auto no-scrollbar")}>
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
                
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2"><label className="text-sm font-medium">Телефон отправителя</label><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="tel" placeholder="+7..." value={senderPhone} onChange={e => setSenderPhone(e.target.value)} className="pl-10" /></div></div>
                  <div className="space-y-2"><label className="text-sm font-medium">Телефон получателя</label><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="tel" placeholder="+7..." value={receiverPhone} onChange={e => setReceiverPhone(e.target.value)} className="pl-10" /></div></div>
                </div>
                <div className="space-y-2"><label className="text-sm font-medium">Примечание (необязательно)</label><div className="relative"><MessageSquareText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Textarea placeholder="Что-то важное..." value={description} onChange={e => setDescription(e.target.value)} className="pl-10" /></div></div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={handleConfirmOrder} disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin" /> : <Rocket className="mr-2"/> }
                  Подтвердить и заказать
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
            <CardContent className={cn("flex-1 space-y-2 overflow-y-auto no-scrollbar")}>
                <div 
                    className={cn("flex items-center gap-3 rounded-md border p-2 cursor-pointer", addressFocus === 'pickup' && 'ring-2 ring-primary')}
                    onClick={() => setAddressFocus('pickup')}
                >
                    <MapPin className="h-5 w-5 text-green-500" />
                    <div className="flex-1 text-sm">{pickup ? pickup.address : <span className="text-muted-foreground">Откуда?</span>}</div>
                    {pickup && <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setPickup(null); setPriceInfo(null); setDropoff(null); setAddressFocus('pickup');}}><X className="h-4 w-4"/></Button>}
                </div>
                <div 
                    className={cn("flex items-center gap-3 rounded-md border p-2 cursor-pointer", addressFocus === 'dropoff' && 'ring-2 ring-primary')}
                    onClick={() => setAddressFocus('dropoff')}
                >
                    <MapPin className="h-5 w-5 text-red-500" />
                    <div className="flex-1 text-sm">{dropoff ? dropoff.address : <span className="text-muted-foreground">Куда?</span>}</div>
                    {dropoff && <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setDropoff(null); setPriceInfo(null); setAddressFocus('dropoff');}}><X className="h-4 w-4"/></Button>}
                </div>

                <div className="relative pt-2">
                    <Input
                        ref={inputRef}
                        placeholder={addressFocus === 'pickup' ? "Поиск адреса отправления..." : "Поиск адреса назначения..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {isSearching && <Loader2 className="absolute right-3 top-[18px] h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
                
                {suggestions.length > 0 && (
                <div className="mt-2 rounded-md border">
                    {Object.entries(suggestions.reduce((acc: Record<string, SearchAddressOutput>, suggestion) => {
                        const kindKey = suggestion.kind || 'other';
                        const kind = KIND_TRANSLATIONS[kindKey] || KIND_TRANSLATIONS['other'];
                        if (!acc[kind]) acc[kind] = [];
                        acc[kind].push(suggestion);
                        return acc;
                    }, {})).map(([kind, items]) => (
                        <div key={kind}>
                            <p className="p-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50">{kind}</p>
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
                    <div className="mt-2 text-center text-sm text-muted-foreground p-4 border rounded-md">
                        По вашему запросу ничего не найдено.
                    </div>
                )}
            </CardContent>
             {isLoading && (
                <CardFooter>
                    <div className="flex items-center justify-center w-full text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin mr-2"/>
                        <span>Расчет маршрута...</span>
                    </div>
                </CardFooter>
            )}
        </>
    )
  }

  return (
    <YMaps query={{ apikey: apiKey, lang: 'ru_RU' }}>
      <div className="relative h-full w-full" style={{height: "calc(100vh - 73px)"}}>
        <Map
          instanceRef={mapRef}
          state={mapState}
          width="100%"
          height="100%"
          className={cn("absolute inset-0", (isLoading || isGettingLocation) && "cursor-wait")}
          onClick={handleMapClick}
        >
          {pickup && <Placemark geometry={pickup.coords} options={{preset: 'islands#greenDotIconWithCaption', draggable: true, iconCaption: 'Отсюда'}} onDragStart={() => setIsPlacemarkDragging(true)} onDragEnd={(e) => handlePlacemarkDrag(e, 'pickup')} />}
          {dropoff && <Placemark geometry={dropoff.coords} options={{preset: 'islands#redDotIconWithCaption', draggable: true, iconCaption: 'Сюда'}} onDragStart={() => setIsPlacemarkDragging(true)} onDragEnd={(e) => handlePlacemarkDrag(e, 'dropoff')} />}
        </Map>
        
        <Button
            size="icon"
            variant="secondary"
            className="pointer-events-auto absolute top-4 right-4 z-10 shadow-lg"
            onClick={handleGetMyLocation}
            disabled={isGettingLocation || isLoading}
            title="Мое местоположение"
        >
            {isGettingLocation ? <Loader2 className="h-5 w-5 animate-spin" /> : <LocateFixed className="h-5 w-5" />}
            <span className="sr-only">Мое местоположение</span>
        </Button>

        {isPlacemarkDragging && (
            <div className="absolute top-1/2 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2 transform rounded-lg bg-background/80 p-4 shadow-lg backdrop-blur-sm">
                <div className="flex items-center gap-2 text-foreground"><Move className="h-5 w-5 animate-pulse" /><span>Переместите метку...</span></div>
            </div>
        )}
        
        <div className="pointer-events-none absolute inset-0 flex flex-col p-2 md:p-4">
            <Button variant="secondary" onClick={onDone} className="pointer-events-auto absolute top-4 left-4 z-10 md:hidden">
              <ArrowLeft />
            </Button>
             <div className={cn("pointer-events-auto mt-14 flex w-full max-w-md flex-1 flex-col self-center md:mt-0 md:self-start", isPlacemarkDragging && 'opacity-30')}>
                 <Card className="flex flex-1 flex-col">
                    {renderPanel()}
                 </Card>
            </div>
        </div>
      </div>
    </YMaps>
  );
}


"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { GoogleMap, useLoadScript, Marker, Polyline } from '@react-google-maps/api';
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
import { Loader2, ArrowLeft, MapPin, Phone, MessageSquareText, Rocket, X, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type AddressFocus = 'pickup' | 'dropoff';
type Address = { address: string; coords: [number, number]; kind?: string };

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  clickableIcons: false,
};

const LIBRARIES: ('places' | 'drawing' | 'geometry' | 'visualization')[] = ['places'];

const MARKER_ICON_GREEN = `data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 384 512'%3e%3cpath fill='%2316a34a' d='M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67a24 24 0 01-35.464 0zM192 272a80 80 0 100-160 80 80 0 000 160z'/%3e%3c/svg%3e`;
const MARKER_ICON_RED = `data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 384 512'%3e%3cpath fill='%23dc2626' d='M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67a24 24 0 01-35.464 0zM192 272a80 80 0 100-160 80 80 0 000 160z'/%3e%3c/svg%3e`;


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
  
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES,
    language: 'ru',
  });

  const onMapLoad = useCallback((map: any) => {
    mapRef.current = map;
  }, []);

  useEffect(() => {
    if (debouncedSearchQuery) {
      setIsSearching(true);
      setSuggestions([]);
      setNoResults(false);
      searchAddress({ query: debouncedSearchQuery })
        .then(results => {
          setSuggestions(results);
          if (results.length === 0) setNoResults(true);
        })
        .catch((err) => toast({ variant: 'destructive', title: 'Ошибка поиска адреса', description: err.message }))
        .finally(() => setIsSearching(false));
    } else {
      setSuggestions([]);
      setNoResults(false);
    }
  }, [debouncedSearchQuery, toast]);
  
  const handleMapClick = async (e: google.maps.MapMouseEvent) => {
    if (isLoading || !e.latLng) return;
    const coords: [number, number] = [e.latLng.lat(), e.latLng.lng()];

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup, dropoff]);

  useEffect(() => {
    if (mapRef.current && pickup && dropoff) {
        const bounds = new window.google.maps.LatLngBounds();
        bounds.extend(new window.google.maps.LatLng(pickup.coords[0], pickup.coords[1]));
        bounds.extend(new window.google.maps.LatLng(dropoff.coords[0], dropoff.coords[1]));
        mapRef.current.fitBounds(bounds);
    } else if(mapRef.current && pickup) {
        mapRef.current.panTo({ lat: pickup.coords[0], lng: pickup.coords[1] });
        mapRef.current.setZoom(15);
    }
  }, [pickup, dropoff, priceInfo])

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
  
  const center = useMemo(() => ({ lat: 43.318, lng: 45.698 }), []); // Grozny

  const polylinePath = useMemo(() => {
    if (!priceInfo?.routeGeometry) return [];
    return priceInfo.routeGeometry.map(coords => ({ lat: coords[0], lng: coords[1] }));
  }, [priceInfo]);

  if (loadError || (!isLoaded && apiKey==="") || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
    return (
        <div className="flex h-full flex-col items-center justify-center p-4 text-center">
            <Card className="max-w-sm">
                <CardHeader>
                    <CardTitle className="text-destructive">Ошибка Конфигурации Карты</CardTitle>
                    <CardDescription>
                       Ключ API Google Карт не настроен или недействителен. Пожалуйста, откройте файл `.env` и убедитесь, что `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` корректно задан.
                       <br/><br/>
                       Также убедитесь, что в Google Cloud Console для вашего ключа включены API: **Geocoding API**, **Directions API** и **Maps JavaScript API**.
                    </CardDescription>
                </CardHeader>
            </Card>
        </div>
    );
  }

  if (!isLoaded) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin"/></div>
  }

  const renderPanel = () => {
    if (isConfirmed) {
         return (
            <div className="relative flex h-full w-full items-center justify-center p-4">
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

    if (priceInfo) {
         return (
            <div className="flex h-full flex-col">
              <CardHeader className="flex-shrink-0 p-4">
                <div className="flex items-center gap-2">
                   <Button variant="ghost" size="icon" className="-ml-2 h-8 w-8" onClick={() => { setPriceInfo(null); setDropoff(null); setAddressFocus('dropoff'); }}>
                        <ArrowLeft />
                   </Button>
                   <CardTitle className="text-lg">Подтверждение заказа</CardTitle>
                </div>
              </CardHeader>
              <div className="flex-1 space-y-3 overflow-y-auto px-4">
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
                 <p className="px-1 text-xs text-muted-foreground">{priceInfo?.pricingDetails}</p>
                 
                 <div className="space-y-3">
                   <div className="space-y-1">
                     <label className="px-1 text-sm font-medium">Телефон отправителя</label>
                     <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="tel" placeholder="+7..." value={senderPhone} onChange={e => setSenderPhone(e.target.value)} className="pl-9" /></div>
                   </div>
                   <div className="space-y-1">
                     <label className="px-1 text-sm font-medium">Телефон получателя</label>
                     <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="tel" placeholder="+7..." value={receiverPhone} onChange={e => setReceiverPhone(e.target.value)} className="pl-9" /></div>
                   </div>
                   <div className="space-y-1">
                     <label className="px-1 text-sm font-medium">Примечание (необязательно)</label>
                     <div className="relative"><MessageSquareText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Textarea placeholder="Что-то важное..." value={description} onChange={e => setDescription(e.target.value)} className="pl-9" /></div>
                   </div>
                 </div>
              </div>
              <CardFooter className="flex-shrink-0 p-4">
                <Button className="w-full" onClick={handleConfirmOrder} disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin" /> : <><Rocket className="mr-2"/>Подтвердить и заказать</> }
                </Button>
              </CardFooter>
            </div>
         );
    }
    
    return (
        <div className="flex h-full flex-col">
            <CardHeader className="flex-shrink-0">
                <CardTitle>Создать заказ</CardTitle>
                <CardDescription>Укажите адреса отправления и назначения.</CardDescription>
            </CardHeader>
            <div className="flex flex-1 flex-col space-y-2 overflow-hidden px-6 pb-6">
                <div 
                    className={cn("flex shrink-0 cursor-text items-center gap-3 rounded-md border p-2", addressFocus === 'pickup' && 'ring-2 ring-primary')}
                    onClick={() => { if (addressFocus !== 'pickup') { setAddressFocus('pickup'); setSearchQuery(pickup?.address || ''); setTimeout(() => inputRef.current?.focus(), 100); } }}
                >
                     <MapPin className="h-5 w-5 shrink-0 text-green-500" />
                    {addressFocus === 'pickup' ? (
                        <Input ref={inputRef} placeholder="Откуда?" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-auto w-full border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0" autoFocus />
                    ) : (
                        <div className="flex-1 text-sm">{pickup ? <span className="truncate">{pickup.address}</span> : <span className="text-muted-foreground">Откуда?</span>}</div>
                    )}
                    {pickup && (<Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={(e) => { e.stopPropagation(); setPickup(null); setPriceInfo(null); setDropoff(null); setSearchQuery(''); setAddressFocus('pickup'); }}><X className="h-4 w-4"/></Button>)}
                </div>

                <div 
                    className={cn("flex shrink-0 cursor-text items-center gap-3 rounded-md border p-2", addressFocus === 'dropoff' && 'ring-2 ring-primary')}
                     onClick={() => { if (addressFocus !== 'dropoff') { setAddressFocus('dropoff'); setSearchQuery(dropoff?.address || ''); setTimeout(() => inputRef.current?.focus(), 100); } }}
                >
                    <MapPin className="h-5 w-5 shrink-0 text-red-500" />
                    {addressFocus === 'dropoff' ? (
                       <Input ref={inputRef} placeholder="Куда?" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-auto w-full border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0" autoFocus />
                    ) : (
                        <div className="flex-1 text-sm">{dropoff ? <span className="truncate">{dropoff.address}</span> : <span className="text-muted-foreground">Куда?</span>}</div>
                    )}
                     {dropoff && (<Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={(e) => { e.stopPropagation(); setDropoff(null); setPriceInfo(null); setSearchQuery(''); setAddressFocus('dropoff'); }}><X className="h-4 w-4"/></Button>)}
                </div>
                
                <div className="flex-1 overflow-y-auto pt-2">
                    {isSearching && (<div className="flex items-center justify-center p-4 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2"/><span>Идет поиск...</span></div>)}
                    {suggestions.length > 0 && !isSearching && (
                      <div className="rounded-md border">
                        {suggestions.map((s, index) => (
                          <div key={`${s.address}-${index}`} onClick={() => handleSelectAddress(s)} className="cursor-pointer p-2 pl-4 text-sm hover:bg-muted">{s.address}</div>
                        ))}
                      </div>
                    )}
                    {noResults && !isSearching && (<div className="mt-2 rounded-md border p-4 text-center text-sm text-muted-foreground">По вашему запросу ничего не найдено.</div>)}
                </div>
            </div>
             {isLoading && !priceInfo && (<CardFooter><div className="flex w-full items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2"/><span>Расчет маршрута...</span></div></CardFooter>)}
        </div>
    )
  }

  return (
    <div className="relative h-full w-full" style={{height: "calc(100vh - 73px)"}}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={12}
        options={mapOptions}
        onLoad={onMapLoad}
        onClick={handleMapClick}
      >
        {pickup && <Marker position={{ lat: pickup.coords[0], lng: pickup.coords[1] }} icon={{ url: MARKER_ICON_GREEN, scaledSize: new window.google.maps.Size(30, 40) }} />}
        {dropoff && <Marker position={{ lat: dropoff.coords[0], lng: dropoff.coords[1] }} icon={{ url: MARKER_ICON_RED, scaledSize: new window.google.maps.Size(30, 40) }} />}
        {polylinePath.length > 0 && <Polyline path={polylinePath} options={{ strokeColor: '#1a73e8', strokeWeight: 5, strokeOpacity: 0.8 }} />}
      </GoogleMap>
      
      <div className="pointer-events-none absolute inset-0 flex flex-col p-2 md:p-4">
          <Button variant="secondary" onClick={onDone} className="pointer-events-auto absolute top-4 left-4 z-10 hidden md:flex">
            <ArrowLeft className="mr-2"/> К заказам
          </Button>
           <div className="pointer-events-auto relative flex w-full max-w-md flex-1 flex-col self-center md:self-start md:mt-12">
               <Card className="flex h-full max-h-[85vh] flex-col overflow-hidden">
                  {renderPanel()}
               </Card>
          </div>
      </div>
    </div>
  );
}

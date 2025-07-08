"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { useOrders } from "@/context/order-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, PlusCircle, MapPin, MessageSquareText, Route } from "lucide-react";
import MapOrderPage from "./map-order-page";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import type { OrderStatus, Order } from "@/types";
import { GoogleMap, useLoadScript, Marker, Polyline } from '@react-google-maps/api';

type CustomerDashboardProps = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
};

const mapContainerStyle = {
  width: '100%',
  height: '250px',
  borderRadius: '0.5rem',
};

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: false,
  clickableIcons: false,
};

const LIBRARIES: ('places' | 'drawing' | 'geometry' | 'visualization')[] = ['places'];

const MARKER_ICON_GREEN = `data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 384 512'%3e%3cpath fill='%2316a34a' d='M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67a24 24 0 01-35.464 0zM192 272a80 80 0 100-160 80 80 0 000 160z'/%3e%3c/svg%3e`;
const MARKER_ICON_RED = `data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 384 512'%3e%3cpath fill='%23dc2626' d='M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67a24 24 0 01-35.464 0zM192 272a80 80 0 100-160 80 80 0 000 160z'/%3e%3c/svg%3e`;
const COURIER_ICON = `data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='hsl(var(--primary))' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3ccircle cx='12' cy='12' r='10' fill='white' /%3e%3ccircle cx='12' cy='10' r='3'/%3e%3cpath d='M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662'/%3e%3c/svg%3e`;


const OrderTrackingMap = ({ order }: { order: Order }) => {
    const route = useMemo(() => {
      if (!order.routeGeometry) return [];
      return order.routeGeometry.map(coords => ({ lat: coords[0], lng: coords[1] }));
    }, [order.routeGeometry]);

    const [courierPosition, setCourierPosition] = useState(route[0]);
    const mapRef = useRef<any>(null);

    useEffect(() => {
        if (!route.length) return;

        const totalSteps = route.length - 1;
        if (totalSteps <= 0) return;
        
        let step = 0;
        const interval = setInterval(() => {
            step++;
            setCourierPosition(route[step]);

            if (step === totalSteps) {
                clearInterval(interval);
            }
        }, 2000); // Update every 2 seconds for simulation

        return () => clearInterval(interval);
    }, [route]);

    const onMapLoad = useCallback((map: any) => {
        mapRef.current = map;
        if (route.length > 1) {
            const bounds = new window.google.maps.LatLngBounds();
            route.forEach(point => bounds.extend(point));
            map.fitBounds(bounds, 50);
        }
    }, [route]);

    if (!order.routeGeometry) return null;

    return (
        <div className="mt-2 h-[250px] w-full">
            <GoogleMap
                mapContainerStyle={mapContainerStyle}
                options={mapOptions}
                onLoad={onMapLoad}
            >
                <Marker position={route[0]} icon={{ url: MARKER_ICON_GREEN, scaledSize: new window.google.maps.Size(25, 32) }} />
                <Marker position={route[route.length - 1]} icon={{ url: MARKER_ICON_RED, scaledSize: new window.google.maps.Size(25, 32) }} />
                <Polyline path={route} options={{ strokeColor: 'hsl(var(--primary))', strokeWeight: 4, strokeOpacity: 0.7 }} />
                <Marker position={courierPosition} icon={{ url: COURIER_ICON, scaledSize: new window.google.maps.Size(32, 32) }} zIndex={99} />
            </GoogleMap>
        </div>
    );
};


export default function CustomerDashboard({ activeTab, setActiveTab }: CustomerDashboardProps) {
  const { user } = useAuth();
  const { orders, updateOrderStatus } = useOrders();
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES,
    language: 'ru',
  });

  const customerOrders = orders.filter((order) => order.customerId === user?.id);

  const handleCancelOrder = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order && !['Доставлен', 'Отменен'].includes(order.status)) {
      updateOrderStatus(orderId, "Отменен");
    }
  };
  
  const getStatusVariant = (status: OrderStatus) => {
    switch (status) {
      case 'Доставлен': return 'default';
      case 'Отменен': return 'destructive';
      case 'Принят':
      case 'В пути': return 'secondary';
      case 'Ожидание': return 'outline';
      default: return 'outline';
    }
  };

  if (activeTab === 'create') {
    return <MapOrderPage onDone={() => setActiveTab('home')} isLoaded={isLoaded} loadError={loadError} />;
  }

  return (
    <div className="container mx-auto max-w-2xl">
      {customerOrders.length === 0 ? (
        <div className="flex h-[calc(100vh-200px)] flex-col items-center justify-center p-4 text-center">
          <Card className="max-w-sm">
            <CardHeader>
              <CardTitle>Заказов пока нет!</CardTitle>
              <CardDescription>Нажмите "Создать", чтобы оформить свой первый заказ.</CardDescription>
            </CardHeader>
            <CardContent>
               <Package className="mx-auto h-12 w-12 text-muted-foreground" />
            </CardContent>
             <CardFooter>
               <Button onClick={() => setActiveTab('create')} className="w-full">
                  <PlusCircle className="mr-2 h-4 w-4" /> Создать первый заказ
              </Button>
             </CardFooter>
          </Card>
        </div>
      ) : (
        <div className="space-y-4 p-4 md:space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Мои заказы</h1>
            <Button onClick={() => setActiveTab('create')}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Новый заказ
            </Button>
          </div>
          {customerOrders.map((order) => (
            <Card key={order.id} className="overflow-hidden">
              <CardHeader className="flex flex-row items-start justify-between bg-muted/30 p-4">
                  <div>
                    <Badge variant={getStatusVariant(order.status)} className="capitalize mb-2">
                      {order.status}
                    </Badge>
                    <CardTitle className="text-lg">Заказ #{order.id.slice(-6)}</CardTitle>
                    <CardDescription>
                      {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true, locale: ru })}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                      <p className="text-xl font-bold text-primary">{order.price} руб.</p>
                      <p className="text-sm text-muted-foreground">{order.distance} km</p>
                  </div>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 mt-1 flex-shrink-0 text-green-500" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Откуда</p>
                      <p className="font-semibold">{order.pickupAddress}</p>
                    </div>
                </div>
                <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 mt-1 flex-shrink-0 text-red-500" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Куда</p>
                      <p className="font-semibold">{order.dropoffAddress}</p>
                    </div>
                </div>
                 {order.description && (
                  <div className="flex items-start gap-3 border-t pt-3 mt-3">
                    <MessageSquareText className="h-5 w-5 mt-1 flex-shrink-0 text-muted-foreground" />
                     <div>
                       <p className="text-sm font-medium text-muted-foreground">Примечание</p>
                       <p className="text-sm">{order.description}</p>
                     </div>
                  </div>
                )}
                 {expandedOrderId === order.id && isLoaded && ['Принят', 'В пути'].includes(order.status) && (
                    <OrderTrackingMap order={order} />
                 )}
              </CardContent>
              <CardFooter className="flex flex-col items-stretch gap-2 bg-muted/30 p-2">
                 {['Принят', 'В пути'].includes(order.status) && (
                   <Button variant="outline" onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}>
                      <Route className="mr-2"/>
                      {expandedOrderId === order.id ? 'Скрыть карту' : 'Трек заказа'}
                   </Button>
                 )}
                {!['Доставлен', 'Отменен'].includes(order.status) && (
                    <Button
                      variant="ghost"
                      className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleCancelOrder(order.id)}
                      size="sm"
                    >
                      Отменить заказ
                    </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

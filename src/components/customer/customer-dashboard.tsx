"use client";

import { useAuth } from "@/context/auth-context";
import { useOrders } from "@/context/order-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, PlusCircle, MapPin, MessageSquareText } from "lucide-react";
import MapOrderPage from "./map-order-page";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "@/types";

type CustomerDashboardProps = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
};

export default function CustomerDashboard({ activeTab, setActiveTab }: CustomerDashboardProps) {
  const { user } = useAuth();
  const { orders, updateOrderStatus } = useOrders();

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
    return <MapOrderPage onDone={() => setActiveTab('home')} />;
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
              </CardContent>
                {!['Доставлен', 'Отменен'].includes(order.status) && (
                  <CardFooter className="bg-muted/30 p-2">
                    <Button
                      variant="ghost"
                      className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleCancelOrder(order.id)}
                      size="sm"
                    >
                      Отменить заказ
                    </Button>
                  </CardFooter>
                )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

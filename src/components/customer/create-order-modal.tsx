"use client";

import { useAuth } from "@/context/auth-context";
import { useOrders } from "@/context/order-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, PlusCircle, MapPin, MessageSquareText } from "lucide-react";
import MapOrderPage from "./map-order-page";
import AiOrderPage from "./ai-order-page";
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
    return <MapOrderPage onOrderCreated={() => setActiveTab('home')} />;
  }

  if (activeTab === 'ai-create') {
    return <AiOrderPage onOrderCreated={() => setActiveTab('home')} />;
  }

  return (
    <div className="container mx-auto max-w-2xl">
      {customerOrders.length === 0 ? (
        <div className="flex h-[calc(100vh-200px)] flex-col items-center justify-center p-4 text-center">
          <Card className="max-w-sm">
            <CardHeader>
              <CardTitle>Заказов пока нет!</CardTitle>
              <CardDescription>Нажмите кнопку ниже, чтобы создать свой первый заказ.</CardDescription>
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
          {customerOrders.map((order) => (
            <Card key={order.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>Заказ #{order.id.slice(-6)}</CardTitle>
                    <CardDescription>
                      {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true, locale: ru })}
                    </CardDescription>
                  </div>
                  <Badge variant={getStatusVariant(order.status)} className="capitalize">
                    {order.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-green-500" />
                    <div className="text-sm">
                      <p className="font-medium">Откуда</p>
                      <p className="text-muted-foreground">{order.pickupAddress}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-red-500" />
                    <div className="text-sm">
                      <p className="font-medium">Куда</p>
                      <p className="text-muted-foreground">{order.dropoffAddress}</p>
                    </div>
                  </div>
                </div>
                {order.description && (
                  <div className="flex items-start gap-3 border-t pt-4">
                    <MessageSquareText className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{order.description}</p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex items-center justify-between bg-muted/50 p-4">
                <p className="text-lg font-bold">{order.price} руб.</p>
                {!['Доставлен', 'Отменен'].includes(order.status) && (
                  <Button
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
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

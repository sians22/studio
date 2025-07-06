"use client";

import { useAuth } from "@/context/auth-context";
import { useOrders } from "@/context/order-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Check, MapPin, Map, Phone } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

export default function CourierDashboard() {
  const { user } = useAuth();
  const { orders, updateOrderStatus } = useOrders();

  const availableOrders = orders.filter((order) => order.status === "Ожидание");
  const myActiveOrders = orders.filter((order) => order.courierId === user?.id && (order.status === "Принят" || order.status === "В пути"));

  const handleAcceptOrder = (orderId: string) => {
    if (user) {
      updateOrderStatus(orderId, "Принят", user.id);
    }
  };

  const handleUpdateStatus = (orderId: string, status: "В пути" | "Доставлен") => {
     if (user) {
      updateOrderStatus(orderId, status, user.id);
    }
  }

  return (
    <div className="container mx-auto max-w-2xl p-4">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold">Добро пожаловать, курьер {user?.username}!</h1>
        <p className="text-muted-foreground">Вот доступные задания.</p>
      </div>

      {myActiveOrders.length > 0 && (
        <div className="mb-8">
            <h2 className="mb-4 text-xl font-semibold">Ваши активные доставки</h2>
            <div className="space-y-4">
            {myActiveOrders.map(order => (
                <Card key={order.id} className="bg-primary/10 border-primary">
                    <CardHeader>
                        <CardTitle>Заказ №{order.id.slice(-6)}</CardTitle>
                        <CardDescription>{order.status}</CardDescription>
                    </CardHeader>
                     <CardContent className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-sm">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <strong>Откуда:</strong>
                                <span className="truncate">{order.pickupAddress}</span>
                            </span>
                            <Button variant="ghost" size="icon" asChild>
                                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.pickupAddress)}`} target="_blank" rel="noopener noreferrer">
                                    <Map className="h-5 w-5 text-primary" />
                                    <span className="sr-only">Открыть в картах</span>
                                </a>
                            </Button>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-sm">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <strong>Куда:</strong>
                                <span className="truncate">{order.dropoffAddress}</span>
                            </span>
                            <Button variant="ghost" size="icon" asChild>
                                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.dropoffAddress)}`} target="_blank" rel="noopener noreferrer">
                                    <Map className="h-5 w-5 text-primary" />
                                    <span className="sr-only">Открыть в картах</span>
                                </a>
                            </Button>
                        </div>
                        <div className="border-t my-2"></div>
                         <div className="flex items-center justify-between text-sm">
                             <span className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> Отправитель:</span>
                             <a href={`tel:${order.senderPhone}`} className="text-primary hover:underline">{order.senderPhone}</a>
                         </div>
                         <div className="flex items-center justify-between text-sm">
                             <span className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> Получатель:</span>
                             <a href={`tel:${order.receiverPhone}`} className="text-primary hover:underline">{order.receiverPhone}</a>
                         </div>
                         {order.description && <p className="text-sm text-muted-foreground pt-1"><strong>Примечание:</strong> {order.description}</p>}
                    </CardContent>
                    <CardFooter className="flex gap-2">
                        {order.status === 'Принят' && (
                            <Button onClick={() => handleUpdateStatus(order.id, 'В пути')} className="w-full">Начать доставку</Button>
                        )}
                        {order.status === 'В пути' && (
                             <Button onClick={() => handleUpdateStatus(order.id, 'Доставлен')} className="w-full">Отметить как доставленный</Button>
                        )}
                    </CardFooter>
                </Card>
            ))}
            </div>
        </div>
      )}


      <h2 className="mb-4 text-xl font-semibold">Доступные задания</h2>
      {availableOrders.length === 0 ? (
        <Card className="text-center">
            <CardHeader>
                <CardTitle>Сейчас нет доступных заданий.</CardTitle>
                <CardDescription>Загляните позже за новыми заказами.</CardDescription>
            </CardHeader>
            <CardContent>
                <Package className="mx-auto h-12 w-12 text-muted-foreground" />
            </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {availableOrders.map((order) => (
            <Card key={order.id}>
              <CardHeader>
                 <CardTitle>Новый запрос на доставку</CardTitle>
                 <CardDescription>
                    {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true, locale: ru })}
                 </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p><strong>Откуда:</strong> {order.pickupAddress}</p>
                <p><strong>Куда:</strong> {order.dropoffAddress}</p>
                <p><strong>Телефон отправителя:</strong> {order.senderPhone}</p>
                <p><strong>Телефон получателя:</strong> {order.receiverPhone}</p>
                {order.description && <p><strong>Примечание:</strong> {order.description}</p>}
                <p><strong>Расстояние:</strong> {order.distance} km</p>
                <p><strong>Оплата:</strong> {order.price} руб.</p>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={() => handleAcceptOrder(order.id)}>
                  <Check className="mr-2 h-4 w-4" /> Принять задание
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

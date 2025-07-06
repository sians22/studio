"use client";

import { useAuth } from "@/context/auth-context";
import { useOrders } from "@/context/order-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, PlusCircle, UserCircle, MoreHorizontal, Heart, MessageCircle, Send, Bookmark } from "lucide-react";
import CreateOrderForm from "./create-order-form";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import Image from "next/image";

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

  if (activeTab === "create") {
    return <CreateOrderForm onOrderCreated={() => setActiveTab("home")} />;
  }

  return (
    <div className="container mx-auto max-w-2xl p-0 md:p-4">
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
        <div className="space-y-4 py-4 md:space-y-8">
          {customerOrders.map((order) => {
            return (
              <Card key={order.id} className="rounded-none border-x-0 border-b md:rounded-lg md:border">
                <CardHeader className="flex flex-row items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                        <UserCircle className="h-8 w-8 text-muted-foreground" />
                        <div className="font-bold">Заказ №{order.id.slice(-6)}</div>
                    </div>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                </CardHeader>

                <CardFooter className="flex flex-col items-start gap-2 p-3">
                  <div className="flex w-full items-center justify-between">
                      <div className="flex items-center gap-3">
                          <Button variant="ghost" size="icon"><Heart className="h-6 w-6" /></Button>
                          <Button variant="ghost" size="icon"><MessageCircle className="h-6 w-6" /></Button>
                          <Button variant="ghost" size="icon"><Send className="h-6 w-6" /></Button>
                      </div>
                      <Button variant="ghost" size="icon"><Bookmark className="h-6 w-6" /></Button>
                  </div>

                  <div className="w-full space-y-1 px-1 text-sm">
                      <p className="font-bold">{order.price} руб.</p>
                      <p><span className="font-bold">{user?.username}</span>: {order.description || `Доставка из ${order.pickupAddress} в ${order.dropoffAddress}`}</p>
                      <p className="text-muted-foreground">Статус: {order.status}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true, locale: ru })}
                      </p>
                       {!['Доставлен', 'Отменен'].includes(order.status) && (
                          <Button
                            variant="link"
                            className="h-auto p-0 text-destructive"
                            onClick={() => handleCancelOrder(order.id)}
                          >
                            Отменить заказ
                          </Button>
                        )}
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

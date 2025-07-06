"use client";

import { useAuth } from "@/context/auth-context";
import { useOrders } from "@/context/order-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Check, MapPin, Map } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function CourierDashboard() {
  const { user } = useAuth();
  const { orders, updateOrderStatus } = useOrders();

  const availableOrders = orders.filter((order) => order.status === "Pending");
  const myActiveOrders = orders.filter((order) => order.courierId === user?.id && (order.status === "Accepted" || order.status === "In-transit"));

  const handleAcceptOrder = (orderId: string) => {
    if (user) {
      updateOrderStatus(orderId, "Accepted", user.id);
    }
  };

  const handleUpdateStatus = (orderId: string, status: "In-transit" | "Delivered") => {
     if (user) {
      updateOrderStatus(orderId, status, user.id);
    }
  }

  return (
    <div className="container mx-auto max-w-2xl p-4">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold">Welcome, Courier {user?.username}!</h1>
        <p className="text-muted-foreground">Here are the available jobs.</p>
      </div>

      {myActiveOrders.length > 0 && (
        <div className="mb-8">
            <h2 className="mb-4 text-xl font-semibold">Your Active Deliveries</h2>
            <div className="space-y-4">
            {myActiveOrders.map(order => (
                <Card key={order.id} className="bg-primary/10 border-primary">
                    <CardHeader>
                        <CardTitle>Order #{order.id.slice(-6)}</CardTitle>
                        <CardDescription>{order.status}</CardDescription>
                    </CardHeader>
                     <CardContent className="space-y-1">
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-sm">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <strong>From:</strong>
                                <span className="truncate">{order.pickupAddress}</span>
                            </span>
                            <Button variant="ghost" size="icon" asChild>
                                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.pickupAddress)}`} target="_blank" rel="noopener noreferrer">
                                    <Map className="h-5 w-5 text-primary" />
                                    <span className="sr-only">Open in Maps</span>
                                </a>
                            </Button>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-sm">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <strong>To:</strong>
                                <span className="truncate">{order.dropoffAddress}</span>
                            </span>
                            <Button variant="ghost" size="icon" asChild>
                                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.dropoffAddress)}`} target="_blank" rel="noopener noreferrer">
                                    <Map className="h-5 w-5 text-primary" />
                                    <span className="sr-only">Open in Maps</span>
                                </a>
                            </Button>
                        </div>
                    </CardContent>
                    <CardFooter className="flex gap-2">
                        {order.status === 'Accepted' && (
                            <Button onClick={() => handleUpdateStatus(order.id, 'In-transit')} className="w-full">Start Delivery</Button>
                        )}
                        {order.status === 'In-transit' && (
                             <Button onClick={() => handleUpdateStatus(order.id, 'Delivered')} className="w-full">Mark as Delivered</Button>
                        )}
                    </CardFooter>
                </Card>
            ))}
            </div>
        </div>
      )}


      <h2 className="mb-4 text-xl font-semibold">Available Jobs</h2>
      {availableOrders.length === 0 ? (
        <Card className="text-center">
            <CardHeader>
                <CardTitle>No available jobs right now.</CardTitle>
                <CardDescription>Check back soon for new delivery requests.</CardDescription>
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
                 <CardTitle>New Delivery Request</CardTitle>
                 <CardDescription>
                    {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                 </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p><strong>From:</strong> {order.pickupAddress}</p>
                <p><strong>To:</strong> {order.dropoffAddress}</p>
                <p><strong>Distance:</strong> {order.distance} km</p>
                <p><strong>Payment:</strong> {order.price} TL</p>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={() => handleAcceptOrder(order.id)}>
                  <Check className="mr-2 h-4 w-4" /> Accept Job
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

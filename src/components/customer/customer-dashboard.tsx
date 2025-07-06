"use client";

import { useAuth } from "@/context/auth-context";
import { useOrders } from "@/context/order-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Clock, X, CheckCircle, Truck, Map } from "lucide-react";
import CreateOrderForm from "./create-order-form";
import { formatDistanceToNow } from "date-fns";

type CustomerDashboardProps = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
};

export default function CustomerDashboard({ activeTab, setActiveTab }: CustomerDashboardProps) {
  const { user } = useAuth();
  const { orders, updateOrderStatus } = useOrders();

  const customerOrders = orders.filter((order) => order.customerId === user?.id);

  const handleCancelOrder = (orderId: string) => {
    updateOrderStatus(orderId, "Cancelled");
  };

  const OrderStatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case "Pending": return <Clock className="h-4 w-4 text-yellow-500" />;
      case "Accepted": return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case "In-transit": return <Truck className="h-4 w-4 text-blue-500" />;
      case "Delivered": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "Cancelled": return <X className="h-4 w-4 text-red-500" />;
      default: return <Package className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Delivered': return 'default';
      case 'Cancelled': return 'destructive';
      case 'Accepted':
      case 'In-transit': return 'secondary';
      default: return 'outline';
    }
  };

  if (activeTab === "create") {
    return <CreateOrderForm onOrderCreated={() => setActiveTab("home")} />;
  }

  return (
    <div className="container mx-auto max-w-2xl p-4">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold">Welcome, {user?.username}!</h1>
        <p className="text-muted-foreground">View your past orders or create a new one.</p>
      </div>
      
      <div className="mb-4 hidden md:block">
        <Button onClick={() => setActiveTab('create')} className="w-full bg-accent hover:bg-accent/90">
            Create New Order
        </Button>
      </div>

      <h2 className="mb-4 text-xl font-semibold">Order History</h2>
      {customerOrders.length === 0 ? (
        <Card className="text-center">
          <CardHeader>
            <CardTitle>No orders yet!</CardTitle>
            <CardDescription>Click the button below to create your first order.</CardDescription>
          </CardHeader>
          <CardContent>
             <Package className="mx-auto h-12 w-12 text-muted-foreground" />
          </CardContent>
           <CardFooter>
             <Button onClick={() => setActiveTab('create')} className="w-full">
                Create First Order
            </Button>
           </CardFooter>
        </Card>
      ) : (
        <div className="space-y-4">
          {customerOrders.map((order) => {
            const canCancel = order.status === "Pending" && (Date.now() - order.createdAt < 3 * 60 * 1000);
            return (
              <Card key={order.id} className="overflow-hidden">
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div>
                            <CardTitle className="text-lg">Order #{order.id.slice(-6)}</CardTitle>
                            <CardDescription>
                                {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                            </CardDescription>
                        </div>
                         <Badge variant={getStatusVariant(order.status)} className="capitalize flex gap-1.5 items-center">
                           <OrderStatusIcon status={order.status} />
                           {order.status}
                         </Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-1">
                  <div className="flex items-center justify-between">
                      <p className="text-sm truncate"><strong>From:</strong> {order.pickupAddress}</p>
                      <Button variant="ghost" size="icon" asChild>
                          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.pickupAddress)}`} target="_blank" rel="noopener noreferrer">
                              <Map className="h-5 w-5 text-primary" />
                              <span className="sr-only">View on Map</span>
                          </a>
                      </Button>
                  </div>
                  <div className="flex items-center justify-between">
                      <p className="text-sm truncate"><strong>To:</strong> {order.dropoffAddress}</p>
                      <Button variant="ghost" size="icon" asChild>
                          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.dropoffAddress)}`} target="_blank" rel="noopener noreferrer">
                              <Map className="h-5 w-5 text-primary" />
                              <span className="sr-only">View on Map</span>
                          </a>
                      </Button>
                  </div>
                  <p><strong>Price:</strong> {order.price} TL</p>
                </CardContent>
                {canCancel && (
                  <CardFooter>
                    <Button
                      variant="destructive"
                      onClick={() => handleCancelOrder(order.id)}
                      className="w-full"
                    >
                      <X className="mr-2 h-4 w-4" /> Cancel Order
                    </Button>
                  </CardFooter>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import { useOrders } from "@/context/order-context";
import { useTheme } from "@/context/theme-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Package, Users, Truck, CheckCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Order } from "@/types";

const mockUsers = [
    { id: 'user-1', name: 'customer', role: 'Customer', orders: 5 },
    { id: 'user-2', name: 'courier', role: 'Courier', deliveries: 12 },
    { id: 'user-3', name: 'admin', role: 'Admin', orders: 0 },
    { id: 'user-4', name: 'Jane Doe', role: 'Customer', orders: 2 },
    { id: 'user-5', name: 'Mike Ross', role: 'Courier', deliveries: 8 },
];

const mockPricing = [
    { range: '0-3 km', price: '10 TL' },
    { range: '3-5 km', price: '20 TL' },
    { range: '5-10 km', price: '30 TL' },
    { range: '10+ km', price: '50 TL' },
];

export default function AdminDashboard() {
  const { orders } = useOrders();
  const { themes, theme, setTheme } = useTheme();

  const totalRevenue = orders
    .filter(o => o.status === 'Delivered')
    .reduce((sum, o) => sum + o.price, 0);
  
  const totalOrders = orders.length;
  const ongoingOrders = orders.filter(o => o.status === 'Accepted' || o.status === 'In-transit').length;

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Delivered': return 'default';
      case 'Cancelled': return 'destructive';
      case 'Accepted':
      case 'In-transit': return 'secondary';
      default: return 'outline';
    }
  };


  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="orders">All Orders</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="themes">Temalar</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalRevenue} TL</div>
                <p className="text-xs text-muted-foreground">From delivered orders</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+{totalOrders}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ongoing Deliveries</CardTitle>
                <Truck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ongoingOrders}</div>
                <p className="text-xs text-muted-foreground">Currently active</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="orders">
            <Card className="mt-4">
                <CardHeader>
                    <CardTitle>All Orders</CardTitle>
                    <CardDescription>A list of all orders in the system.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Order ID</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Courier</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orders.map((order: Order) => (
                                <TableRow key={order.id}>
                                    <TableCell>#{order.id.slice(-6)}</TableCell>
                                    <TableCell>{order.customerId}</TableCell>
                                    <TableCell>{order.courierId || 'N/A'}</TableCell>
                                    <TableCell>{order.price} TL</TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
        
        <TabsContent value="users">
            <Card className="mt-4">
                <CardHeader>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>Manage your customers and couriers.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button>Add New User</Button>
                    <Table className="mt-4">
                        <TableHeader>
                            <TableRow>
                                <TableHead>User ID</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Activity</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {mockUsers.map(user => (
                                <TableRow key={user.id}>
                                    <TableCell>{user.id}</TableCell>
                                    <TableCell>{user.name}</TableCell>
                                    <TableCell><Badge variant="secondary">{user.role}</Badge></TableCell>
                                    <TableCell>{user.role === 'Customer' ? `${user.orders} orders` : `${(user as any).deliveries} deliveries`}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
        
        <TabsContent value="pricing">
            <Card className="mt-4">
                <CardHeader>
                    <CardTitle>Pricing Tiers</CardTitle>
                    <CardDescription>Set the delivery prices based on distance.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button>Edit Pricing</Button>
                     <Table className="mt-4">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Distance Range</TableHead>
                                <TableHead>Price</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {mockPricing.map(tier => (
                                <TableRow key={tier.range}>
                                    <TableCell>{tier.range}</TableCell>
                                    <TableCell>{tier.price}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="themes">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Bir Tema Seçin</CardTitle>
              <CardDescription>Uygulamanın görünümünü ve hissini özelleştirin.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {themes.map((t) => (
                  <div key={t.name}>
                    <button
                      onClick={() => setTheme(t.name)}
                      className={cn(
                        "w-full rounded-lg border-2 p-1 transition-all text-left",
                        theme === t.name ? "border-primary" : "border-transparent hover:border-border"
                      )}
                    >
                      <Card className="overflow-hidden shadow-none">
                        <CardContent className="p-4 space-y-3">
                          <h3 className="font-semibold">{t.name}</h3>
                          <div className="flex gap-2">
                            <div className="h-8 w-8 rounded-full" style={{ backgroundColor: `hsl(${t.colors['--primary']})` }}></div>
                            <div className="h-8 w-8 rounded-full" style={{ backgroundColor: `hsl(${t.colors['--accent']})` }}></div>
                            <div className="h-8 w-8 rounded-full" style={{ backgroundColor: `hsl(${t.colors['--secondary']})` }}></div>
                            <div className="h-8 w-8 rounded-full" style={{ backgroundColor: `hsl(${t.colors['--card']})`, border: `1px solid hsl(${t.colors['--border']})` }}></div>
                          </div>
                        </CardContent>
                      </Card>
                    </button>
                    {theme === t.name && (
                      <div className="mt-2 flex items-center justify-center gap-2 text-sm font-medium text-primary">
                        <CheckCircle className="h-4 w-4" />
                        <span>Mevcut Tema</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

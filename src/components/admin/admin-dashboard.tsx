"use client";

import { useState } from 'react';
import { useOrders } from "@/context/order-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Package, Users, Truck } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Order, Role } from "@/types";
import { usePricing } from '@/context/pricing-context';
import type { PricingTier } from '@/context/pricing-context';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

export default function AdminDashboard() {
  const { orders } = useOrders();
  const { tiers, setTiers } = usePricing();
  const { users, addUser } = useAuth();
  const { toast } = useToast();
  
  const [isPricingDialogOpen, setIsPricingDialogOpen] = useState(false);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  
  const [editableTiers, setEditableTiers] = useState<PricingTier[]>(tiers);

  const [newUserHwid, setNewUserHwid] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<Role>('customer');


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

  const handlePriceChange = (index: number, field: 'range' | 'price', value: string | number) => {
    const newTiers = [...editableTiers];
    if (field === 'price') {
        newTiers[index][field] = Number(value);
    } else {
        newTiers[index][field] = String(value);
    }
    setEditableTiers(newTiers);
  };
  
  const handleSavePricing = () => {
      setTiers(editableTiers);
      setIsPricingDialogOpen(false);
      toast({ title: 'Success', description: 'Pricing tiers have been updated.' });
  }

  const handleAddUser = () => {
      if (!newUserHwid || !newUserName) {
          toast({ variant: 'destructive', title: 'Error', description: 'HWID and Username are required.' });
          return;
      }
      if (users.some(u => u.hwid === newUserHwid)) {
         toast({ variant: 'destructive', title: 'Error', description: 'This HWID is already registered.' });
         return;
      }
      
      addUser({
          hwid: newUserHwid.trim(),
          username: newUserName.trim(),
          role: newUserRole,
      });

      setIsUserDialogOpen(false);
      setNewUserHwid('');
      setNewUserName('');
      setNewUserRole('customer');
      toast({ title: 'Success', description: 'New user has been created.' });
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="inline-flex h-auto rounded-lg bg-muted p-1 text-muted-foreground">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="orders">All Orders</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
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
                     <AlertDialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
                        <AlertDialogTrigger asChild>
                            <Button>Add New User</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Add New User</AlertDialogTitle>
                            <AlertDialogDescription>
                                Fill in the details for the new user.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="space-y-4 py-4">
                               <div className="space-y-2">
                                    <Label htmlFor="hwid">Device HWID</Label>
                                    <Input id="hwid" placeholder="Paste HWID from WhatsApp" value={newUserHwid} onChange={e => setNewUserHwid(e.target.value)} />
                               </div>
                               <div className="space-y-2">
                                    <Label htmlFor="username">Username</Label>
                                    <Input id="username" placeholder="e.g. John Doe" value={newUserName} onChange={e => setNewUserName(e.target.value)} />
                               </div>
                                <div className="space-y-2">
                                    <Label htmlFor="role">Role</Label>
                                    <Select value={newUserRole} onValueChange={(value: Role) => setNewUserRole(value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="customer">Customer</SelectItem>
                                            <SelectItem value="courier">Courier</SelectItem>
                                            <SelectItem value="admin">Admin</SelectItem>
                                        </SelectContent>
                                    </Select>
                               </div>
                            </div>
                            <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => {
                                    setNewUserHwid('');
                                    setNewUserName('');
                                    setNewUserRole('customer');
                                }}>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleAddUser}>Create User</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <Table className="mt-4">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Username</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>HWID</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map(user => (
                                <TableRow key={user.id}>
                                    <TableCell>{user.username}</TableCell>
                                    <TableCell><Badge variant="secondary">{user.role}</Badge></TableCell>
                                    <TableCell className="font-mono text-xs">{user.hwid}</TableCell>
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
                    <CardDescription>Set the delivery prices based on distance. These prices are used by the AI to calculate quotes.</CardDescription>
                </CardHeader>
                <CardContent>
                    <AlertDialog open={isPricingDialogOpen} onOpenChange={setIsPricingDialogOpen}>
                        <AlertDialogTrigger asChild>
                            <Button>Edit Pricing</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Edit Pricing Tiers</AlertDialogTitle>
                            <AlertDialogDescription>
                                Changes will be reflected in new order price calculations.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="space-y-4 py-4">
                                {editableTiers.map((tier, index) => (
                                    <div key={index} className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label>Distance Range</Label>
                                            <Input 
                                                value={tier.range}
                                                onChange={(e) => handlePriceChange(index, 'range', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <Label>Price (TL)</Label>
                                            <Input 
                                                type="number"
                                                value={tier.price}
                                                onChange={(e) => handlePriceChange(index, 'price', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleSavePricing}>Save Changes</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                     <Table className="mt-4">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Distance Range</TableHead>
                                <TableHead>Price (TL)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tiers.map(tier => (
                                <TableRow key={tier.range}>
                                    <TableCell>{tier.range}</TableCell>
                                    <TableCell>{tier.price} TL</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

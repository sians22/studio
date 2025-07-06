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
    .filter(o => o.status === 'Доставлен')
    .reduce((sum, o) => sum + o.price, 0);
  
  const totalOrders = orders.length;
  const ongoingOrders = orders.filter(o => o.status === 'Принят' || o.status === 'В пути').length;

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Доставлен': return 'default';
      case 'Отменен': return 'destructive';
      case 'Принят':
      case 'В пути': return 'secondary';
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
      toast({ title: 'Успех', description: 'Тарифные планы обновлены.' });
  }

  const handleAddUser = () => {
      if (!newUserHwid || !newUserName) {
          toast({ variant: 'destructive', title: 'Ошибка', description: 'Требуется HWID и имя пользователя.' });
          return;
      }
      if (users.some(u => u.hwid === newUserHwid)) {
         toast({ variant: 'destructive', title: 'Ошибка', description: 'Этот HWID уже зарегистрирован.' });
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
      toast({ title: 'Успех', description: 'Новый пользователь создан.' });
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Панель администратора</h1>
      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="inline-flex h-auto rounded-lg bg-muted p-1 text-muted-foreground">
          <TabsTrigger value="dashboard">Дашборд</TabsTrigger>
          <TabsTrigger value="orders">Все заказы</TabsTrigger>
          <TabsTrigger value="users">Пользователи</TabsTrigger>
          <TabsTrigger value="pricing">Ценообразование</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Общий доход</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalRevenue} руб.</div>
                <p className="text-xs text-muted-foreground">С доставленных заказов</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Всего заказов</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+{totalOrders}</div>
                <p className="text-xs text-muted-foreground">За все время</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Текущие доставки</CardTitle>
                <Truck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ongoingOrders}</div>
                <p className="text-xs text-muted-foreground">Активные в данный момент</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="orders">
            <Card className="mt-4">
                <CardHeader>
                    <CardTitle>Все заказы</CardTitle>
                    <CardDescription>Список всех заказов в системе.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID Заказа</TableHead>
                                <TableHead>Клиент</TableHead>
                                <TableHead>Курьер</TableHead>
                                <TableHead>Цена</TableHead>
                                <TableHead>Статус</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orders.map((order: Order) => (
                                <TableRow key={order.id}>
                                    <TableCell>#{order.id.slice(-6)}</TableCell>
                                    <TableCell>{order.customerId}</TableCell>
                                    <TableCell>{order.courierId || 'N/A'}</TableCell>
                                    <TableCell>{order.price} руб.</TableCell>
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
                    <CardTitle>Управление пользователями</CardTitle>
                    <CardDescription>Управляйте вашими клиентами и курьерами.</CardDescription>
                </CardHeader>
                <CardContent>
                     <AlertDialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
                        <AlertDialogTrigger asChild>
                            <Button>Добавить нового пользователя</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Добавить нового пользователя</AlertDialogTitle>
                            <AlertDialogDescription>
                                Заполните данные для нового пользователя.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="space-y-4 py-4">
                               <div className="space-y-2">
                                    <Label htmlFor="hwid">HWID Устройства</Label>
                                    <Input id="hwid" placeholder="Вставьте HWID из WhatsApp" value={newUserHwid} onChange={e => setNewUserHwid(e.target.value)} />
                               </div>
                               <div className="space-y-2">
                                    <Label htmlFor="username">Имя пользователя</Label>
                                    <Input id="username" placeholder="например, Иван Иванов" value={newUserName} onChange={e => setNewUserName(e.target.value)} />
                               </div>
                                <div className="space-y-2">
                                    <Label htmlFor="role">Роль</Label>
                                    <Select value={newUserRole} onValueChange={(value: Role) => setNewUserRole(value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Выберите роль" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="customer">Клиент</SelectItem>
                                            <SelectItem value="courier">Курьер</SelectItem>
                                            <SelectItem value="admin">Администратор</SelectItem>
                                        </SelectContent>
                                    </Select>
                               </div>
                            </div>
                            <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => {
                                    setNewUserHwid('');
                                    setNewUserName('');
                                    setNewUserRole('customer');
                                }}>Отмена</AlertDialogCancel>
                                <AlertDialogAction onClick={handleAddUser}>Создать пользователя</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <Table className="mt-4">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Имя пользователя</TableHead>
                                <TableHead>Роль</TableHead>
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
                    <CardTitle>Тарифные планы</CardTitle>
                    <CardDescription>Установите цены на доставку в зависимости от расстояния. Эти цены используются ИИ для расчета стоимости.</CardDescription>
                </CardHeader>
                <CardContent>
                    <AlertDialog open={isPricingDialogOpen} onOpenChange={setIsPricingDialogOpen}>
                        <AlertDialogTrigger asChild>
                            <Button>Редактировать цены</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Редактировать тарифные планы</AlertDialogTitle>
                            <AlertDialogDescription>
                                Изменения отразятся на расчетах цен новых заказов.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="space-y-4 py-4">
                                {editableTiers.map((tier, index) => (
                                    <div key={index} className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label>Диапазон расстояния</Label>
                                            <Input 
                                                value={tier.range}
                                                onChange={(e) => handlePriceChange(index, 'range', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <Label>Цена (руб.)</Label>
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
                            <AlertDialogCancel>Отмена</AlertDialogCancel>
                            <AlertDialogAction onClick={handleSavePricing}>Сохранить изменения</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                     <Table className="mt-4">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Диапазон расстояния</TableHead>
                                <TableHead>Цена (руб.)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tiers.map(tier => (
                                <TableRow key={tier.range}>
                                    <TableCell>{tier.range}</TableCell>
                                    <TableCell>{tier.price} руб.</TableCell>
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

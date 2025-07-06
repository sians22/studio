"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useState, useCallback } from "react";
import type { Order, OrderStatus } from "@/types";

interface OrderContextType {
  orders: Order[];
  addOrder: (order: Omit<Order, "id" | "createdAt" | "status">) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus, courierId?: string) => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

const mockOrders: Order[] = [
  {
    id: "order-1",
    customerId: "user-1",
    pickupAddress: "Таксим, Стамбул",
    dropoffAddress: "Галатская башня, Стамбул",
    senderPhone: "5551112233",
    receiverPhone: "5554445566",
    description: "Хрупкий предмет, обращаться с осторожностью.",
    status: "Доставлен",
    price: 10,
    distance: 2.5,
    createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
  },
  {
    id: "order-2",
    customerId: "user-1",
    pickupAddress: "Паромный терминал Кадыкёй, Стамбул",
    dropoffAddress: "Мода, Стамбул",
    senderPhone: "5552223344",
    receiverPhone: "5555556677",
    status: "Отменен",
    price: 10,
    distance: 1.8,
    createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
  },
   {
    id: "order-3",
    customerId: "user-other",
    pickupAddress: "Бешикташ, Стамбул",
    dropoffAddress: "Ортакёй, Стамбул",
    senderPhone: "5553334455",
    receiverPhone: "5556667788",
    description: "Пожалуйста, позвоните по прибытии.",
    status: "Ожидание",
    price: 10,
    distance: 2.1,
    createdAt: Date.now() - 60 * 1000,
  },
];


export function OrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>(mockOrders);

  const addOrder = useCallback((order: Omit<Order, "id" | "createdAt" | "status">) => {
    const newOrder: Order = {
      ...order,
      id: `order-${Date.now()}`,
      createdAt: Date.now(),
      status: "Ожидание",
    };
    setOrders((prev) => [newOrder, ...prev]);
  }, []);

  const updateOrderStatus = useCallback((orderId: string, status: OrderStatus, courierId?: string) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, status, courierId: courierId ?? order.courierId } : order
      )
    );
  }, []);

  return (
    <OrderContext.Provider value={{ orders, addOrder, updateOrderStatus }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrders() {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error("useOrders must be used within an OrderProvider");
  }
  return context;
}

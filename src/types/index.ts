export type Role = "customer" | "courier" | "admin";

export interface User {
  id: string;
  hwid: string;
  username: string;
  role: Role;
}

export type OrderStatus =
  | "Ожидание"
  | "Принят"
  | "В пути"
  | "Доставлен"
  | "Отменен";

export interface Order {
  id: string;
  customerId: string;
  courierId?: string;
  pickupAddress: string;
  dropoffAddress: string;
  senderPhone: string;
  receiverPhone: string;
  description?: string;
  status: OrderStatus;
  price: number;
  distance: number;
  createdAt: number;
}

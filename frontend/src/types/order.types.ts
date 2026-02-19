export type OrderType = 'INSTALL' | 'CHANGE' | 'DISCONNECT';
export type OrderStatus = 'CREATED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

export interface Order {
  _id?: string;
  orderId: string;
  orderType: OrderType;
  customerId: string;
  customerName?: string;
  services: { type: string; speed?: string }[];
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  failedAt?: string;
  failureReason?: string;
  stateHistory: { from: string; to: string; timestamp: string }[];
}

export interface CreateOrderInput {
  orderType: OrderType;
  customerId: string;
  customerName?: string;
  services: { type: string; speed?: string }[];
}

/** Allowed next states from current status (for UI) */
export const NEXT_STATES: Record<OrderStatus, OrderStatus[]> = {
  CREATED: ['IN_PROGRESS'],
  IN_PROGRESS: ['COMPLETED', 'FAILED'],
  COMPLETED: [],
  FAILED: [],
};

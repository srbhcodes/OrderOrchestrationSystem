export type OrderType = 'INSTALL' | 'CHANGE' | 'DISCONNECT';
export type OrderStatus = 'CREATED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

export interface Order {
  _id?: string;
  orderId: string;
  orderType: OrderType;
  customerId: string;
  customerName?: string;
  services: {
    type: string;
    speed?: string;
  }[];
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  stateHistory: StateTransition[];
}

export interface StateTransition {
  from: string;
  to: string;
  timestamp: Date;
}


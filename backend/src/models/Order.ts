import mongoose, { Schema, Document } from 'mongoose';
import { OrderType, OrderStatus, StateTransition } from '../../../shared/types/order.types';

export interface IOrder extends Document {
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

const OrderSchema = new Schema<IOrder>({
  orderId: { type: String, required: true, unique: true },
  orderType: { type: String, enum: ['INSTALL', 'CHANGE', 'DISCONNECT'], required: true },
  customerId: { type: String, required: true },
  customerName: { type: String },
  services: [{
    type: { type: String, required: true },
    speed: { type: String }
  }],
  status: { type: String, enum: ['CREATED', 'IN_PROGRESS', 'COMPLETED', 'FAILED'], default: 'CREATED' },
  completedAt: { type: Date },
  failedAt: { type: Date },
  failureReason: { type: String },
  stateHistory: [{
    from: { type: String },
    to: { type: String },
    timestamp: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

export default mongoose.model<IOrder>('Order', OrderSchema);


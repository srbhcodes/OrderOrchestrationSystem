import Order, { IOrder } from '../../models/Order';
import { OrderType, OrderStatus } from '../../../../shared/types/order.types';
import { canTransition } from './orderStateMachine';

let orderCounter = 0;

function generateOrderId(): string {
  orderCounter += 1;
  return `ORD-${Date.now().toString(36).toUpperCase()}-${orderCounter}`;
}

export interface CreateOrderInput {
  orderType: OrderType;
  customerId: string;
  customerName?: string;
  services: { type: string; speed?: string }[];
}

export const orderService = {
  async create(data: CreateOrderInput): Promise<IOrder> {
    const orderId = generateOrderId();
    const order = new Order({
      orderId,
      orderType: data.orderType,
      customerId: data.customerId,
      customerName: data.customerName,
      services: data.services,
      status: 'CREATED' as OrderStatus,
      stateHistory: [{ from: '', to: 'CREATED', timestamp: new Date() }],
    });
    await order.save();
    return order;
  },

  async findAll(): Promise<IOrder[]> {
    return Order.find().sort({ createdAt: -1 }).lean();
  },

  async findById(id: string): Promise<IOrder | null> {
    return Order.findOne({ _id: id }).lean();
  },

  async findByOrderId(orderId: string): Promise<IOrder | null> {
    return Order.findOne({ orderId }).lean();
  },

  async updateStatus(
    id: string,
    newStatus: OrderStatus,
    failureReason?: string
  ): Promise<{ order: IOrder; error?: string }> {
    const order = await Order.findById(id);
    if (!order) {
      return { order: null as any, error: 'Order not found' };
    }
    const currentStatus = order.status as OrderStatus;
    if (!canTransition(currentStatus, newStatus)) {
      return {
        order: order.toObject(),
        error: `Invalid transition: ${currentStatus} → ${newStatus}`,
      };
    }
    const from = currentStatus;
    order.status = newStatus;
    order.stateHistory = (order.stateHistory || []).concat({
      from,
      to: newStatus,
      timestamp: new Date(),
    }).slice(-5);
    if (newStatus === 'COMPLETED') {
      order.completedAt = new Date();
      order.failedAt = undefined;
      order.failureReason = undefined;
    }
    if (newStatus === 'FAILED') {
      order.failedAt = new Date();
      order.failureReason = failureReason || 'No reason provided';
      order.completedAt = undefined;
    }
    await order.save();
    return { order: order.toObject() };
  },
};

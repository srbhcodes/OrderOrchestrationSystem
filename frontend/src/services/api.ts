import axios from 'axios';
import type { Order, CreateOrderInput } from '../types/order.types';

const API_BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

export const ordersApi = {
  list: async (): Promise<Order[]> => {
    const { data } = await api.get<{ success: boolean; data: Order[] }>('/api/orders');
    if (!data.success) throw new Error('Failed to fetch orders');
    return data.data;
  },

  getById: async (id: string): Promise<Order> => {
    const { data } = await api.get<{ success: boolean; data: Order }>(`/api/orders/${id}`);
    if (!data.success) throw new Error('Failed to fetch order');
    return data.data;
  },

  getByOrderId: async (orderId: string): Promise<Order> => {
    const { data } = await api.get<{ success: boolean; data: Order }>(`/api/orders/orderId/${orderId}`);
    if (!data.success) throw new Error('Failed to fetch order');
    return data.data;
  },

  create: async (input: CreateOrderInput): Promise<Order> => {
    const { data } = await api.post<{ success: boolean; data: Order }>('/api/orders', input);
    if (!data.success) throw new Error('Failed to create order');
    return data.data;
  },

  updateStatus: async (
    id: string,
    status: Order['status'],
    failureReason?: string
  ): Promise<Order> => {
    const { data } = await api.patch<{ success: boolean; data: Order }>(`/api/orders/${id}/status`, {
      status,
      ...(failureReason !== undefined && { failureReason }),
    });
    if (!data.success) throw new Error('Failed to update status');
    return data.data;
  },
};

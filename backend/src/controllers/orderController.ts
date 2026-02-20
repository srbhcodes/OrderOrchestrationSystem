import { Request, Response } from 'express';
import { orderService } from '../services/order/orderService';
import { generateAndPersistTasks } from '../services/task/taskService';
import { enqueueReadyTasksForOrder } from '../queues/taskQueue';

export const orderController = {
  async create(req: Request, res: Response) {
    try {
      const { orderType, customerId, customerName, services } = req.body;
      if (!orderType || !customerId || !services?.length) {
        return res.status(400).json({
          success: false,
          message: 'orderType, customerId, and services are required',
        });
      }
      const order = await orderService.create({
        orderType,
        customerId,
        customerName,
        services,
      });
      return res.status(201).json({ success: true, data: order });
    } catch (error: any) {
      console.error('Order create error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to create order' });
    }
  },

  async list(req: Request, res: Response) {
    try {
      const orders = await orderService.findAll();
      return res.json({ success: true, data: orders });
    } catch (error: any) {
      console.error('Order list error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to list orders' });
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const order = await orderService.findById(id);
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }
      return res.json({ success: true, data: order });
    } catch (error: any) {
      console.error('Order get error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to get order' });
    }
  },

  async getByOrderId(req: Request, res: Response) {
    try {
      const { orderId } = req.params;
      const order = await orderService.findByOrderId(orderId);
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }
      return res.json({ success: true, data: order });
    } catch (error: any) {
      console.error('Order get error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to get order' });
    }
  },

  async updateStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, failureReason } = req.body;
      if (!status) {
        return res.status(400).json({ success: false, message: 'status is required' });
      }
      const result = await orderService.updateStatus(id, status, failureReason);
      if (result.error) {
        return res.status(400).json({ success: false, message: result.error });
      }
      if (!result.order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }
      if (result.order.status === 'IN_PROGRESS') {
        const taskResult = await generateAndPersistTasks(
          result.order.orderId,
          result.order.orderType
        );
        if (taskResult.error) {
          console.error('Task generation error:', taskResult.error);
        } else {
          await enqueueReadyTasksForOrder(result.order.orderId);
        }
      }
      const io = (global as any).io;
      if (io) io.to('orders').emit('order:updated', { orderId: result.order.orderId });
      return res.json({ success: true, data: result.order });
    } catch (error: any) {
      console.error('Order updateStatus error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to update status' });
    }
  },
};

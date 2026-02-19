import { Request, Response } from 'express';
import { listByOrderId } from '../services/task/taskService';
import { orderService } from '../services/order/orderService';

export const taskController = {
  async listByOrder(req: Request, res: Response) {
    try {
      const orderId = req.query.orderId as string;
      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'orderId query is required',
        });
      }
      const tasks = await listByOrderId(orderId);
      return res.json({ success: true, data: tasks });
    } catch (error: any) {
      console.error('Task list error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to list tasks' });
    }
  },

  async listByOrderMongoId(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const order = await orderService.findById(id);
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }
      const tasks = await listByOrderId(order.orderId);
      return res.json({ success: true, data: tasks });
    } catch (error: any) {
      console.error('Task list error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to list tasks' });
    }
  },
};

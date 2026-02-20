import Order from '../../models/Order';
import Task from '../../models/Task';
import type { OrderStatus } from '../../../../shared/types/order.types';
import { enqueueTask, enqueueTaskWithDelay } from '../../queues/taskQueue';
import { executeTask } from './taskExecutor';

const RETRY_DELAY_MS = 2000;

function getIo() {
  return (global as any).io;
}

export async function onTaskCompleted(taskId: string): Promise<void> {
  const task = await Task.findOne({ taskId }).lean();
  if (!task) return;

  const orderId = task.orderId;
  const allTasks = await Task.find({ orderId }).lean();

  const completedIds = new Set(
    allTasks.filter((t) => t.status === 'COMPLETED').map((t) => t.taskId)
  );

  for (const t of allTasks) {
    if (t.status !== 'PENDING') continue;
    const deps = t.dependsOn || [];
    const allDepsDone = deps.length > 0 && deps.every((d) => completedIds.has(d));
    if (allDepsDone) {
      await Task.updateOne({ taskId: t.taskId }, { status: 'READY' });
      await enqueueTask(t.taskId);
    }
  }

  const updated = await Task.find({ orderId }).lean();
  const allCompleted = updated.every((t) => t.status === 'COMPLETED');
  if (allCompleted) {
    await updateOrderStatus(orderId, 'COMPLETED');
  }

  const io = getIo();
  if (io) {
    io.to('orders').emit('task:updated', { taskId, orderId, status: 'COMPLETED' });
    io.to('orders').emit('order:updated', { orderId });
  }
}

export async function onTaskFailed(taskId: string): Promise<void> {
  const task = await Task.findOne({ taskId });
  if (!task) return;

  const orderId = task.orderId;
  await updateOrderStatus(orderId, 'FAILED', task.error?.message);

  const io = getIo();
  if (io) {
    io.to('orders').emit('task:updated', { taskId, orderId, status: 'FAILED' });
    io.to('orders').emit('order:updated', { orderId });
  }
}

async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  failureReason?: string
): Promise<void> {
  const order = await Order.findOne({ orderId });
  if (!order) return;

  const from = order.status;
  order.status = status;
  order.stateHistory = (order.stateHistory || []).concat({
    from,
    to: status,
    timestamp: new Date(),
  }).slice(-5);
  if (status === 'COMPLETED') {
    order.completedAt = new Date();
    order.failedAt = undefined;
    order.failureReason = undefined;
  } else {
    order.failedAt = new Date();
    order.failureReason = failureReason || 'Task failed';
    order.completedAt = undefined;
  }
  await order.save();
}

export async function tryRetryOrFail(taskId: string): Promise<boolean> {
  const task = await Task.findOne({ taskId });
  if (!task) return false;

  if (task.retryCount < task.maxRetries) {
    task.retryCount += 1;
    task.status = 'READY';
    task.error = undefined;
    task.failedAt = undefined;
    await task.save();
    await enqueueTaskWithDelay(taskId, RETRY_DELAY_MS);
    return true;
  }
  return false;
}

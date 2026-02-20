import { Queue } from 'bullmq';
import { redisClient } from '../config/redis';
import Task from '../models/Task';

const QUEUE_NAME = 'task-execution';

export const taskQueue = new Queue(QUEUE_NAME, {
  connection: redisClient,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: { count: 100 },
  },
});

export async function enqueueTask(taskId: string): Promise<void> {
  await taskQueue.add('execute', { taskId }, { jobId: taskId });
}

export async function enqueueTaskWithDelay(taskId: string, delayMs: number): Promise<void> {
  await taskQueue.add('execute', { taskId }, { delay: delayMs, jobId: `${taskId}-retry-${Date.now()}` });
}

export async function enqueueReadyTasksForOrder(orderId: string): Promise<number> {
  const ready = await Task.find({ orderId, status: 'READY' });
  let count = 0;
  for (const t of ready) {
    await enqueueTask(t.taskId);
    count++;
  }
  return count;
}

import { Worker } from 'bullmq';
import { redisClient } from '../../config/redis';
import { executeTask } from '../../services/task/taskExecutor';
import { onTaskCompleted, onTaskFailed, tryRetryOrFail } from '../../services/task/orchestration';

const QUEUE_NAME = 'task-execution';

export function startTaskWorker(): void {
  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { taskId } = job.data as { taskId: string };
      if (!taskId) return;

      const result = await executeTask(taskId);

      if (result.success) {
        await onTaskCompleted(taskId);
      } else {
        const didRetry = await tryRetryOrFail(taskId);
        if (!didRetry) {
          await onTaskFailed(taskId);
        }
      }
    },
    {
      connection: redisClient,
      concurrency: 1,
    }
  );

  worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err?.message);
  });
}

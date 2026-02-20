import Task from '../../models/Task';
import { executeMockTask } from '../../utils/mockService';
import type { ITask } from '../../models/Task';

export async function executeTask(taskId: string): Promise<{ success: boolean; error?: string }> {
  const task = await Task.findOne({ taskId });
  if (!task) {
    return { success: false, error: 'Task not found' };
  }
  if (task.status !== 'READY' && task.status !== 'RUNNING') {
    return { success: false, error: `Task not runnable: ${task.status}` };
  }

  task.status = 'RUNNING';
  task.startedAt = new Date();
  await task.save();

  try {
    const result = await executeMockTask(task.taskType);
    task.status = 'COMPLETED';
    task.completedAt = new Date();
    task.result = { success: true, data: result.data };
    task.error = undefined;
    await task.save();
    return { success: true };
  } catch (err: any) {
    task.status = 'FAILED';
    task.failedAt = new Date();
    task.error = { message: err?.message || 'Unknown error', code: 'MOCK_FAILURE' };
    await task.save();
    return { success: false, error: err?.message };
  }
}

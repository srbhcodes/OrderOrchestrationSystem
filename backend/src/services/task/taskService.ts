import Task, { ITask } from '../../models/Task';
import type { OrderType } from '../../../../shared/types/order.types';
import { generateTaskBlueprint } from './taskBlueprintGenerator';
import { hasCycle, buildDependencyGraph } from './dependencyResolver';

export async function generateAndPersistTasks(
  orderId: string,
  orderType: OrderType
): Promise<{ tasks: ITask[]; error?: string }> {
  const existing = await Task.find({ orderId }).lean();
  if (existing.length > 0) {
    return { tasks: existing as ITask[] };
  }

  const blueprint = generateTaskBlueprint(orderId, orderType);
  const graph = buildDependencyGraph(
    blueprint.map((b) => ({ taskId: b.taskId, dependsOn: b.dependsOn }))
  );
  if (hasCycle(graph)) {
    return { tasks: [], error: 'Circular dependency in task blueprint' };
  }

  const tasks: ITask[] = [];
  for (const step of blueprint) {
    const hasNoDeps = step.dependsOn.length === 0;
    const task = new Task({
      taskId: step.taskId,
      orderId,
      taskType: step.taskType,
      status: hasNoDeps ? 'READY' : 'PENDING',
      dependsOn: step.dependsOn,
      retryCount: 0,
      maxRetries: 3,
    });
    await task.save();
    tasks.push(task.toObject());
  }

  return { tasks };
}

export async function listByOrderId(orderId: string): Promise<ITask[]> {
  return Task.find({ orderId }).sort({ createdAt: 1 }).lean();
}

export async function getByTaskId(taskId: string): Promise<ITask | null> {
  return Task.findOne({ taskId }).lean();
}

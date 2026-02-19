import type { OrderType } from '../../../../shared/types/order.types';
import type { TaskType } from '../../../../shared/types/task.types';

export interface BlueprintStep {
  taskId: string;
  taskType: TaskType;
  dependsOn: string[];
}

/**
 * Generates task blueprint for an order. TaskIds are orderId-TASK-1, TASK-2, ...
 * INSTALL: VALIDATE → PROVISION → BILLING
 * CHANGE: VALIDATE → BILLING (skip PROVISION)
 * DISCONNECT: VALIDATE → BILLING
 */
export function generateTaskBlueprint(orderId: string, orderType: OrderType): BlueprintStep[] {
  const steps: { taskType: TaskType; dependsOnTypes: TaskType[] }[] = [];

  switch (orderType) {
    case 'INSTALL':
      steps.push({ taskType: 'VALIDATE', dependsOnTypes: [] });
      steps.push({ taskType: 'PROVISION', dependsOnTypes: ['VALIDATE'] });
      steps.push({ taskType: 'BILLING', dependsOnTypes: ['PROVISION'] });
      break;
    case 'CHANGE':
      steps.push({ taskType: 'VALIDATE', dependsOnTypes: [] });
      steps.push({ taskType: 'BILLING', dependsOnTypes: ['VALIDATE'] });
      break;
    case 'DISCONNECT':
      steps.push({ taskType: 'VALIDATE', dependsOnTypes: [] });
      steps.push({ taskType: 'BILLING', dependsOnTypes: ['VALIDATE'] });
      break;
    default:
      steps.push({ taskType: 'VALIDATE', dependsOnTypes: [] });
      steps.push({ taskType: 'BILLING', dependsOnTypes: ['VALIDATE'] });
  }

  const taskIds = steps.map((_, i) => `${orderId}-TASK-${i + 1}`);

  return steps.map((step, i) => ({
    taskId: taskIds[i],
    taskType: step.taskType,
    dependsOn: step.dependsOnTypes.map((t) => taskIds[steps.findIndex((s) => s.taskType === t)]),
  }));
}

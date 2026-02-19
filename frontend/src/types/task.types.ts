export type TaskType = 'VALIDATE' | 'PROVISION' | 'BILLING';
export type TaskStatus = 'PENDING' | 'READY' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface Task {
  _id?: string;
  taskId: string;
  orderId: string;
  taskType: TaskType;
  status: TaskStatus;
  dependsOn: string[];
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  error?: { message: string; code: string };
  result?: { success: boolean; data?: unknown };
}

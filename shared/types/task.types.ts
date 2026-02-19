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
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  error?: {
    message: string;
    code: string;
  };
  result?: {
    success: boolean;
    data?: any;
  };
}

export interface TaskBlueprint {
  taskType: TaskType;
  dependsOn: string[];
}


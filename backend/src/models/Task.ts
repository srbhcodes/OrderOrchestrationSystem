import mongoose, { Schema, Document } from 'mongoose';
import { TaskType, TaskStatus } from '../../../shared/types/task.types';

export interface ITask extends Document {
  taskId: string;
  orderId: string;
  taskType: TaskType;
  status: TaskStatus;
  dependsOn: string[];
  retryCount: number;
  maxRetries: number;
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

const TaskSchema = new Schema<ITask>({
  taskId: { type: String, required: true, unique: true },
  orderId: { type: String, required: true, index: true },
  taskType: { type: String, enum: ['VALIDATE', 'PROVISION', 'BILLING'], required: true },
  status: { type: String, enum: ['PENDING', 'READY', 'RUNNING', 'COMPLETED', 'FAILED'], default: 'PENDING' },
  dependsOn: [{ type: String }],
  retryCount: { type: Number, default: 0 },
  maxRetries: { type: Number, default: 3 },
  startedAt: { type: Date },
  completedAt: { type: Date },
  failedAt: { type: Date },
  error: {
    message: { type: String },
    code: { type: String }
  },
  result: {
    success: { type: Boolean },
    data: { type: Schema.Types.Mixed }
  }
}, {
  timestamps: true
});

export default mongoose.model<ITask>('Task', TaskSchema);


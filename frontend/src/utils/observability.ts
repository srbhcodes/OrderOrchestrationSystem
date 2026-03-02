/**
 * Shared observability: execution phases, status colors, relative time.
 * One mental model: CREATED → INIT → TASK GEN → DEPENDENCY → QUEUE → WORKER → COMPLETION.
 */
import type { Order, OrderStatus } from '../types/order.types';
import type { Task, TaskStatus } from '../types/task.types';

export const EXECUTION_PHASES = [
  'Created',
  'Initialization',
  'Task Generation',
  'Dependency Resolution',
  'Queue',
  'Worker Execution',
  'Completion',
] as const;

export type ExecutionPhase = (typeof EXECUTION_PHASES)[number];

/** Status colors: CREATED (gray), IN_PROGRESS (blue + pulse), COMPLETED (green), FAILED (red) */
export const ORDER_STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; class: string; pulse?: boolean }
> = {
  CREATED: { label: 'Created', class: 'bg-gray-100 text-gray-800 border-gray-200', pulse: false },
  IN_PROGRESS: {
    label: 'In progress',
    class: 'bg-blue-100 text-blue-800 border-blue-200',
    pulse: true,
  },
  COMPLETED: { label: 'Completed', class: 'bg-green-100 text-green-800 border-green-200', pulse: false },
  FAILED: { label: 'Failed', class: 'bg-red-100 text-red-800 border-red-200', pulse: false },
};

export const TASK_STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; class: string; pulse?: boolean }
> = {
  PENDING: { label: 'Pending', class: 'bg-gray-100 text-gray-700 border-gray-200', pulse: false },
  READY: { label: 'Ready', class: 'bg-amber-100 text-amber-800 border-amber-200', pulse: false },
  RUNNING: {
    label: 'Running',
    class: 'bg-blue-100 text-blue-800 border-blue-200',
    pulse: true,
  },
  COMPLETED: { label: 'Completed', class: 'bg-green-100 text-green-800 border-green-200', pulse: false },
  FAILED: { label: 'Failed', class: 'bg-red-100 text-red-800 border-red-200', pulse: false },
};

/** Derive current execution phase from order + tasks */
export function getOrderPhase(order: Order, tasks: Task[]): ExecutionPhase | 'Failed' {
  if (order.status === 'CREATED') return 'Created';
  if (order.status === 'FAILED') return 'Failed';
  if (order.status === 'COMPLETED') return 'Completion';

  // IN_PROGRESS: derive from task states
  if (tasks.length === 0) return 'Task Generation';
  const hasRunning = tasks.some((t) => t.status === 'RUNNING');
  const hasReady = tasks.some((t) => t.status === 'READY');
  const allCompleted = tasks.every((t) => t.status === 'COMPLETED');
  const allPending = tasks.every((t) => t.status === 'PENDING');

  if (hasRunning) return 'Worker Execution';
  if (hasReady) return 'Queue';
  if (allCompleted) return 'Completion';
  if (allPending) return 'Dependency Resolution';
  return 'Queue';
}

/** Progress: fraction of phases completed (0–1) for IN_PROGRESS orders */
export function getOrderProgress(order: Order, tasks: Task[]): number {
  if (order.status === 'CREATED') return 0;
  if (order.status === 'COMPLETED' || order.status === 'FAILED') return 1;
  if (tasks.length === 0) return 0.15;
  const completed = tasks.filter((t) => t.status === 'COMPLETED').length;
  return Math.min(0.95, 0.2 + (completed / tasks.length) * 0.75);
}

/** Relative time string */
export function relativeTime(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const sec = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} hr ago`;
  return `${Math.floor(sec / 86400)} day(s) ago`;
}

export function formatTimestamp(iso: string | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

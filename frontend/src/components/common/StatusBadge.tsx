/**
 * Consistent status badge with optional pulse for RUNNING / IN_PROGRESS.
 */
import { ORDER_STATUS_CONFIG } from '../../utils/observability';
import { TASK_STATUS_CONFIG } from '../../utils/observability';
import type { OrderStatus } from '../../types/order.types';
import type { TaskStatus } from '../../types/task.types';

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const config = ORDER_STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium ${config.class}`}
    >
      {config.pulse && <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" aria-hidden />}
      {config.label}
    </span>
  );
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const config = TASK_STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium ${config.class}`}
    >
      {config.pulse && <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" aria-hidden />}
      {config.label}
    </span>
  );
}

import type { OrderStatus } from '../../../../shared/types/order.types';

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  CREATED: ['IN_PROGRESS'],
  IN_PROGRESS: ['COMPLETED', 'FAILED'],
  COMPLETED: [],
  FAILED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  const allowed = VALID_TRANSITIONS[from];
  return Array.isArray(allowed) && allowed.includes(to);
}

export function getNextStates(current: OrderStatus): OrderStatus[] {
  return VALID_TRANSITIONS[current] ?? [];
}

export function isTerminal(status: OrderStatus): boolean {
  return status === 'COMPLETED' || status === 'FAILED';
}

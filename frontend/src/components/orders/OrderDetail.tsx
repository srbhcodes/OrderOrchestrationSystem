import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ordersApi } from '../../services/api';
import { useWebSocket } from '../../contexts/WebSocketContext';
import type { Order, OrderStatus } from '../../types/order.types';
import type { Task } from '../../types/task.types';
import { NEXT_STATES } from '../../types/order.types';
import { OrderStatusBadge } from '../common/StatusBadge';
import { TaskStatusBadge } from '../common/StatusBadge';
import { TechnicalContext } from '../common/TechnicalContext';
import {
  getOrderPhase,
  getOrderProgress,
  formatTimestamp,
  EXECUTION_PHASES,
} from '../../utils/observability';

export function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [failReason, setFailReason] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const { orderUpdateTrigger, taskUpdateTrigger, connected } = useWebSocket();

  const fetchOrder = async () => {
    if (!id) return;
    try {
      setError(null);
      const data = await ordersApi.getById(id);
      setOrder(data);
      return data;
    } catch (e: any) {
      setError(e.message || 'Failed to load order');
    }
  };

  const fetchTasks = async () => {
    if (!id) return;
    try {
      const data = await ordersApi.getTasks(id);
      setTasks(data);
    } catch {
      setTasks([]);
    }
  };

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const orderData = await fetchOrder();
      setLoading(false);
      if (!cancelled && orderData?.status === 'IN_PROGRESS') {
        fetchTasks();
      }
    };
    load();
    return () => { cancelled = true; };
  }, [id, orderUpdateTrigger]);

  useEffect(() => {
    if (!id || !order || order.status !== 'IN_PROGRESS') return;
    fetchTasks();
  }, [taskUpdateTrigger]);

  const handleTransition = async (newStatus: OrderStatus) => {
    if (!id || !order) return;
    setTransitioning(true);
    setError(null);
    try {
      const updated = await ordersApi.updateStatus(
        id,
        newStatus,
        newStatus === 'FAILED' ? failReason || undefined : undefined
      );
      setOrder(updated);
      setFailReason('');
      if (updated.status === 'IN_PROGRESS') fetchTasks();
    } catch (e: any) {
      setError(e.response?.data?.message || e.message || 'Failed to update status');
    } finally {
      setTransitioning(false);
    }
  };

  if (loading) return <div className="py-8 text-center text-gray-500">Loading...</div>;
  if (error && !order) return <div className="rounded-lg bg-red-50 p-4 text-red-700">{error}</div>;
  if (!order) return <div className="py-8 text-center text-gray-500">Order not found.</div>;

  const nextStates = NEXT_STATES[order.status] || [];
  const phase = getOrderPhase(order, tasks);
  const progress = getOrderProgress(order, tasks);
  const isLive = order.status === 'IN_PROGRESS';

  const duration =
    order.completedAt || order.failedAt
      ? (new Date(order.completedAt || order.failedAt!).getTime() - new Date(order.createdAt).getTime()) / 1000
      : (Date.now() - new Date(order.createdAt).getTime()) / 1000;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Execution header: status, phase, duration */}
      <div
        className={`rounded-xl border-2 p-4 ${
          isLive ? 'border-blue-200 bg-blue-50/50' : order.status === 'FAILED' ? 'border-red-200 bg-red-50/30' : 'border-gray-200 bg-white'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {isLive && <span className="h-3 w-3 rounded-full bg-blue-500 animate-pulse" aria-hidden />}
            <h1 className="text-xl font-semibold text-gray-900">{order.orderId}</h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div>
              <p className="text-xs font-medium text-gray-500">Current phase</p>
              <p className="font-medium text-gray-900">{phase}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Progress</p>
              <p className="font-medium text-gray-900">
                {order.status === 'COMPLETED' || order.status === 'FAILED' ? '100%' : `${Math.round(progress * 100)}%`}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Duration</p>
              <p className="font-medium text-gray-900">{duration < 60 ? `${Math.round(duration)}s` : `${(duration / 60).toFixed(1)}m`}</p>
            </div>
            {connected && (
              <span className="rounded border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                LIVE
              </span>
            )}
          </div>
        </div>
        {order.failureReason && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
            <p className="text-xs font-semibold text-red-800">Failure reason</p>
            <p className="text-sm text-red-700">{order.failureReason}</p>
          </div>
        )}
      </div>

      {/* Lifecycle timeline: stages */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">Lifecycle</h2>
        <p className="text-xs text-gray-500 mt-0.5">Completed, running, and pending stages</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {EXECUTION_PHASES.map((p) => {
            const isCurrent = phase === p;
            const phaseIndex = phase === 'Failed' ? EXECUTION_PHASES.length : EXECUTION_PHASES.indexOf(phase as typeof EXECUTION_PHASES[number]);
            const isPast = EXECUTION_PHASES.indexOf(p) < phaseIndex || order.status === 'COMPLETED' || (order.status === 'FAILED' && p !== 'Completion');
            return (
              <span
                key={p}
                className={`rounded-md border px-2 py-1 text-xs font-medium ${
                  isCurrent ? 'border-blue-300 bg-blue-100 text-blue-900' : isPast ? 'border-green-200 bg-green-50 text-green-800' : 'border-gray-200 bg-gray-50 text-gray-500'
                }`}
              >
                {p}
              </span>
            );
          })}
          {order.status === 'FAILED' && <span className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-800">Failed</span>}
        </div>
      </div>

      {/* Order fields: compact */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">Order</h2>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div><dt className="text-gray-500">Type</dt><dd className="font-medium text-gray-900">{order.orderType}</dd></div>
          <div><dt className="text-gray-500">Customer</dt><dd className="font-medium text-gray-900">{order.customerName || order.customerId}</dd></div>
          <div><dt className="text-gray-500">Created</dt><dd className="text-gray-700">{formatTimestamp(order.createdAt)}</dd></div>
          {(order.completedAt || order.failedAt) && (
            <div>
              <dt className="text-gray-500">{order.completedAt ? 'Completed' : 'Failed'}</dt>
              <dd className="text-gray-700">{formatTimestamp(order.completedAt || order.failedAt)}</dd>
            </div>
          )}
        </dl>
        <div className="mt-2 text-sm text-gray-600">Services: {order.services.map((s) => `${s.type}${s.speed ? ` ${s.speed}` : ''}`).join(', ')}</div>
      </div>

      {/* Dependency visualization + task execution cards */}
      {tasks.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 px-4 py-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Task execution</h2>
            <Link to="/flow" className="text-xs text-blue-600 hover:underline">Full flow</Link>
          </div>
          <div className="p-4">
            <p className="text-xs font-medium text-gray-500 mb-2">Dependency flow (execution order)</p>
            <div className="flex flex-wrap items-center gap-1 mb-4">
              {tasks.map((t, i) => (
                <span key={t.taskId} className="flex items-center gap-1">
                  <span
                    className={`rounded border px-2 py-0.5 text-xs font-medium ${
                      t.status === 'COMPLETED' ? 'border-green-300 bg-green-50 text-green-800' :
                      t.status === 'FAILED' ? 'border-red-300 bg-red-50 text-red-800' :
                      t.status === 'RUNNING' ? 'border-blue-300 bg-blue-50 text-blue-800' :
                      t.status === 'READY' ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-gray-200 bg-gray-50 text-gray-700'
                    }`}
                  >
                    {t.taskType}
                  </span>
                  {i < tasks.length - 1 && <span className="text-gray-400">→</span>}
                </span>
              ))}
            </div>

            <ul className="space-y-3">
              {tasks.map((task) => (
                <li
                  key={task.taskId}
                  className={`rounded-lg border px-4 py-3 ${
                    task.status === 'RUNNING' ? 'border-blue-200 bg-blue-50/30' : task.status === 'FAILED' ? 'border-red-200 bg-red-50/20' : 'border-gray-200 bg-gray-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-mono text-sm font-medium text-gray-900">{task.taskId}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{task.taskType}</span>
                      <TaskStatusBadge status={task.status} />
                      {(task.retryCount ?? 0) > 0 && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                          Retry {task.retryCount}/{task.maxRetries}
                        </span>
                      )}
                    </div>
                  </div>
                  {task.dependsOn?.length > 0 && (
                    <p className="mt-1 text-xs text-gray-500">Depends on: {task.dependsOn.join(', ')}</p>
                  )}
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600 sm:grid-cols-4">
                    <span>Started: {task.startedAt ? formatTimestamp(task.startedAt) : '—'}</span>
                    <span>Completed: {task.completedAt ? formatTimestamp(task.completedAt) : '—'}</span>
                    <span>Failed: {task.failedAt ? formatTimestamp(task.failedAt) : '—'}</span>
                  </div>
                  {task.error?.message && (
                    <div className="mt-2 rounded border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-700">
                      <strong>Error:</strong> {task.error.message}
                    </div>
                  )}
                  {task.result && task.status === 'COMPLETED' && (
                    <div className="mt-2 rounded border border-green-200 bg-green-50/50 px-2 py-1.5 text-xs text-green-800">
                      Result: {task.result.success ? 'Success' : 'No'}{task.result.data ? ' (data present)' : ''}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {order.status === 'CREATED' && tasks.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900">Tasks</h2>
          <p className="mt-2 text-sm text-gray-600">No tasks yet. Click <strong>Start</strong> below to begin orchestration (task generation → queue → worker).</p>
        </div>
      )}

      {/* Execution / event timeline (state history) */}
      {order.stateHistory?.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900">Event timeline</h2>
          <p className="text-xs text-gray-500 mt-0.5">State transitions (last 5)</p>
          <ul className="mt-3 space-y-2">
            {order.stateHistory.map((h, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className="text-gray-400">{h.from || '—'}</span>
                <span className="text-gray-500">→</span>
                <span className="font-medium text-gray-900">{h.to}</span>
                <span className="text-xs text-gray-500">{formatTimestamp(h.timestamp)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Transition actions */}
      {nextStates.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900">Actions</h2>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          {nextStates.includes('FAILED') && (
            <div className="mt-2">
              <label className="block text-xs font-medium text-gray-500">Failure reason (optional)</label>
              <input
                type="text"
                value={failReason}
                onChange={(e) => setFailReason(e.target.value)}
                placeholder="e.g. Provisioning timeout"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {nextStates.map((status) => (
              <button
                key={status}
                type="button"
                disabled={transitioning}
                onClick={() => handleTransition(status)}
                className={`rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 ${
                  status === 'FAILED' ? 'bg-red-100 text-red-800 hover:bg-red-200' :
                  status === 'COMPLETED' ? 'bg-green-100 text-green-800 hover:bg-green-200' :
                  'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {status === 'IN_PROGRESS' ? 'Start' : status === 'COMPLETED' ? 'Mark complete' : 'Mark as failed'}
              </button>
            ))}
          </div>
        </div>
      )}

      <TechnicalContext title="Technical context — API and backend behavior">
        <p className="mb-2">Data from <code>GET /api/orders/:id</code> and <code>GET /api/orders/:id/tasks</code>. Socket.io <code>order:updated</code> / <code>task:updated</code> trigger refetch. State machine: only valid transitions allowed (CREATED→IN_PROGRESS, IN_PROGRESS→COMPLETED|FAILED).</p>
        <p className="mb-2">Start: <code>PATCH /api/orders/:id/status</code> with status IN_PROGRESS. Backend runs blueprint generator, dependency resolver, persists tasks, enqueues READY tasks to BullMQ. Worker processes jobs; on task completion dependents are marked READY and enqueued; when all complete order set COMPLETED. On task failure: retry up to 3× (2s delay); then task and order set FAILED.</p>
      </TechnicalContext>

      <div>
        <Link to="/" className="text-sm font-medium text-blue-600 hover:underline">← Back to orders</Link>
      </div>
    </div>
  );
}

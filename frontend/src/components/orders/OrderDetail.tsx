import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ordersApi } from '../../services/api';
import { useWebSocket } from '../../contexts/WebSocketContext';
import type { Order, OrderStatus } from '../../types/order.types';
import type { Task } from '../../types/task.types';
import { NEXT_STATES } from '../../types/order.types';

const statusColors: Record<string, string> = {
  CREATED: 'bg-gray-100 text-gray-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
};

export function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [failReason, setFailReason] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const { orderUpdateTrigger, taskUpdateTrigger } = useWebSocket();

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

  return (
    <div className="mx-auto max-w-2xl rounded-lg border border-gray-200 bg-white p-6 shadow">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">{order.orderId}</h2>
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${statusColors[order.status] || 'bg-gray-100'}`}>
          {order.status}
        </span>
      </div>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-sm font-medium text-gray-500">Order Type</dt>
          <dd className="mt-0.5 text-sm text-gray-900">{order.orderType}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-gray-500">Customer ID</dt>
          <dd className="mt-0.5 text-sm text-gray-900">{order.customerId}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-gray-500">Customer Name</dt>
          <dd className="mt-0.5 text-sm text-gray-900">{order.customerName || '—'}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-gray-500">Created</dt>
          <dd className="mt-0.5 text-sm text-gray-900">{new Date(order.createdAt).toLocaleString()}</dd>
        </div>
      </dl>
      <div className="mt-4">
        <dt className="text-sm font-medium text-gray-500">Services</dt>
        <dd className="mt-1 text-sm text-gray-900">
          {order.services.map((s, i) => (
            <span key={i}>{s.type}{s.speed ? ` (${s.speed})` : ''}</span>
          ))}
        </dd>
      </div>
      {order.failureReason && (
        <div className="mt-4">
          <dt className="text-sm font-medium text-gray-500">Failure Reason</dt>
          <dd className="mt-0.5 text-sm text-red-700">{order.failureReason}</dd>
        </div>
      )}
      {order.stateHistory?.length > 0 && (
        <div className="mt-4">
          <dt className="text-sm font-medium text-gray-500">State History</dt>
          <dd className="mt-1 text-sm text-gray-600">
            <ul className="list-inside list-disc space-y-0.5">
              {order.stateHistory.map((h, i) => (
                <li key={i}>
                  {h.from || '—'} → {h.to} ({new Date(h.timestamp).toLocaleString()})
                </li>
              ))}
            </ul>
          </dd>
        </div>
      )}

      {tasks.length > 0 && (
        <div className="mt-6 border-t border-gray-200 pt-4">
          <h3 className="mb-2 text-sm font-medium text-gray-700">Tasks</h3>
          <ul className="space-y-2">
            {tasks.map((task) => (
              <li
                key={task.taskId}
                className="rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
              >
                <span className="font-medium">{task.taskId}</span>
                <span className="mx-2 text-gray-500">({task.taskType})</span>
                <span
                  className={`inline-flex rounded px-1.5 py-0.5 text-xs font-medium ${
                    task.status === 'COMPLETED'
                      ? 'bg-green-100 text-green-800'
                      : task.status === 'FAILED'
                      ? 'bg-red-100 text-red-800'
                      : task.status === 'RUNNING'
                      ? 'bg-blue-100 text-blue-800'
                      : task.status === 'READY'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {task.status}
                </span>
                {task.dependsOn?.length > 0 && (
                  <div className="mt-1 text-gray-500">
                    Depends on: {task.dependsOn.join(', ')}
                  </div>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-2">
            <p className="text-xs font-medium text-gray-500">Dependency flow (text)</p>
            <p className="mt-0.5 font-mono text-xs text-gray-600">
              {tasks.map((t) => t.taskId).join(' → ')}
            </p>
          </div>
        </div>
      )}

      {nextStates.length > 0 && (
        <div className="mt-6 border-t border-gray-200 pt-4">
          <h3 className="mb-2 text-sm font-medium text-gray-700">Transition status</h3>
          {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
          {nextStates.includes('FAILED') && (
            <div className="mb-3">
              <label className="mb-1 block text-xs text-gray-500">Failure reason (optional)</label>
              <input
                type="text"
                value={failReason}
                onChange={(e) => setFailReason(e.target.value)}
                placeholder="e.g. Provisioning timeout"
                className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
              />
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {nextStates.map((status) => (
              <button
                key={status}
                type="button"
                disabled={transitioning}
                onClick={() => handleTransition(status)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
                  status === 'FAILED'
                    ? 'bg-red-100 text-red-800 hover:bg-red-200'
                    : status === 'COMPLETED'
                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                    : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                }`}
              >
                {status === 'IN_PROGRESS' ? 'Start' : status === 'COMPLETED' ? 'Mark complete' : 'Mark as failed'}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <Link to="/" className="text-blue-600 hover:underline">← Back to orders</Link>
      </div>
    </div>
  );
}

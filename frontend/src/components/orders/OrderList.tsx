import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ordersApi } from '../../services/api';
import { useWebSocket } from '../../contexts/WebSocketContext';
import type { Order } from '../../types/order.types';
import { OrderStatusBadge } from '../common/StatusBadge';
import { TechnicalContext } from '../common/TechnicalContext';
import { relativeTime } from '../../utils/observability';

/** Phase label for list view (order-only, no tasks) */
function listPhaseLabel(order: Order): string {
  if (order.status === 'CREATED') return 'Created';
  if (order.status === 'FAILED') return 'Failed';
  if (order.status === 'COMPLETED') return 'Completion';
  return 'In progress';
}

export function OrderList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { orderUpdateTrigger } = useWebSocket();

  useEffect(() => {
    let cancelled = false;
    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await ordersApi.list();
        if (!cancelled) setOrders(data);
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load orders');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchOrders();
    return () => { cancelled = true; };
  }, [orderUpdateTrigger]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-gray-500">Loading orders...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-700">
        <p>{error}</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold text-gray-900">Orders</h1>
        <p className="text-sm text-gray-500">Execution-aware overview. No orders yet.</p>
        <TechnicalContext title="Data source / backend behavior" defaultOpen={true}>
          List is loaded via <code>GET /api/orders</code>. Data is stored in MongoDB. Socket.io <code>order:updated</code> triggers refetch.
        </TechnicalContext>
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
          <p>Create an order, then open it and click Start to run orchestration (task generation → queue → worker).</p>
          <Link to="/create" className="mt-2 inline-block text-blue-600 hover:underline">
            Create order
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Orders</h1>
        <p className="text-sm text-gray-500 mt-0.5">Current state, phase, and timing for all orders. Scan execution at a glance.</p>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Order ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Customer</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Current phase</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Progress / timing</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {orders.map((order) => {
              const isLive = order.status === 'IN_PROGRESS';
              const timing =
                order.status === 'COMPLETED' && order.completedAt
                  ? `Completed ${relativeTime(order.completedAt)}`
                  : order.status === 'FAILED' && order.failedAt
                  ? `Failed ${relativeTime(order.failedAt)}`
                  : `Created ${relativeTime(order.createdAt)}`;
              return (
                <tr
                  key={order._id || order.orderId}
                  className={isLive ? 'bg-blue-50/50 hover:bg-blue-50/70' : 'hover:bg-gray-50'}
                >
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center gap-2">
                      {isLive && (
                        <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" title="Live" aria-hidden />
                      )}
                      <span className="text-sm font-medium text-gray-900">{order.orderId}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{order.orderType}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {order.customerName || order.customerId}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                    {listPhaseLabel(order)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {order.status === 'IN_PROGRESS' ? (
                      <span className="inline-flex items-center gap-1">
                        <span className="h-1.5 w-16 rounded-full bg-gray-200 overflow-hidden">
                          <span className="block h-full w-2/3 rounded-full bg-blue-400 animate-pulse" />
                        </span>
                        <span className="text-xs">Running</span>
                      </span>
                    ) : (
                      timing
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                    <Link
                      to={`/orders/${order._id}`}
                      className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      View execution
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <TechnicalContext title="Data source / backend behavior">
        <p className="mb-2">Data from <code>GET /api/orders</code>. Stored in MongoDB. Socket.io <code>order:updated</code> triggers refetch so this list stays in sync without refresh.</p>
        <p className="mb-2"><strong>Status (state machine):</strong> CREATED = saved, not started. IN_PROGRESS = started; backend generated tasks and BullMQ worker is (or will) run them. COMPLETED = all tasks finished; set automatically. FAILED = task exhausted retries; backend set and stored failure reason.</p>
        <p>Use <strong>View execution</strong> for per-order phase, tasks, retries, and timestamps. Use <strong>Flow</strong> for the full pipeline diagram.</p>
      </TechnicalContext>
    </div>
  );
}

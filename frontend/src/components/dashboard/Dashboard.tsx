import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ordersApi } from '../../services/api';
import { tasksApi } from '../../services/api';
import { useWebSocket } from '../../contexts/WebSocketContext';
import type { Order } from '../../types/order.types';
import type { Task } from '../../types/task.types';
import { OrderStatusBadge } from '../common/StatusBadge';
import { TaskStatusBadge } from '../common/StatusBadge';
import { TechnicalContext } from '../common/TechnicalContext';

export function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { orderUpdateTrigger, taskUpdateTrigger, connected } = useWebSocket();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [orderData, taskData] = await Promise.all([
          ordersApi.list(),
          tasksApi.list(),
        ]);
        if (!cancelled) {
          setOrders(orderData);
          setTasks(taskData);
        }
      } catch {
        if (!cancelled) setOrders([]);
        if (!cancelled) setTasks([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [orderUpdateTrigger, taskUpdateTrigger]);

  const ordersRunning = orders.filter((o) => o.status === 'IN_PROGRESS');
  const tasksRunning = tasks.filter((t) => t.status === 'RUNNING');
  const failedOrders = orders.filter((o) => o.status === 'FAILED');
  const failedTasks = tasks.filter((t) => t.status === 'FAILED');
  const tasksWithRetries = tasks.filter((t) => t.retryCount > 0);
  const totalOrders = orders.length;
  const completedOrders = orders.filter((o) => o.status === 'COMPLETED').length;
  const completionRate = totalOrders ? Math.round((completedOrders / totalOrders) * 100) : 0;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-gray-500">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">What is happening in the system right now?</p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium ${
            connected ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {connected && <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" aria-hidden />}
          {connected ? 'LIVE' : 'Disconnected'}
        </span>
      </div>

      {/* Operational metrics: primary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Orders running now</p>
          <p className="mt-1 text-2xl font-bold text-blue-900">{ordersRunning.length}</p>
          <p className="mt-0.5 text-xs text-blue-600">IN_PROGRESS</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Tasks running</p>
          <p className="mt-1 text-2xl font-bold text-blue-900">{tasksRunning.length}</p>
          <p className="mt-0.5 text-xs text-blue-600">Worker executing</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-red-700">Failed orders</p>
          <p className="mt-1 text-2xl font-bold text-red-900">{failedOrders.length}</p>
          <p className="mt-0.5 text-xs text-red-600">Require attention</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Retry activity</p>
          <p className="mt-1 text-2xl font-bold text-amber-900">{tasksWithRetries.length}</p>
          <p className="mt-0.5 text-xs text-amber-600">Tasks that had ≥1 retry</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active executions */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-4 py-3">
            <h2 className="font-semibold text-gray-900">Active executions</h2>
            <p className="text-xs text-gray-500 mt-0.5">Orders currently IN_PROGRESS</p>
          </div>
          <div className="p-4">
            {ordersRunning.length === 0 ? (
              <p className="text-sm text-gray-500">No orders running.</p>
            ) : (
              <ul className="space-y-2">
                {ordersRunning.map((order) => (
                  <li key={order._id || order.orderId}>
                    <Link
                      to={`/orders/${order._id}`}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-blue-50/30 px-3 py-2 text-sm hover:bg-blue-50/50"
                    >
                      <span className="flex items-center gap-2 font-medium text-gray-900">
                        <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" aria-hidden />
                        {order.orderId}
                      </span>
                      <OrderStatusBadge status={order.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Recent failures */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-4 py-3">
            <h2 className="font-semibold text-gray-900">Recent failures</h2>
            <p className="text-xs text-gray-500 mt-0.5">Failed orders with reason; link to detail</p>
          </div>
          <div className="p-4">
            {failedOrders.length === 0 ? (
              <p className="text-sm text-gray-500">No failed orders.</p>
            ) : (
              <ul className="space-y-2">
                {failedOrders.slice(0, 8).map((order) => (
                  <li key={order._id || order.orderId}>
                    <Link
                      to={`/orders/${order._id}`}
                      className="block rounded-lg border border-red-100 bg-red-50/30 px-3 py-2 text-sm hover:bg-red-50/50"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-gray-900">{order.orderId}</span>
                        <OrderStatusBadge status={order.status} />
                      </div>
                      {order.failureReason && (
                        <p className="mt-1 text-xs text-red-700 line-clamp-2">{order.failureReason}</p>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Secondary: totals and breakdowns */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-medium text-gray-500">Total orders</p>
          <p className="mt-1 text-xl font-semibold text-gray-900">{totalOrders}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-medium text-gray-500">Completion rate</p>
          <p className="mt-1 text-xl font-semibold text-gray-900">{completionRate}%</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-medium text-gray-500">Total tasks</p>
          <p className="mt-1 text-xl font-semibold text-gray-900">{tasks.length}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-medium text-gray-500">Failed tasks</p>
          <p className="mt-1 text-xl font-semibold text-red-600">{failedTasks.length}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-4 py-3">
            <h2 className="font-medium text-gray-900">Order status breakdown</h2>
          </div>
          <div className="flex flex-wrap gap-2 p-4">
            {(['CREATED', 'IN_PROGRESS', 'COMPLETED', 'FAILED'] as const).map((status) => (
              <span key={status} className="flex items-center gap-1.5 text-sm">
                <OrderStatusBadge status={status} />
                <span className="text-gray-600">{orders.filter((o) => o.status === status).length}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-4 py-3">
            <h2 className="font-medium text-gray-900">Task status breakdown</h2>
          </div>
          <div className="flex flex-wrap gap-2 p-4">
            {(['PENDING', 'READY', 'RUNNING', 'COMPLETED', 'FAILED'] as const).map((status) => (
              <span key={status} className="flex items-center gap-1.5 text-sm">
                <TaskStatusBadge status={status} />
                <span className="text-gray-600">{tasks.filter((t) => t.status === status).length}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-4 py-3">
            <h2 className="font-medium text-gray-900">Recent orders</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Order ID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Type</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {orders.slice(0, 10).map((order) => (
                  <tr key={order._id || order.orderId} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-900">{order.orderId}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-600">{order.orderType}</td>
                    <td className="whitespace-nowrap px-4 py-2">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-right text-sm">
                      <Link to={`/orders/${order._id}`} className="text-blue-600 hover:underline">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-4 py-3">
            <h2 className="font-medium text-gray-900">Recent tasks</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Task ID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Order ID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Type</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {tasks.slice(0, 15).map((task) => (
                  <tr key={task.taskId} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-2 font-mono text-sm text-gray-900">{task.taskId}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-600">{task.orderId}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-600">{task.taskType}</td>
                    <td className="whitespace-nowrap px-4 py-2">
                      <TaskStatusBadge status={task.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <TechnicalContext title="Technical context — data source and aggregation">
        <p className="mb-2">Data from <code>GET /api/orders</code> and <code>GET /api/tasks</code>. Socket.io <code>order:updated</code> and <code>task:updated</code> trigger refetch so metrics update in real time.</p>
        <p className="mb-2">Counts are derived from MongoDB (orders and tasks). Completion rate = COMPLETED orders / total. Failed orders = backend set to FAILED (e.g. task retries exhausted). Retry activity = tasks with retryCount &gt; 0.</p>
      </TechnicalContext>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ordersApi } from '../../services/api';
import { tasksApi } from '../../services/api';
import { useWebSocket } from '../../contexts/WebSocketContext';
import type { Order } from '../../types/order.types';
import type { Task } from '../../types/task.types';

const orderStatusColors: Record<string, string> = {
  CREATED: 'bg-gray-100 text-gray-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
};

const taskStatusColors: Record<string, string> = {
  PENDING: 'bg-gray-200 text-gray-700',
  READY: 'bg-amber-100 text-amber-800',
  RUNNING: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
};

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

  const orderCounts = orders.reduce(
    (acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const taskCounts = tasks.reduce(
    (acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const completedOrders = orderCounts['COMPLETED'] || 0;
  const totalOrders = orders.length;
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
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <span
          className={`rounded-full px-3 py-1 text-sm ${
            connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {connected ? 'Live' : 'Disconnected'}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
          <p className="text-sm font-medium text-gray-500">Orders</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{totalOrders}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
          <p className="text-sm font-medium text-gray-500">Completion rate</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{completionRate}%</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
          <p className="text-sm font-medium text-gray-500">Tasks</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{tasks.length}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
          <p className="text-sm font-medium text-gray-500">Failed orders</p>
          <p className="mt-1 text-2xl font-semibold text-red-600">{orderCounts['FAILED'] || 0}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white shadow">
          <div className="border-b border-gray-200 px-4 py-3">
            <h2 className="font-medium text-gray-900">Order status</h2>
          </div>
          <div className="flex flex-wrap gap-3 p-4">
            {(['CREATED', 'IN_PROGRESS', 'COMPLETED', 'FAILED'] as const).map((status) => (
              <span
                key={status}
                className={`rounded-full px-3 py-1 text-sm ${orderStatusColors[status] || 'bg-gray-100'}`}
              >
                {status}: {orderCounts[status] || 0}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white shadow">
          <div className="border-b border-gray-200 px-4 py-3">
            <h2 className="font-medium text-gray-900">Task status</h2>
          </div>
          <div className="flex flex-wrap gap-3 p-4">
            {(['PENDING', 'READY', 'RUNNING', 'COMPLETED', 'FAILED'] as const).map((status) => (
              <span
                key={status}
                className={`rounded-full px-3 py-1 text-sm ${taskStatusColors[status] || 'bg-gray-100'}`}
              >
                {status}: {taskCounts[status] || 0}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow">
        <div className="border-b border-gray-200 px-4 py-3">
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
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${orderStatusColors[order.status] || 'bg-gray-100'}`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-right text-sm">
                    <Link to={`/orders/${order._id}`} className="text-blue-600 hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow">
        <div className="border-b border-gray-200 px-4 py-3">
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
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${taskStatusColors[task.status] || 'bg-gray-100'}`}
                    >
                      {task.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

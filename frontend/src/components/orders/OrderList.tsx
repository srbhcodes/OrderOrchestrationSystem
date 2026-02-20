import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ordersApi } from '../../services/api';
import { useWebSocket } from '../../contexts/WebSocketContext';
import type { Order } from '../../types/order.types';

const statusColors: Record<string, string> = {
  CREATED: 'bg-gray-100 text-gray-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
};

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
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
        <p>No orders yet.</p>
        <Link to="/create" className="mt-2 inline-block text-blue-600 hover:underline">
          Create your first order
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Order ID</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Type</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Customer</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Created</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {orders.map((order) => (
            <tr key={order._id || order.orderId} className="hover:bg-gray-50">
              <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">{order.orderId}</td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{order.orderType}</td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                {order.customerName || order.customerId}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusColors[order.status] || 'bg-gray-100'}`}>
                  {order.status}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                {new Date(order.createdAt).toLocaleString()}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                <Link to={`/orders/${order._id}`} className="text-blue-600 hover:underline">
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

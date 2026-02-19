import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ordersApi } from '../../services/api';
import type { OrderType } from '../../types/order.types';

export function CreateOrderForm() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    orderType: 'INSTALL' as OrderType,
    customerId: '',
    customerName: '',
    serviceType: 'Internet',
    speed: '100Mbps',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await ordersApi.create({
        orderType: form.orderType,
        customerId: form.customerId.trim(),
        customerName: form.customerName.trim() || undefined,
        services: [{ type: form.serviceType, speed: form.speed }],
      });
      navigate('/');
    } catch (e: any) {
      setError(e.response?.data?.message || e.message || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow">
      <h2 className="mb-4 text-xl font-semibold text-gray-900">Create Order</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Order Type</label>
          <select
            value={form.orderType}
            onChange={(e) => setForm({ ...form, orderType: e.target.value as OrderType })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="INSTALL">Install</option>
            <option value="CHANGE">Change</option>
            <option value="DISCONNECT">Disconnect</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Customer ID *</label>
          <input
            type="text"
            required
            value={form.customerId}
            onChange={(e) => setForm({ ...form, customerId: e.target.value })}
            placeholder="e.g. CUST-001"
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Customer Name</label>
          <input
            type="text"
            value={form.customerName}
            onChange={(e) => setForm({ ...form, customerName: e.target.value })}
            placeholder="Optional"
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Service Type</label>
          <input
            type="text"
            value={form.serviceType}
            onChange={(e) => setForm({ ...form, serviceType: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Speed</label>
          <input
            type="text"
            value={form.speed}
            onChange={(e) => setForm({ ...form, speed: e.target.value })}
            placeholder="e.g. 100Mbps"
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Order'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

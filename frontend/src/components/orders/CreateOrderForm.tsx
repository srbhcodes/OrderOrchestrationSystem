import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ordersApi } from '../../services/api';
import type { OrderType } from '../../types/order.types';
import { TechnicalContext } from '../common/TechnicalContext';

const ORDER_TYPE_PIPELINES: Record<OrderType, string[]> = {
  INSTALL: ['VALIDATE', 'PROVISION', 'BILLING'],
  CHANGE: ['VALIDATE', 'BILLING'],
  DISCONNECT: ['VALIDATE', 'BILLING'],
};

function TaskPipelineVisual({ steps }: { steps: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2">
      {steps.map((step, i) => (
        <span key={step} className="flex items-center gap-1">
          <span className="rounded border border-gray-300 bg-white px-2 py-0.5 text-xs font-medium text-gray-700">
            {step}
          </span>
          {i < steps.length - 1 && <span className="text-gray-400 text-xs">→</span>}
        </span>
      ))}
    </div>
  );
}

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
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Create order</h1>
        <p className="text-sm text-gray-500 mt-0.5">Primary action: create order. Then open it and click Start to run orchestration.</p>
      </div>

      {/* Lifecycle after creation */}
      <div className="rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Lifecycle after creation</p>
        <p className="mt-1 text-sm text-gray-700">
          Order created → <strong>Start required</strong> (on order detail) → Tasks generated (by type) → Queue execution begins → Worker runs tasks.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Order type</label>
            <p className="mb-2 text-xs text-gray-500">Determines the task pipeline when you click Start.</p>
            <select
              value={form.orderType}
              onChange={(e) => setForm({ ...form, orderType: e.target.value as OrderType })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="INSTALL">INSTALL</option>
              <option value="CHANGE">CHANGE</option>
              <option value="DISCONNECT">DISCONNECT</option>
            </select>
            <div className="mt-2">
              <p className="text-xs font-medium text-gray-500 mb-1">Task pipeline for this type</p>
              <TaskPipelineVisual steps={ORDER_TYPE_PIPELINES[form.orderType]} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Customer ID *</label>
            <input
              type="text"
              required
              value={form.customerId}
              onChange={(e) => setForm({ ...form, customerId: e.target.value })}
              placeholder="e.g. CUST-001"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Customer name</label>
            <input
              type="text"
              value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })}
              placeholder="Optional"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Service type</label>
            <input
              type="text"
              value={form.serviceType}
              onChange={(e) => setForm({ ...form, serviceType: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Speed</label>
            <input
              type="text"
              value={form.speed}
              onChange={(e) => setForm({ ...form, speed: e.target.value })}
              placeholder="e.g. 100Mbps"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create order'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      <TechnicalContext title="Technical context — backend orchestration">
        <p className="mb-2">Submit sends <code>POST /api/orders</code>. Backend creates order in MongoDB with status CREATED and initial state history. No tasks yet.</p>
        <p className="mb-2">When you open the order and click <strong>Start</strong>, backend runs: state transition CREATED → IN_PROGRESS, task blueprint generator (by order type), dependency resolution (topological sort), persist tasks, enqueue READY tasks to BullMQ. Worker then processes jobs from Redis.</p>
      </TechnicalContext>
    </div>
  );
}

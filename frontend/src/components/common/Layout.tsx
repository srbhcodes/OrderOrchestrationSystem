import { Link, Outlet } from 'react-router-dom';
import { useWebSocket } from '../../contexts/WebSocketContext';

export function Layout() {
  const { connected } = useWebSocket();
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <Link to="/" className="text-lg font-semibold text-gray-900">
              Telecom Order Orchestration
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/" className="text-gray-600 hover:text-gray-900">Orders</Link>
              <Link to="/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</Link>
              <Link to="/create" className="text-gray-600 hover:text-gray-900">Create Order</Link>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${connected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                title={connected ? 'Live updates' : 'Disconnected'}
              >
                {connected ? '● Live' : '○ Off'}
              </span>
            </div>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}

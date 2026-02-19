import { Link, Outlet } from 'react-router-dom';

export function Layout() {
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <Link to="/" className="text-lg font-semibold text-gray-900">
              Telecom Order Orchestration
            </Link>
            <div className="flex gap-4">
              <Link to="/" className="text-gray-600 hover:text-gray-900">Orders</Link>
              <Link to="/create" className="text-gray-600 hover:text-gray-900">Create Order</Link>
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

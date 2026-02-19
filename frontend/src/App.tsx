import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/common/Layout';
import { OrderList } from './components/orders/OrderList';
import { CreateOrderForm } from './components/orders/CreateOrderForm';
import { OrderDetail } from './components/orders/OrderDetail';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<OrderList />} />
        <Route path="create" element={<CreateOrderForm />} />
        <Route path="orders/:id" element={<OrderDetail />} />
      </Route>
    </Routes>
  );
}

export default App;

import { Router } from 'express';
import { orderController } from '../controllers/orderController';
import { taskController } from '../controllers/taskController';

const router = Router();

router.post('/', orderController.create);
router.get('/', orderController.list);
router.get('/orderId/:orderId', orderController.getByOrderId);
router.patch('/:id/status', orderController.updateStatus);
router.get('/:id/tasks', taskController.listByOrderMongoId);
router.get('/:id', orderController.getById);

export default router;

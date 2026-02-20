import { Router } from 'express';
import { taskController } from '../controllers/taskController';

const router = Router();

router.get('/', taskController.list);

export default router;

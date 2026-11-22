import { Router } from 'express';
import { isAuthenticated } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import compensationController from '../controllers/compensation.controller';

const router = Router();

router.get('/employee/:employeeId', isAuthenticated, authorize('read_Employee'), compensationController.listForEmployee);
router.post('/', isAuthenticated, authorize('update_Employee'), compensationController.addCompensation);

export default router;

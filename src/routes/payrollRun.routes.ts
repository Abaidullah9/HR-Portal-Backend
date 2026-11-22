import { Router } from 'express';
import { isAuthenticated } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import payrollRunController from '../controllers/payrollRun.controller';

const router = Router();

router.get('/', isAuthenticated, authorize('read_Payroll'), payrollRunController.listRuns);
router.post('/', isAuthenticated, authorize('create_Payroll'), payrollRunController.generateRun);
router.get('/:_id/export.csv', isAuthenticated, authorize('read_Payroll'), payrollRunController.exportRun);
router.get('/:_id', isAuthenticated, authorize('read_Payroll'), payrollRunController.getRun);
router.patch('/:_id/approve', isAuthenticated, authorize('update_PayrollStatus'), payrollRunController.approveRun);
router.patch('/:_id/pay', isAuthenticated, authorize('update_PayrollStatus'), payrollRunController.markPaid);
router.patch('/:_id/reverse', isAuthenticated, authorize('update_PayrollStatus'), payrollRunController.reverseRun);

export default router;

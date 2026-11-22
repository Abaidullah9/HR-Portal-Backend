import { Router } from 'express';
import { isAuthenticated } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import checklistController from '../controllers/checklist.controller';

const router = Router();

router.get('/templates', isAuthenticated, authorize('read_Employee'), checklistController.listTemplates);
router.post('/templates', isAuthenticated, authorize('update_OrganizationSetting'), checklistController.addTemplate);
router.get('/employee/:employeeId', isAuthenticated, authorize('read_Employee'), checklistController.listForEmployee);
router.post('/employee/:employeeId', isAuthenticated, authorize('create_Employee'), checklistController.addTask);
router.post('/employee/:employeeId/start', isAuthenticated, authorize('create_Employee'), checklistController.startChecklist);
router.patch('/:_id', isAuthenticated, authorize('update_Employee'), checklistController.completeTask);

export default router;

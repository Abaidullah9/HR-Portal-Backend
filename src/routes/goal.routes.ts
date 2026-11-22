import { Router } from 'express';
import { isAuthenticated } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import goalController from '../controllers/goal.controller';

const router = Router();

// Employees hold no read_Appraisal, but they own their goals: the controller
// derives the employee from the session and restricts the result to them.
router.get('/', isAuthenticated, authorize('read_LeaveRequest'), goalController.listGoals);
router.post('/', isAuthenticated, authorize('update_Appraisal'), goalController.createGoal);
router.patch('/:_id/progress', isAuthenticated, authorize('read_LeaveRequest'), goalController.updateProgress);
router.delete('/:_id', isAuthenticated, authorize('update_Appraisal'), goalController.deleteGoal);

export default router;

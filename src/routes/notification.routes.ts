import { Router } from 'express';
import { isAuthenticated } from '../middlewares/auth.middleware';
import notificationController from '../controllers/notification.controller';

const router = Router();

// Every signed-in user may read and acknowledge their own notifications.
router.get('/', isAuthenticated, notificationController.list);
router.post('/read-all', isAuthenticated, notificationController.markAllRead);
router.post('/:id/read', isAuthenticated, notificationController.markRead);

export default router;

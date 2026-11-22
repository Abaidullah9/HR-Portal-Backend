import { Router } from 'express';
import { isAuthenticated } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import holidayController from '../controllers/holiday.controller';

const router = Router();

router.get('/', isAuthenticated, authorize('read_LeaveRequest'), holidayController.listHolidays);
// The calendar feeds leave day counts and attendance, so writing it is an
// organisation-settings privilege rather than a leave one.
router.post('/', isAuthenticated, authorize('update_OrganizationSetting'), holidayController.addHoliday);
router.patch('/:_id', isAuthenticated, authorize('update_OrganizationSetting'), holidayController.updateHoliday);
router.delete('/:_id', isAuthenticated, authorize('update_OrganizationSetting'), holidayController.deleteHoliday);

export default router;

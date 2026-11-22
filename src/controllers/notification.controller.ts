import { Request, Response } from 'express';
import notificationServices from '../services/notification.services';
import { sendErrorResponse } from '../utils/helper/sendError';
import { StatusCode } from '../utils/helper/constants/enum';

const list = async (req: Request, res: Response) => {
  try {
    const { items, unread } = await notificationServices.listForUser(req.userId!);
    res.status(StatusCode.OK).json({
      success: true,
      message: 'Notifications fetched',
      data: items,
      pagination: { total: items.length, unread },
    });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const markRead = async (req: Request, res: Response) => {
  try {
    const data = await notificationServices.markRead(req.userId!, req.params.id as string);
    res.status(StatusCode.OK).json({ success: true, message: 'Notification marked read', data });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const markAllRead = async (req: Request, res: Response) => {
  try {
    await notificationServices.markAllRead(req.userId!);
    res.status(StatusCode.OK).json({ success: true, message: 'Notifications marked read' });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

export default { list, markRead, markAllRead };

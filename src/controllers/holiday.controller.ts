import { Request, Response } from 'express';
import { sendErrorResponse } from '../utils/helper/sendError';
import holidayServices from '../services/holiday.services';
import { StatusCode } from '../utils/helper/constants/enum';

const listHolidays = async (req: Request, res: Response) => {
  try {
    const year = req.query.year ? Number(req.query.year) : undefined;
    const data = await holidayServices.listHolidays(Number.isFinite(year) ? year : undefined);
    res.status(StatusCode.OK).json({ success: true, message: 'Holidays fetched', data });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const addHoliday = async (req: Request, res: Response) => {
  try {
    const data = await holidayServices.addHoliday(req.body);
    res.status(StatusCode.CREATED).json({ success: true, message: 'Holiday added', data });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const updateHoliday = async (req: Request, res: Response) => {
  try {
    const data = await holidayServices.updateHoliday(req.params._id as string, req.body);
    res.status(StatusCode.OK).json({ success: true, message: 'Holiday updated', data });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const deleteHoliday = async (req: Request, res: Response) => {
  try {
    await holidayServices.deleteHoliday(req.params._id as string);
    res.status(StatusCode.OK).json({ success: true, message: 'Holiday removed' });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

export default { listHolidays, addHoliday, updateHoliday, deleteHoliday };

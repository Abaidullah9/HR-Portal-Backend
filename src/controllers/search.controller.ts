import { Request, Response } from 'express';
import { sendErrorResponse } from '../utils/helper/sendError';
import searchServices from '../services/search.services';
import { resolveReadScope } from '../utils/helper/ownership';
import { StatusCode } from '../utils/helper/constants/enum';

const search = async (req: Request, res: Response) => {
  try {
    const query = typeof req.query.q === 'string' ? req.query.q : '';
    const scope = await resolveReadScope(req.userId!);
    const data = await searchServices.globalSearch(query, scope);
    res.status(StatusCode.OK).json({ success: true, message: 'Search results', data });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

export default { search };

import { Request, Response } from "express";
import catchAsync from "../utils/helper/catchAsync";
import documentServices from "../services/document.services";
import { MESSAGES } from "../utils/helper/constants/messages";
import { StatusCode } from "../utils/helper/constants/enum";

const addDocument = catchAsync(async (req: Request, res: Response) => {
  const result = await documentServices.addDocument(req.body);
  res.status(StatusCode.CREATED).json({ success: true, message: MESSAGES.DOCUMENT_ADDED_SUCCESSFULLY, data: result });
});

const getDocumentById = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  const result = await documentServices.getDocumentById(_id as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.DOCUMENT_FETCHED_SUCCESSFULLY, data: result });
});

const getDocumentByEmployee = catchAsync(async (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const result = await documentServices.getDocumentsByEmployee(employeeId as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.DOCUMENT_FETCHED_SUCCESSFULLY, data: result });
});

const getDocumentByType = catchAsync(async (req: Request, res: Response) => {
  const { employeeId, type } = req.params;
  const result = await documentServices.getDocumentsByType(employeeId as string, type as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.DOCUMENT_FETCHED_SUCCESSFULLY, data: result });
});

const updateDocument = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  const result = await documentServices.updateDocument(_id as string, req.body);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.DOCUMENT_UPDATED_SUCCESSFULLY, data: result });
});

const deleteDocument = catchAsync(async (req: Request, res: Response) => {
  const { _id } = req.params;
  await documentServices.deleteDocument(_id as string);
  res.status(StatusCode.OK).json({ success: true, message: MESSAGES.DOCUMENT_DELETED_SUCCESSFULLY, data: null });
});

export default {
  addDocument,
  getDocumentById,
  getDocumentByEmployee,
  getDocumentByType,
  updateDocument,
  deleteDocument,
};

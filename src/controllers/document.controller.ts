import { Request, Response } from "express";
import { sendErrorResponse } from "../utils/helper/sendError";
import fs from "fs";
import path from "path";
import documentServices from "../services/document.services";
import { MESSAGES } from "../utils/helper/constants/messages";
import { StatusCode } from "../utils/helper/constants/enum";
import { AppError } from "../utils/helper/AppError";
import { CreateDocumentDTO, UpdateDocumentDTO } from "../utils/dtos/document.dto";
import { PaginationQuery } from "../utils/common";
import { resolveReadScope } from "../utils/helper/ownership";

const addDocument = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      throw new AppError(MESSAGES.FILE_REQUIRED, StatusCode.BAD_REQUEST);
    }
  
    const documentData: CreateDocumentDTO = {
      ...req.body,
      fileUrl: `/uploads/${req.file.filename}`,
      uploadedBy: req.userId,
    };
    const newDocument = await documentServices.addDocument(documentData);
    if (!newDocument) throw new AppError(MESSAGES.FAILED_TO_CREATE_DOCUMENT, StatusCode.INTERNAL_SERVER_ERROR);
    res.status(StatusCode.CREATED).json({ success: true, message: MESSAGES.DOCUMENT_ADDED_SUCCESSFULLY, data: newDocument });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getAllDocument = async (req: Request, res: Response) => {
  try {
    const scope = await resolveReadScope(req.userId!);
    const { data, pagination } = await documentServices.getAllDocument(req.query as PaginationQuery, scope);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.ALL_DOCUMENTS_FETCHED_SUCCESSFULLY, data, pagination });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getDocumentById = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const scope = await resolveReadScope(req.userId!);
    const result = await documentServices.getDocumentById(_id as string, scope);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.DOCUMENT_FETCHED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getDocumentByEmployee = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const scope = await resolveReadScope(req.userId!);
    const result = await documentServices.getDocumentsByEmployee(employeeId as string, scope);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.DOCUMENT_FETCHED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const getDocumentByType = async (req: Request, res: Response) => {
  try {
    const { employeeId, type } = req.params;
    const scope = await resolveReadScope(req.userId!);
    const result = await documentServices.getDocumentsByType(employeeId as string, type as string, scope);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.DOCUMENT_FETCHED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const updateDocument = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const updateData: UpdateDocumentDTO = req.body;
    const scope = await resolveReadScope(req.userId!);
    const result = await documentServices.updateDocument(_id as string, updateData, scope);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.DOCUMENT_UPDATED_SUCCESSFULLY, data: result });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const deleteDocument = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const scope = await resolveReadScope(req.userId!);
  
    // Get document to find the file path before deleting the record
    const doc = await documentServices.getDocumentById(_id as string, scope);
    if (!doc) throw new AppError(MESSAGES.DOCUMENT_NOT_FOUND, StatusCode.NOT_FOUND);
  
    // Delete file from disk
    if (doc.fileUrl) {
      const filePath = path.join(process.cwd(), doc.fileUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  
    const deletedDocument = await documentServices.deleteDocument(_id as string, scope);
    if (!deletedDocument) throw new AppError(MESSAGES.DOCUMENT_NOT_FOUND, StatusCode.NOT_FOUND);
    res.status(StatusCode.OK).json({ success: true, message: MESSAGES.DOCUMENT_DELETED_SUCCESSFULLY, data: deletedDocument });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

export default {
  addDocument,
  getAllDocument,
  getDocumentById,
  getDocumentByEmployee,
  getDocumentByType,
  updateDocument,
  deleteDocument,
};

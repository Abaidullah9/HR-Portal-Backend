import { Request, Response } from 'express';
import crypto from 'crypto';
import { sendErrorResponse } from '../utils/helper/sendError';
import path from 'path';
import documentServices from '../services/document.services';
import { MESSAGES } from '../utils/helper/constants/messages';
import { StatusCode } from '../utils/helper/constants/enum';
import { AppError } from '../utils/helper/AppError';
import { CreateDocumentDTO, UpdateDocumentDTO } from '../utils/dtos/document.dto';
import { PaginationQuery } from '../utils/common';
import { resolveReadScope } from '../utils/helper/ownership';
import { removeStoredFile, resolveStoredFile, saveBuffer, signedDownloadUrl } from '../utils/storage';

const addDocument = async (req: Request, res: Response) => {
  let storedKey: string | null = null;
  try {
    if (!req.file) {
      throw new AppError(MESSAGES.FILE_REQUIRED, StatusCode.BAD_REQUEST);
    }

    const retentionDays = Number(process.env.DOCUMENT_RETENTION_DAYS || 0);
    const extension = path.extname(req.file.originalname).toLowerCase();
    const key = await saveBuffer(`${crypto.randomUUID()}${extension}`, req.file.buffer);
    storedKey = key;
    const documentData: CreateDocumentDTO = {
      ...req.body,
      fileUrl: key,
      storageKey: key,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedBy: req.userId,
    };
    const newDocument = await documentServices.addDocument(documentData);

    // The record is the only addressable handle; its file is downloaded through
    // this route, never from a public directory.
    newDocument.fileUrl = `/api/v1/documents/${newDocument._id}/file`;
    if (retentionDays > 0) {
      newDocument.retentionUntil = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000);
    }
    await newDocument.save();

    res.status(StatusCode.CREATED).json({ success: true, message: MESSAGES.DOCUMENT_ADDED_SUCCESSFULLY, data: newDocument });
  } catch (error) {
    // A rejected upload must not leave an orphan object in storage.
    if (storedKey) await removeStoredFile(storedKey);
    sendErrorResponse(res, error);
  }
};

const getAllDocument = async (req: Request, res: Response) => {
  try {
    const scope = await resolveReadScope(req.userId!);
    const { data, pagination } = await documentServices.getAllDocument(
      req.query as PaginationQuery & { employeeId?: string },
      scope,
    );
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

/** Authenticated, scoped file download. */
const downloadDocument = async (req: Request, res: Response) => {
  try {
    const { _id } = req.params;
    const scope = await resolveReadScope(req.userId!);
    const document = await documentServices.getDocumentForDownload(_id as string, scope);

    const key = document.storageKey || path.basename(document.fileUrl || '');
    if (!key) {
      throw new AppError('The stored file for this document is missing', StatusCode.NOT_FOUND);
    }

    // Object storage hands out a short-lived signed URL after the permission
    // check above, so the file is never public. Local storage streams instead.
    const signed = await signedDownloadUrl(key);
    if (signed) {
      res.setHeader('Cache-Control', 'private, no-store');
      res.redirect(signed);
      return;
    }

    const filePath = resolveStoredFile(key);
    if (!filePath) {
      throw new AppError('The stored file for this document is missing', StatusCode.NOT_FOUND);
    }

    const safeName = document.name.replace(/[^\w.\- ]+/g, '_') || 'document';
    res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.sendFile(filePath);
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

    const doc = await documentServices.getDocumentById(_id as string, scope);
    const key = doc.storageKey || path.basename(doc.fileUrl || '');
    if (key) await removeStoredFile(key);

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
  downloadDocument,
  getDocumentByEmployee,
  getDocumentByType,
  updateDocument,
  deleteDocument,
};

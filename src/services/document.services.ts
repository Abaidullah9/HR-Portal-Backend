import { StatusCode } from '../utils/helper/constants/enum';
import { AppError } from '../utils/helper/AppError';
import documentModel from '../models/document.model';
import { CreateDocumentDTO } from '../utils/dtos/document.dto';
import { MESSAGES } from '../utils/helper/constants/messages';
import { getPagination, paginatedResult, PaginationQuery } from '../utils/common';
import { canAccessEmployee, scopeEmployeeFilter, type ReadScope } from '../utils/helper/ownership';
import { tenantFields, tenantFilter } from '../utils/context';

const addDocument = async (documentData: CreateDocumentDTO) => {
  if (!documentData) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  return documentModel.create({ ...documentData, ...tenantFields() });
};

const getAllDocument = async (query: PaginationQuery & { employeeId?: string }, scope: ReadScope) => {
  const { page, limit, skip } = getPagination(query);
  const filter: Record<string, unknown> = tenantFilter(scopeEmployeeFilter(scope));
  if (query.employeeId && canAccessEmployee(scope, query.employeeId)) {
    filter.employeeId = query.employeeId;
  }

  const allDocuments = await documentModel
    .find(filter)
    .populate('employeeId', 'name email employeeCode')
    .populate('uploadedBy', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  const total = await documentModel.countDocuments(filter);
  return paginatedResult(allDocuments, total, page, limit);
};

const getDocumentById = async (_id: string, scope: ReadScope) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const documentById = await documentModel.findOne(tenantFilter({ _id }));
  if (!documentById) throw new AppError(MESSAGES.DOCUMENT_NOT_FOUND, StatusCode.NOT_FOUND);
  if (!canAccessEmployee(scope, documentById.employeeId.toString())) {
    throw new AppError(MESSAGES.NOT_AUTHORIZED, StatusCode.FORBIDDEN);
  }
  await documentById.populate('employeeId', 'name email employeeCode');
  await documentById.populate('uploadedBy', 'name email');
  return documentById;
};

/**
 * Resolves a document for the authenticated download route. The record is the
 * authorisation boundary; the stored file is never reachable directly.
 */
const getDocumentForDownload = async (_id: string, scope: ReadScope) => {
  const document = await getDocumentById(_id, scope);
  return document;
};

const getDocumentsByEmployee = async (employeeId: string, scope: ReadScope) => {
  if (!employeeId) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);
  if (!canAccessEmployee(scope, employeeId)) {
    throw new AppError(MESSAGES.NOT_AUTHORIZED, StatusCode.FORBIDDEN);
  }

  return documentModel
    .find(tenantFilter({ employeeId }))
    .populate('employeeId', 'name email employeeCode')
    .populate('uploadedBy', 'name email')
    .sort({ createdAt: -1 });
};

const getDocumentsByType = async (employeeId: string, type: string, scope: ReadScope) => {
  if (!employeeId || !type) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);
  if (!canAccessEmployee(scope, employeeId)) {
    throw new AppError(MESSAGES.NOT_AUTHORIZED, StatusCode.FORBIDDEN);
  }

  return documentModel
    .find(tenantFilter({ employeeId, type }))
    .populate('employeeId', 'name email employeeCode')
    .populate('uploadedBy', 'name email');
};

const updateDocument = async (_id: string, updateData: Partial<CreateDocumentDTO>, scope: ReadScope) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const existingDocument = await documentModel.findOne(tenantFilter({ _id }));
  if (!existingDocument) throw new AppError(MESSAGES.DOCUMENT_NOT_FOUND, StatusCode.NOT_FOUND);
  if (!canAccessEmployee(scope, existingDocument.employeeId.toString())) {
    throw new AppError(MESSAGES.NOT_AUTHORIZED, StatusCode.FORBIDDEN);
  }

  const updatedDocument = await documentModel
    .findOneAndUpdate(tenantFilter({ _id }), updateData, { returnDocument: 'after' })
    .populate('employeeId', 'name email employeeCode')
    .populate('uploadedBy', 'name email');
  if (!updatedDocument) throw new AppError(MESSAGES.DOCUMENT_NOT_FOUND, StatusCode.NOT_FOUND);

  return updatedDocument;
};

const deleteDocument = async (_id: string, scope: ReadScope) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const existingDocument = await documentModel.findOne(tenantFilter({ _id }));
  if (!existingDocument) throw new AppError(MESSAGES.DOCUMENT_NOT_FOUND, StatusCode.NOT_FOUND);
  if (!canAccessEmployee(scope, existingDocument.employeeId.toString())) {
    throw new AppError(MESSAGES.NOT_AUTHORIZED, StatusCode.FORBIDDEN);
  }

  return documentModel.findOneAndDelete(tenantFilter({ _id }));
};

/** Retention: documents past their retention date are removed by the scheduler. */
const expiredDocuments = async (now: Date = new Date()) =>
  documentModel.find({ retentionUntil: { $lte: now } }).select('_id storageKey fileUrl');

export default {
  addDocument,
  getAllDocument,
  getDocumentById,
  getDocumentForDownload,
  getDocumentsByEmployee,
  getDocumentsByType,
  updateDocument,
  deleteDocument,
  expiredDocuments,
};

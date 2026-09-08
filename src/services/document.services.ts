import { StatusCode } from "../utils/helper/constants/enum";
import { AppError } from "../utils/helper/AppError";
import documentModel from "../models/document.model";
import { CreateDocumentDTO } from "../utils/dtos/document.dto";
import { MESSAGES } from "../utils/helper/constants/messages";
import { getPagination, paginatedResult, PaginationQuery } from "../utils/common";
import { ReadScope } from "../utils/helper/ownership";

const addDocument = async (documentData: CreateDocumentDTO) => {
  if (!documentData) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const newDocument = await documentModel.create(documentData);
  return newDocument;
};

const getAllDocument = async (query: PaginationQuery, scope: ReadScope) => {
  const { page, limit, skip } = getPagination(query);
  const filter: Record<string, unknown> = {};
  if (!scope.canReadAll) filter.employeeId = scope.ownEmployeeId ?? null;
  const allDocuments = await documentModel.find(filter).populate("employeeId", "name email employeeCode").populate("uploadedBy", "name email").skip(skip).limit(limit);
  const total = await documentModel.countDocuments(filter);
  return paginatedResult(allDocuments, total, page, limit);
};

const getDocumentById = async (_id: string, scope: ReadScope) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const documentById = await documentModel.findById(_id);
  if (!documentById) throw new AppError(MESSAGES.DOCUMENT_NOT_FOUND, StatusCode.NOT_FOUND);
  if (!scope.canReadAll && documentById.employeeId.toString() !== scope.ownEmployeeId) {
    throw new AppError(MESSAGES.NOT_AUTHORIZED, StatusCode.FORBIDDEN);
  }
  await documentById.populate("employeeId", "name email employeeCode");
  await documentById.populate("uploadedBy", "name email");
  return documentById;
};

const getDocumentsByEmployee = async (employeeId: string, scope: ReadScope) => {
  if (!employeeId) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);
  if (!scope.canReadAll && employeeId !== scope.ownEmployeeId) {
    throw new AppError(MESSAGES.NOT_AUTHORIZED, StatusCode.FORBIDDEN);
  }

  const filter: Record<string, unknown> = { employeeId };
  const documents = await documentModel.find(filter).populate("employeeId", "name email employeeCode").populate("uploadedBy", "name email");
  if (!documents) throw new AppError(MESSAGES.DOCUMENT_NOT_FOUND, StatusCode.NOT_FOUND);
  return documents;
};

const getDocumentsByType = async (employeeId: string, type: string, scope: ReadScope) => {
  if (!employeeId || !type) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);
  if (!scope.canReadAll && employeeId !== scope.ownEmployeeId) {
    throw new AppError(MESSAGES.NOT_AUTHORIZED, StatusCode.FORBIDDEN);
  }

  const filter: Record<string, unknown> = { employeeId, type };
  const documents = await documentModel.find(filter).populate("employeeId", "name email employeeCode").populate("uploadedBy", "name email");
  if (!documents) throw new AppError(MESSAGES.DOCUMENT_NOT_FOUND, StatusCode.NOT_FOUND);
  return documents;
};

const updateDocument = async (_id: string, updateData: Partial<CreateDocumentDTO>, scope: ReadScope) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const existingDocument = await documentModel.findById(_id);
  if (!existingDocument) throw new AppError(MESSAGES.DOCUMENT_NOT_FOUND, StatusCode.NOT_FOUND);
  if (!scope.canReadAll && existingDocument.employeeId.toString() !== scope.ownEmployeeId) {
    throw new AppError(MESSAGES.NOT_AUTHORIZED, StatusCode.FORBIDDEN);
  }

  const updatedDocument = await documentModel.findByIdAndUpdate(_id, updateData, { returnDocument: 'after' }).populate("employeeId", "name email employeeCode").populate("uploadedBy", "name email");
  if (!updatedDocument) throw new AppError(MESSAGES.DOCUMENT_NOT_FOUND, StatusCode.NOT_FOUND);

  return updatedDocument;
};

const deleteDocument = async (_id: string, scope: ReadScope) => {
  if (!_id) throw new AppError(MESSAGES.MISSING_REQUIRED_FIELDS, StatusCode.BAD_REQUEST);

  const existingDocument = await documentModel.findById(_id);
  if (!existingDocument) throw new AppError(MESSAGES.DOCUMENT_NOT_FOUND, StatusCode.NOT_FOUND);
  if (!scope.canReadAll && existingDocument.employeeId.toString() !== scope.ownEmployeeId) {
    throw new AppError(MESSAGES.NOT_AUTHORIZED, StatusCode.FORBIDDEN);
  }

  const deletedDocument = await documentModel.findByIdAndDelete(_id);

  return deletedDocument;
};

export default {
  addDocument,
  getAllDocument,
  getDocumentById,
  getDocumentsByEmployee,
  getDocumentsByType,
  updateDocument,
  deleteDocument,
};

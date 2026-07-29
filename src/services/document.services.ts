import EmployeeDocument from "../models/document.model";
import { AppError, MongoFilter } from "../utils/helper/AppError";
import { CreateDocumentDTO, UpdateDocumentDTO } from "../utils/dtos/document.dto";
const addDocument = async (documentData: CreateDocumentDTO) => {
  if (!documentData.employeeId || !documentData.name || !documentData.type || !documentData.fileUrl || !documentData.uploadedBy) {
    throw new AppError("Missing required fields: employeeId, name, type, fileUrl, uploadedBy", 400);
  }

  const document = await EmployeeDocument.create(documentData);
  return document;
};

const getDocumentsByEmployee = async (employeeId: string) => {
  const queryFilter: MongoFilter = { employeeId };
  const documents = await EmployeeDocument.find(queryFilter)
    .populate("uploadedBy", "name email");
  return documents;
};

const getDocumentById = async (documentId: string) => {
  const document = await EmployeeDocument.findById(documentId)
    .populate("uploadedBy", "name email");
  if (!document) {
    throw new AppError("Document not found", 404);
  }
  return document;
};

const getDocumentsByType = async (employeeId: string, type: string) => {
  const queryFilter: MongoFilter = { employeeId, type };
  const documents = await EmployeeDocument.find(queryFilter)
    .populate("uploadedBy", "name email");
  return documents;
};

const updateDocument = async (documentId: string, updateData: UpdateDocumentDTO) => {
  const document = await EmployeeDocument.findByIdAndUpdate(documentId, updateData, { new: true, runValidators: true })
    .populate("uploadedBy", "name email");
  if (!document) {
    throw new AppError("Document not found", 404);
  }
  return document;
};

const deleteDocument = async (documentId: string) => {
  const document = await EmployeeDocument.findByIdAndDelete(documentId);
  if (!document) {
    throw new AppError("Document not found", 404);
  }
  return document;
};

export default {
  addDocument,
  getDocumentsByEmployee,
  getDocumentById,
  getDocumentsByType,
  updateDocument,
  deleteDocument,
};

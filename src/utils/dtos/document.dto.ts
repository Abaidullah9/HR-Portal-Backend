export interface CreateDocumentDTO {
  employeeId: string;
  name: string;
  type: 'resume' | 'id_proof' | 'certificate' | 'contract' | 'other';
  fileUrl: string;
  uploadedBy: string;
}

export interface UpdateDocumentDTO {
  name?: string;
  type?: 'resume' | 'id_proof' | 'certificate' | 'contract' | 'other';
  fileUrl?: string;
}

export interface CreateDocumentDTO {
  employeeId: string;
  name: string;
  type: 'resume' | 'id_proof' | 'certificate' | 'contract' | 'other';
  fileUrl: string;
  uploadedBy: string;
  /** Opaque storage key; the file is only readable through the download route. */
  storageKey?: string;
  mimeType?: string;
  size?: number;
  retentionUntil?: Date;
}

export interface UpdateDocumentDTO {
  name?: string;
  type?: 'resume' | 'id_proof' | 'certificate' | 'contract' | 'other';
  fileUrl?: string;
}

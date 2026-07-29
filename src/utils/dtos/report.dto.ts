export interface CreateReportDTO {
  reportName: string;
  category: string;
  generatedBy: string;
  lastGenerated?: Date;
  fileUrl?: string;
}

export interface UpdateReportDTO {
  reportName?: string;
  category?: string;
  lastGenerated?: Date;
  fileUrl?: string;
}

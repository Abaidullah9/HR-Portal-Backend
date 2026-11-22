export interface CreateAttendanceDTO {
  employeeId: string;
  date: Date;
  checkIn?: Date;
  checkOut?: Date;
  regularized?: boolean;
  regularizationNote?: string;
}

export interface UpdateAttendanceDTO {
  checkIn?: Date;
  checkOut?: Date;
}

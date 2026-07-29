export interface CreateAttendanceDTO {
  employeeId: string;
  date: Date;
  checkIn?: Date;
  checkOut?: Date;
}

export interface UpdateAttendanceDTO {
  checkIn?: Date;
  checkOut?: Date;
}

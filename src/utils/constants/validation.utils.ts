/**
 * Validates email format.
 * Returns error message string if invalid, null if valid.
 */
export const validateEmail = (email: string): string | null => {
  if (!email) return "Email is required";
  if (!/^\S+@\S+\.\S+$/.test(email)) return "Invalid email format";
  return null;
};

/**
 * Validates password minimum length.
 * Returns error message string if invalid, null if valid.
 */
export const validatePasswordLength = (password: string): string | null => {
  if (!password) return "Password is required";
  if (password.length < 6) return "Password must be at least 6 characters";
  return null;
};

/**
 * Validates that a string field is non-empty.
 * Returns error message string if invalid, null if valid.
 */
export const validateRequiredString = (value: string, fieldName: string): string | null => {
  if (!value || !value.trim()) return `${fieldName} is required`;
  return null;
};

/** Validates user registration payload */
export const validateCreateUser = (body: any): string | null => {
  if (!body.name) return "Name is required";
  if (!body.email) return "Email is required";
  if (!body.password) return "Password is required";
  if (!body.roleId) return "Role ID is required";
  const emailError = validateEmail(body.email);
  if (emailError) return emailError;
  const passwordError = validatePasswordLength(body.password);
  if (passwordError) return passwordError;
  return null;
};

/** Validates employee creation payload */
export const validateCreateEmployee = (body: any): string | null => {
  if (!body.name) return "Name is required";
  if (!body.email) return "Email is required";
  if (!body.employeeCode) return "Employee code is required";
  if (!body.departmentId) return "Department is required";
  if (!body.position) return "Position is required";
  if (!body.employmentType) return "Employment type is required";
  if (!body.joiningDate) return "Joining date is required";
  const emailError = validateEmail(body.email);
  if (emailError) return emailError;
  return null;
};

/** Validates leave request creation payload */
export const validateCreateLeaveRequest = (body: any): string | null => {
  if (!body.employeeId) return "Employee ID is required";
  if (!body.leaveType) return "Leave type is required";
  if (!body.fromDate) return "From date is required";
  if (!body.toDate) return "To date is required";
  if (!body.reasonForLeave) return "Reason for leave is required";
  return null;
};

/** Validates leave approval/rejection payload */
export const validateApproveRejectLeave = (body: any): string | null => {
  if (!body.leaveStatus) return "Leave status is required";
  if (!["approved", "rejected"].includes(body.leaveStatus)) return "Leave status must be 'approved' or 'rejected'";
  if (!body.approvedById) return "Approved by ID is required";
  if (body.leaveStatus === "rejected" && !body.rejectionReason) return "Rejection reason is required when rejecting";
  return null;
};

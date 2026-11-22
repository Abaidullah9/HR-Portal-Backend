import { MESSAGES } from "./messages";

/**
 * Validates email format.
 * Returns error message string if invalid, null if valid.
 */
export const validateEmail = (email: string): string | null => {
  if (!email) return `Email ${MESSAGES.FIELD_REQUIRED}`;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return regex.test(email.trim()) ? null : MESSAGES.INVALID_EMAIL_FORMAT;
};

/**
 * Validates password minimum length.
 * Returns error message string if invalid, null if valid.
 */
export const validatePasswordLength = (password: string): string | null => {
  if (!password) return `Password ${MESSAGES.FIELD_REQUIRED}`;
  if (password.length < 6) return MESSAGES.PASSWORD_MIN_LENGTH;
  return null;
};

/**
 * Validates that a string field is non-empty.
 * Returns error message string if invalid, null if valid.
 */
export const validateRequiredString = (value: string, fieldName: string): string | null => {
  if (!value || !value.trim()) return `${fieldName} ${MESSAGES.FIELD_REQUIRED}`;
  return null;
};

/** Validates user registration payload. roleId is optional — the service
 * defaults self-registrations to the least-privileged role (see user.services). */
export const validateCreateUser = (body: any): string | null => {
  if (!body.name) return `Name ${MESSAGES.FIELD_REQUIRED}`;
  if (!body.email) return `Email ${MESSAGES.FIELD_REQUIRED}`;
  if (!body.password) return `Password ${MESSAGES.FIELD_REQUIRED}`;
  const emailError = validateEmail(body.email);
  if (emailError) return emailError;
  const passwordError = validatePasswordLength(body.password);
  if (passwordError) return passwordError;
  return null;
};

/** Validates employee creation payload */
export const validateCreateEmployee = (body: any): string | null => {
  if (!body.name) return `Name ${MESSAGES.FIELD_REQUIRED}`;
  if (!body.email) return `Email ${MESSAGES.FIELD_REQUIRED}`;
  if (!body.employeeCode) return `Employee code ${MESSAGES.FIELD_REQUIRED}`;
  if (!body.departmentId) return `Department ${MESSAGES.FIELD_REQUIRED}`;
  if (!body.position) return `Position ${MESSAGES.FIELD_REQUIRED}`;
  if (!body.employmentType) return `Employment type ${MESSAGES.FIELD_REQUIRED}`;
  if (!body.joiningDate) return `Joining date ${MESSAGES.FIELD_REQUIRED}`;
  const emailError = validateEmail(body.email);
  if (emailError) return emailError;
  return null;
};

/** Validates leave request creation payload */
export const validateCreateLeaveRequest = (body: any): string | null => {
  if (!body.employeeId) return MESSAGES.EMPLOYEE_ID_REQUIRED;
  if (!body.leaveType) return `Leave type ${MESSAGES.FIELD_REQUIRED}`;
  if (!body.fromDate) return `From date ${MESSAGES.FIELD_REQUIRED}`;
  if (!body.toDate) return `To date ${MESSAGES.FIELD_REQUIRED}`;
  if (!body.reasonForLeave) return `Reason for leave ${MESSAGES.FIELD_REQUIRED}`;
  return null;
};

/** Validates job posting creation payload. postedBy is derived from the
 * authenticated user in the controller, not the client body. */
export const validateCreateJobPosting = (body: any): string | null => {
  if (!body.position) return `Position ${MESSAGES.FIELD_REQUIRED}`;
  if (!body.departmentId) return `Department ${MESSAGES.FIELD_REQUIRED}`;
  if (!body.description) return `Description ${MESSAGES.FIELD_REQUIRED}`;
  if (body.numberOfOpenings !== undefined && (!Number.isInteger(body.numberOfOpenings) || body.numberOfOpenings < 1)) {
    return 'Number of openings must be a positive integer';
  }
  return null;
};

/** Validates leave approval/rejection payload */
export const validateApproveRejectLeave = (body: any): string | null => {
  if (!body.leaveStatus) return `Leave status ${MESSAGES.FIELD_REQUIRED}`;
  if (!["approved", "rejected"].includes(body.leaveStatus)) return MESSAGES.INVALID_LEAVE_STATUS;
  // approvedById is derived from the authenticated user in the controller, not the client body
  if (body.leaveStatus === "rejected" && !body.rejectionReason) return MESSAGES.REJECTION_REASON_REQUIRED;
  return null;
};

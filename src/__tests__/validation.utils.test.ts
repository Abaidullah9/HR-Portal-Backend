import {
  validateEmail,
  validatePasswordLength,
  validateRequiredString,
  validateCreateUser,
  validateCreateEmployee,
  validateCreateLeaveRequest,
  validateApproveRejectLeave,
  validateCreateJobPosting,
} from '../utils/helper/constants/validation.utils';

describe('Validation Utils', () => {
  describe('validateEmail', () => {
    it('should return error for empty email', () => {
      expect(validateEmail('')).toBe('Email is required');
      expect(validateEmail(null as any)).toBe('Email is required');
    });

    it('should return error for invalid email format', () => {
      expect(validateEmail('invalid')).toBe('Invalid email format');
      expect(validateEmail('invalid@')).toBe('Invalid email format');
      expect(validateEmail('@domain.com')).toBe('Invalid email format');
    });

    it('should return null for valid email', () => {
      expect(validateEmail('test@example.com')).toBeNull();
      expect(validateEmail('user.name@domain.co')).toBeNull();
    });
  });

  describe('validatePasswordLength', () => {
    it('should return error for empty password', () => {
      expect(validatePasswordLength('')).toBe('Password is required');
    });

    it('should return error for short password', () => {
      expect(validatePasswordLength('12345')).toBe('Password must be at least 6 characters');
      expect(validatePasswordLength('abc')).toBe('Password must be at least 6 characters');
    });

    it('should return null for valid password', () => {
      expect(validatePasswordLength('123456')).toBeNull();
      expect(validatePasswordLength('longpassword')).toBeNull();
    });
  });

  describe('validateRequiredString', () => {
    it('should return error for empty string', () => {
      expect(validateRequiredString('', 'Name')).toBe('Name is required');
      expect(validateRequiredString('   ', 'Name')).toBe('Name is required');
    });

    it('should return null for valid string', () => {
      expect(validateRequiredString('John', 'Name')).toBeNull();
    });
  });

  describe('validateCreateUser', () => {
    it('should return error for missing name', () => {
      const body = { email: 'test@test.com', password: '123456', roleId: 'role1' };
      expect(validateCreateUser(body)).toBe('Name is required');
    });

    it('should return error for missing email', () => {
      const body = { name: 'John', password: '123456', roleId: 'role1' };
      expect(validateCreateUser(body)).toBe('Email is required');
    });

    it('should return error for missing password', () => {
      const body = { name: 'John', email: 'test@test.com', roleId: 'role1' };
      expect(validateCreateUser(body)).toBe('Password is required');
    });

    it('should NOT require roleId (service defaults self-registration to Employee role)', () => {
      const body = { name: 'John', email: 'test@test.com', password: '123456' };
      expect(validateCreateUser(body)).toBeNull();
    });

    it('should return error for invalid email', () => {
      const body = { name: 'John', email: 'invalid', password: '123456', roleId: 'role1' };
      expect(validateCreateUser(body)).toBe('Invalid email format');
    });

    it('should return error for short password', () => {
      const body = { name: 'John', email: 'test@test.com', password: '123', roleId: 'role1' };
      expect(validateCreateUser(body)).toBe('Password must be at least 6 characters');
    });

    it('should return null for valid input', () => {
      const body = { name: 'John', email: 'test@test.com', password: '123456', roleId: 'role1' };
      expect(validateCreateUser(body)).toBeNull();
    });
  });

  describe('validateCreateEmployee', () => {
    it('should return error for missing fields', () => {
      expect(validateCreateEmployee({})).toBe('Name is required');
      expect(validateCreateEmployee({ name: 'John' })).toBe('Email is required');
      expect(validateCreateEmployee({ name: 'John', email: 'test@test.com' })).toBe('Employee code is required');
    });

    it('should return null for valid input', () => {
      const body = {
        name: 'John',
        email: 'test@test.com',
        employeeCode: 'EMP001',
        departmentId: 'dept1',
        position: 'Developer',
        employmentType: 'full-time',
        joiningDate: '2024-01-01',
      };
      expect(validateCreateEmployee(body)).toBeNull();
    });
  });

  describe('validateCreateLeaveRequest', () => {
    it('should return error for missing fields', () => {
      expect(validateCreateLeaveRequest({})).toBe('Employee ID is required');
      expect(validateCreateLeaveRequest({ employeeId: 'emp1' })).toBe('Leave type is required');
    });

    it('should return null for valid input', () => {
      const body = {
        employeeId: 'emp1',
        leaveType: 'annual',
        fromDate: '2024-01-01',
        toDate: '2024-01-05',
        reasonForLeave: 'Vacation',
      };
      expect(validateCreateLeaveRequest(body)).toBeNull();
    });
  });

  describe('validateApproveRejectLeave', () => {
    it('should return error for missing leaveStatus', () => {
      expect(validateApproveRejectLeave({})).toBe('Leave status is required');
    });

    it('should return error for invalid leaveStatus', () => {
      expect(validateApproveRejectLeave({ leaveStatus: 'invalid' })).toBe('Leave status must be \'approved\' or \'rejected\'');
    });

    it('should not require approvedById in the body (server derives it from auth)', () => {
      expect(validateApproveRejectLeave({ leaveStatus: 'approved' })).toBeNull();
    });

    it('should return error for rejected without reason', () => {
      const body = { leaveStatus: 'rejected', approvedById: 'user1' };
      expect(validateApproveRejectLeave(body)).toBe('Rejection reason is required when rejecting');
    });

    it('should return null for valid approved leave', () => {
      const body = { leaveStatus: 'approved', approvedById: 'user1' };
      expect(validateApproveRejectLeave(body)).toBeNull();
    });

    it('should return null for valid rejected leave with reason', () => {
      const body = { leaveStatus: 'rejected', approvedById: 'user1', rejectionReason: 'Busy period' };
      expect(validateApproveRejectLeave(body)).toBeNull();
    });
  });

  describe('validateCreateJobPosting', () => {
    it('should return error for missing position', () => {
      const body = { departmentId: 'dept1', description: 'desc' };
      expect(validateCreateJobPosting(body)).toBe('Position is required');
    });

    it('should return error for missing departmentId', () => {
      const body = { position: 'Engineer', description: 'desc' };
      expect(validateCreateJobPosting(body)).toBe('Department is required');
    });

    it('should return error for missing description', () => {
      const body = { position: 'Engineer', departmentId: 'dept1' };
      expect(validateCreateJobPosting(body)).toBe('Description is required');
    });

    it('should return error for non-positive openings', () => {
      const body = { position: 'Engineer', departmentId: 'dept1', description: 'desc', numberOfOpenings: 0 };
      expect(validateCreateJobPosting(body)).toBe('Number of openings must be a positive integer');
    });

    it('should return null for valid payload without postedBy (server derives it)', () => {
      const body = { position: 'Engineer', departmentId: 'dept1', description: 'desc', numberOfOpenings: 2 };
      expect(validateCreateJobPosting(body)).toBeNull();
    });
  });
});

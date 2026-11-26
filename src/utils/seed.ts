import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

import Action from '../models/action.model';
import Role from '../models/role.model';
import Department from '../models/department.model';
import User from '../models/user.model';
import Employee from '../models/employee.model';
import OrganizationSetting from '../models/organizationSetting.model';
import PerformanceCycle from '../models/performanceCycle.model';
import JobPosting from '../models/jobPosting.model';
import Candidate from '../models/candidate.model';
import Interview from '../models/interview.model';
import LeaveBalance from '../models/leaveBalance.model';
import LeaveRequest from '../models/leaveRequest.model';
import Attendance from '../models/attendance.model';
import EmployeePayroll from '../models/employeePayroll.model';
import Appraisal from '../models/appraisal.model';
import Feedback from '../models/feedback.model';
import Team from '../models/team.model';
import Report from '../models/report.model';
import EmployeeDocument from '../models/document.model';
import AuditLog from '../models/auditLog.model';
import PayrollRun from '../models/payrollRun.model';
import Compensation from '../models/compensation.model';
import Holiday from '../models/holiday.model';
import Goal from '../models/goal.model';
import Notification from '../models/notification.model';
import ChecklistTask from '../models/checklistTask.model';
import ChecklistTemplate from '../models/checklistTemplate.model';
import { dayKey, startOfDay } from './dates';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/HR-DB';

async function seedDatabase() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    console.log('🧹 Clearing existing data...');
    await Promise.all([
      AuditLog.deleteMany({}),
      Report.deleteMany({}),
      Team.deleteMany({}),
      Feedback.deleteMany({}),
      Appraisal.deleteMany({}),
      EmployeePayroll.deleteMany({}),
      Attendance.deleteMany({}),
      LeaveRequest.deleteMany({}),
      LeaveBalance.deleteMany({}),
      Interview.deleteMany({}),
      Candidate.deleteMany({}),
      JobPosting.deleteMany({}),
      PerformanceCycle.deleteMany({}),
      EmployeeDocument.deleteMany({}),
      Employee.deleteMany({}),
      User.deleteMany({}),
      Department.deleteMany({}),
      Role.deleteMany({}),
      Action.deleteMany({}),
      OrganizationSetting.deleteMany({}),
    ]);

    // Sync indexes to pick up model changes (e.g. compound index on actions)
    await mongoose.syncIndexes();

    console.log('🌱 Seeding Organization Settings...');
    const orgSettings = await OrganizationSetting.create({
      organizationName: 'TechCorp Pakistan',
      email: 'admin@techcorp.com',
      phone: '+92-21-111-222-333',
      address: '3rd Floor, Dolmen Towers, Clifton, Karachi 75600',
      workingDays: [1, 2, 3, 4, 5],
      lateAfter: '09:15',
      currency: 'PKR',
      logoUrl: 'https://example.com/logo.png'
    });

    console.log('🌱 Seeding Actions...');
    const actionDocs = await Action.insertMany([
      // Actions module
      { actionName: 'read_Action', actionDescription: 'View actions' },
      { actionName: 'create_Action', actionDescription: 'Create action' },
      { actionName: 'update_Action', actionDescription: 'Update action' },
      { actionName: 'delete_Action', actionDescription: 'Delete action' },

      // Appraisal module
      { actionName: 'read_Appraisal', actionDescription: 'View appraisals' },
      { actionName: 'create_Appraisal', actionDescription: 'Create appraisal' },
      { actionName: 'update_Appraisal', actionDescription: 'Update appraisal' },
      { actionName: 'update_AppraisalStatus', actionDescription: 'Update appraisal status' },
      { actionName: 'delete_Appraisal', actionDescription: 'Delete appraisal' },

      // Attendance module
      { actionName: 'read_Attendance', actionDescription: 'View attendance records' },
      { actionName: 'create_Attendance', actionDescription: 'Create attendance record' },
      { actionName: 'update_Attendance', actionDescription: 'Update attendance record' },
      { actionName: 'delete_Attendance', actionDescription: 'Delete attendance record' },

      // Candidate module
      { actionName: 'read_Candidate', actionDescription: 'View candidates' },
      { actionName: 'create_Candidate', actionDescription: 'Create candidate' },
      { actionName: 'update_Candidate', actionDescription: 'Update candidate' },
      { actionName: 'update_CandidateStatus', actionDescription: 'Update candidate status' },
      { actionName: 'delete_Candidate', actionDescription: 'Delete candidate' },

      // Department module
      { actionName: 'read_Department', actionDescription: 'View departments' },
      { actionName: 'create_Department', actionDescription: 'Create department' },
      { actionName: 'update_Department', actionDescription: 'Update department' },
      { actionName: 'delete_Department', actionDescription: 'Delete department' },

      // Document module
      { actionName: 'read_Document', actionDescription: 'View documents' },
      { actionName: 'create_Document', actionDescription: 'Upload document' },
      { actionName: 'update_Document', actionDescription: 'Update document' },
      { actionName: 'delete_Document', actionDescription: 'Delete document' },

      // Self-service actions. The names deliberately lack a `_Module` suffix, so
      // the module-wide role grants below never pick them up by accident.
      { actionName: 'read_OwnPayslip', actionDescription: 'View own payslips' },
      { actionName: 'read_OwnAppraisal', actionDescription: 'View own appraisals' },
      { actionName: 'review_OwnAppraisal', actionDescription: 'Submit own appraisal self review' },
      { actionName: 'read_OwnLeaveBalance', actionDescription: 'View own leave balances' },
      { actionName: 'read_OwnAttendance', actionDescription: 'View own attendance' },
      { actionName: 'read_OwnGoal', actionDescription: 'View own goals' },
      { actionName: 'update_OwnGoalProgress', actionDescription: 'Update own goal progress' },
      { actionName: 'read_OwnProfile', actionDescription: 'View own employee profile' },

      // Employee module
      { actionName: 'read_Employee', actionDescription: 'View employees' },
      { actionName: 'create_Employee', actionDescription: 'Create employee' },
      { actionName: 'update_Employee', actionDescription: 'Update employee' },
      { actionName: 'delete_Employee', actionDescription: 'Delete employee' },

      // Payroll module
      { actionName: 'read_Payroll', actionDescription: 'View payroll records' },
      { actionName: 'create_Payroll', actionDescription: 'Create payroll record' },
      { actionName: 'update_Payroll', actionDescription: 'Update payroll record' },
      { actionName: 'update_PayrollStatus', actionDescription: 'Update payroll status' },
      { actionName: 'delete_Payroll', actionDescription: 'Delete payroll record' },

      // Feedback module
      { actionName: 'read_Feedback', actionDescription: 'View feedback' },
      { actionName: 'create_Feedback', actionDescription: 'Submit feedback' },
      { actionName: 'update_Feedback', actionDescription: 'Update feedback' },
      { actionName: 'delete_Feedback', actionDescription: 'Delete feedback' },

      // Interview module
      { actionName: 'read_Interview', actionDescription: 'View interviews' },
      { actionName: 'create_Interview', actionDescription: 'Schedule interview' },
      { actionName: 'update_Interview', actionDescription: 'Update interview' },
      { actionName: 'update_InterviewStatus', actionDescription: 'Update interview status' },
      { actionName: 'delete_Interview', actionDescription: 'Delete interview' },

      // JobPosting module
      { actionName: 'read_JobPosting', actionDescription: 'View job postings' },
      { actionName: 'create_JobPosting', actionDescription: 'Create job posting' },
      { actionName: 'update_JobPosting', actionDescription: 'Update job posting' },
      { actionName: 'update_JobPostingStatus', actionDescription: 'Update job posting status' },
      { actionName: 'delete_JobPosting', actionDescription: 'Delete job posting' },

      // LeaveBalance module
      { actionName: 'read_LeaveBalance', actionDescription: 'View leave balances' },
      { actionName: 'create_LeaveBalance', actionDescription: 'Create leave balance' },
      { actionName: 'deduct_LeaveBalance', actionDescription: 'Deduct leave balance' },
      { actionName: 'update_LeaveBalance', actionDescription: 'Update leave balance' },
      { actionName: 'delete_LeaveBalance', actionDescription: 'Delete leave balance' },

      // LeaveRequest module
      { actionName: 'read_LeaveRequest', actionDescription: 'Read leave requests' },
      { actionName: 'create_LeaveRequest', actionDescription: 'Request leave' },
      { actionName: 'update_LeaveRequest', actionDescription: 'Update leave request' },
      { actionName: 'approveReject_LeaveRequest', actionDescription: 'Approve or reject leave' },
      { actionName: 'cancel_LeaveRequest', actionDescription: 'Cancel leave request' },
      { actionName: 'delete_LeaveRequest', actionDescription: 'Delete leave request' },

      // OrganizationSetting module
      { actionName: 'read_OrganizationSetting', actionDescription: 'View organization settings' },
      { actionName: 'create_OrganizationSetting', actionDescription: 'Create organization settings' },
      { actionName: 'update_OrganizationSetting', actionDescription: 'Update organization settings' },
      { actionName: 'delete_OrganizationSetting', actionDescription: 'Delete organization settings' },

      // PerformanceCycle module
      { actionName: 'read_PerformanceCycle', actionDescription: 'View performance cycles' },
      { actionName: 'create_PerformanceCycle', actionDescription: 'Create performance cycle' },
      { actionName: 'update_PerformanceCycle', actionDescription: 'Update performance cycle' },
      { actionName: 'updateStatus_PerformanceCycle', actionDescription: 'Update cycle status' },
      { actionName: 'delete_PerformanceCycle', actionDescription: 'Delete performance cycle' },

      // Report module
      { actionName: 'read_Report', actionDescription: 'View reports' },
      { actionName: 'create_Report', actionDescription: 'Generate report' },
      { actionName: 'update_Report', actionDescription: 'Update report' },
      { actionName: 'delete_Report', actionDescription: 'Delete report' },

      // Role module
      { actionName: 'read_Role', actionDescription: 'View roles' },
      { actionName: 'create_Role', actionDescription: 'Create role' },
      { actionName: 'update_Role', actionDescription: 'Update role' },
      { actionName: 'assignActions_Role', actionDescription: 'Assign actions to role' },
      { actionName: 'delete_Role', actionDescription: 'Delete role' },

      // Team module
      { actionName: 'read_Team', actionDescription: 'View teams' },
      { actionName: 'create_Team', actionDescription: 'Create team' },
      { actionName: 'update_Team', actionDescription: 'Update team' },
      { actionName: 'addMember_Team', actionDescription: 'Add team member' },
      { actionName: 'removeMember_Team', actionDescription: 'Remove team member' },
      { actionName: 'delete_Team', actionDescription: 'Delete team' },

      // User module
      { actionName: 'read_User', actionDescription: 'View users' },
      { actionName: 'update_User', actionDescription: 'Update user' },
      { actionName: 'updateStatus_User', actionDescription: 'Update user status' },
      { actionName: 'updateRole_User', actionDescription: 'Update user role' },
      { actionName: 'delete_User', actionDescription: 'Delete user' },
    ]);

    console.log('🌱 Seeding Roles...');
    // Admin gets ALL actions
    const adminActionIds = actionDocs.map(a => a._id);
    // HR gets: Employee, Candidate, LeaveRequest, LeaveBalance, Document, JobPosting, Interview, Report, User, Payroll
    const hrModules = ['Employee', 'Candidate', 'LeaveRequest', 'LeaveBalance', 'Document', 'JobPosting', 'Interview', 'Report', 'User', 'Payroll'];
    // Actions whose module suffix the filter above cannot match (an extra word
    // after the module name), granted explicitly so HR can finish the workflow.
    const hrExtraActions = ['update_PayrollStatus'];
    const hrActionIds = actionDocs
      .filter(a => hrModules.some(m => a.actionName.endsWith(`_${m}`)) || hrExtraActions.includes(a.actionName))
      .map(a => a._id);
    // Manager gets: Employee, Department, Attendance, Appraisal, Feedback, Team, LeaveRequest, PerformanceCycle
    const managerModules = ['Employee', 'Department', 'Attendance', 'Appraisal', 'Feedback', 'Team', 'LeaveRequest', 'PerformanceCycle'];
    const managerActionIds = actionDocs
      .filter(a => managerModules.some(m => a.actionName.endsWith(`_${m}`)))
      .map(a => a._id);
    // Employee gets: LeaveRequest, Feedback, Document, Attendance (but NOT approveReject).
    const employeeModules = ['LeaveRequest', 'Feedback', 'Document', 'Attendance'];
    const employeeActionIds = actionDocs
      .filter(a => employeeModules.some(m => a.actionName.endsWith(`_${m}`)) && a.actionName !== 'approveReject_LeaveRequest')
      .map(a => a._id);
    // Self-service grants: every role may read the caller's own records. The
    // names deliberately lack a `_Module` suffix, so no module-wide grant picks
    // them up by accident.
    const selfServiceActions = [
      'read_OwnPayslip',
      'read_OwnAppraisal',
      'review_OwnAppraisal',
      'read_OwnLeaveBalance',
      'read_OwnAttendance',
      'read_OwnGoal',
      'update_OwnGoalProgress',
      'read_OwnProfile',
    ];
    const selfServiceActionIds = actionDocs
      .filter(a => selfServiceActions.includes(a.actionName))
      .map(a => a._id);

    const roles = await Role.insertMany([
      { roleName: 'Admin', actions: adminActionIds, organizationId: orgSettings._id },
      { roleName: 'HR', actions: [...hrActionIds, ...selfServiceActionIds], organizationId: orgSettings._id },
      { roleName: 'Manager', actions: [...managerActionIds, ...selfServiceActionIds], organizationId: orgSettings._id },
      { roleName: 'Employee', actions: [...employeeActionIds, ...selfServiceActionIds], organizationId: orgSettings._id },
    ]);

    console.log('🌱 Seeding Departments...');
    const departments = await Department.insertMany([
      { name: 'Engineering', description: 'Software development and IT' },
      { name: 'Human Resources', description: 'Recruitment, payroll, and employee relations' },
      { name: 'Sales', description: 'Revenue generation and client management' },
    ]);

    console.log('🌱 Seeding Users...');
    const hashedPassword = await bcrypt.hash('Password123!', 10);

    const orgId = orgSettings._id;

    // Users carry the tenant too: request context derives organizationId from
    // the session user, and employee queries are scoped by it.
    const users = await User.insertMany([
      { name: 'Alice Admin', email: 'admin@techcorp.com', password: hashedPassword, roleId: roles[0]!._id, organizationId: orgId, isActive: true },
      { name: 'Bob HR', email: 'hr@techcorp.com', password: hashedPassword, roleId: roles[1]!._id, organizationId: orgId, isActive: true },
      { name: 'Charlie Manager', email: 'manager@techcorp.com', password: hashedPassword, roleId: roles[2]!._id, organizationId: orgId, isActive: true },
      { name: 'Diana Employee', email: 'employee@techcorp.com', password: hashedPassword, roleId: roles[3]!._id, organizationId: orgId, isActive: true },
    ]);

    console.log('🌱 Seeding Employees...');
    const managerEmp = await Employee.create({
      organizationId: orgId,
      userId: users[2]!._id,
      employeeCode: 'EMP-0001',
      name: 'Charlie Manager',
      email: 'manager@techcorp.com',
      departmentId: departments[0]!._id,
      position: 'Engineering Manager',
      employmentType: 'full-time',
      salary: 190000,
      isActive: true,
      joiningDate: new Date('2022-01-15'),
    });

    await Department.findByIdAndUpdate(departments[0]!._id, { managerId: managerEmp._id });

    const employeeEmp = await Employee.create({
      organizationId: orgId,
      userId: users[3]!._id,
      employeeCode: 'EMP-0002',
      name: 'Diana Employee',
      email: 'employee@techcorp.com',
      departmentId: departments[0]!._id,
      reportingManagerId: managerEmp._id,
      position: 'Senior Software Engineer',
      employmentType: 'full-time',
      salary: 158000,
      isActive: true,
      joiningDate: new Date('2023-03-10'),
    });

    console.log('🌱 Seeding Performance Cycle...');
    const cycle = await PerformanceCycle.create({
      name: 'Q4 2024 Review',
      startDate: new Date('2024-10-01'),
      endDate: new Date('2024-12-31'),
      status: 'active'
    });

    console.log('🌱 Seeding Job Postings & Candidates...');
    const jobPosting = await JobPosting.create({
      position: 'Frontend Developer',
      departmentId: departments[0]!._id,
      description: 'Looking for a React expert.',
      requirements: ['3+ years React', 'TypeScript'],
      numberOfOpenings: 2,
      postedBy: users[1]!._id,
      postedOnDate: new Date(),
      status: 'open'
    });

    const candidate = await Candidate.create({
      organizationId: orgId,
      jobPostingId: jobPosting._id,
      name: 'Evan Candidate',
      email: 'evan@example.com',
      phone: '+92-300-1234567',
      source: 'LinkedIn',
      appliedDate: new Date(),
      status: 'interview',
      resume: 'https://example.com/resumes/evan.pdf'
    });

    console.log('🌱 Seeding Interview...');
    await Interview.create({
      candidateId: candidate._id,
      interviewerId: managerEmp._id,
      scheduledAt: new Date(Date.now() + 86400000 * 3),
      mode: 'video',
      round: 'Technical',
      status: 'scheduled'
    });

    console.log('🌱 Seeding Leave Balances & Requests...');
    await LeaveBalance.create({
      organizationId: orgId,
      employeeId: employeeEmp._id,
      leaveType: 'vacation',
      totalAllocated: 20,
      used: 12,
      remaining: 8,
      year: 2024
    });

    const leaveRequest = await LeaveRequest.create({
      organizationId: orgId,
      employeeId: employeeEmp._id,
      leaveType: 'vacation',
      fromDate: new Date(Date.now() + 10 * 86400000),
      toDate: new Date(Date.now() + 14 * 86400000),
      leaveStatus: 'pending',
      reasonForLeave: 'Winter holiday trip'
    });

    console.log('🌱 Seeding Attendance...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await Attendance.create({
      organizationId: orgId,
      employeeId: employeeEmp._id,
      date: today,
      checkIn: new Date(startOfDay(dayKey(today)).getTime() + 9 * 60 * 60 * 1000),
      checkOut: new Date(startOfDay(dayKey(today)).getTime() + 17 * 60 * 60 * 1000),
    });

    console.log('🌱 Seeding Payroll...');
    const currentMonthStart = new Date();
    currentMonthStart.setDate(1);
    const currentMonthEnd = new Date(currentMonthStart);
    currentMonthEnd.setMonth(currentMonthStart.getMonth() + 1);
    currentMonthEnd.setDate(0);

    const payroll = await EmployeePayroll.create({
      organizationId: orgId,
      employeeId: employeeEmp._id,
      baseSalary: 158000,
      allowances: [{ type: 'transport', amount: 5000, taxable: false }],
      deductions: [{ type: 'tax', amount: 12000, note: 'Monthly income tax' }],
      bonuses: [],
      netPay: 151000,
      payPeriodStart: currentMonthStart,
      payPeriodEnd: currentMonthEnd,
      paymentMethod: 'bank transfer',
      status: 'completed'
    });

    console.log('🌱 Seeding Appraisals & Feedback...');
    await Appraisal.create({
      organizationId: orgId,
      employeeId: employeeEmp._id,
      cycleId: cycle._id,
      appraiserId: managerEmp._id,
      reviewDate: new Date(),
      overallRating: 4.5,
      goalsCompleted: 4,
      feedbackReceived: 2,
      skillsRating: [
        { skillName: 'TypeScript', skillRating: 5, targetRating: 4 },
        { skillName: 'System Design', skillRating: 4, targetRating: 4 }
      ],
      goals: [
        { goalName: 'Migrate legacy API', goalCompletionRate: 100, deadline: new Date('2024-11-30'), completionStatus: 'completed' }
      ],
      status: 'completed'
    });

    await Feedback.create({
      targetEmployeeId: employeeEmp._id,
      reviewerId: managerEmp._id,
      cycleId: cycle._id,
      relationship: 'manager',
      comment: 'Diana has shown exceptional growth in system architecture this quarter.',
      rating: 5,
      date: new Date()
    });

    console.log('🌱 Seeding Teams...');
    await Team.create({
      teamName: 'Backend Core',
      teamLeadId: managerEmp._id,
      teamMembers: [
        { employeeId: employeeEmp._id }
      ]
    });

    console.log('🌱 Seeding Reports...');
    await Report.create({
      reportName: 'Q4 Attendance Summary',
      category: 'attendance',
      generatedBy: users[1]!._id,
      lastGenerated: new Date(),
      fileUrl: 'https://example.com/reports/q4-attendance.pdf'
    });

    console.log('🌱 Seeding Documents...');
    const contract = await EmployeeDocument.create({
      organizationId: orgId,
      employeeId: employeeEmp._id,
      name: 'Diana Contract.pdf',
      type: 'contract',
      fileUrl: 'https://example.com/documents/diana_contract.pdf',
      uploadedBy: users[1]!._id
    });

    // Extra people, one per access pattern the UI and the authorisation rules
    // care about: HR with an employee record, a second direct report of the
    // manager, and an employee in another department who reports to nobody.
    console.log('🌱 Seeding Additional People...');
    const hrEmp = await Employee.create({
      organizationId: orgId,
      userId: users[1]!._id,
      employeeCode: 'EMP-0003',
      name: 'Bob HR',
      email: 'hr@techcorp.com',
      departmentId: departments[1]!._id,
      position: 'HR Business Partner',
      employmentType: 'full-time',
      salary: 164000,
      isActive: true,
      joiningDate: new Date('2021-06-01'),
    });

    const samUser = await User.create({
      name: 'Sam Rivera',
      email: 'sam@techcorp.com',
      password: hashedPassword,
      roleId: roles[3]!._id,
      organizationId: orgId,
      isActive: true,
    });

    const samEmp = await Employee.create({
      organizationId: orgId,
      userId: samUser._id,
      employeeCode: 'EMP-0004',
      name: 'Sam Rivera',
      email: 'sam@techcorp.com',
      departmentId: departments[0]!._id,
      reportingManagerId: managerEmp._id,
      position: 'Frontend Engineer',
      employmentType: 'full-time',
      salary: 128000,
      isActive: true,
      joiningDate: new Date('2024-02-05'),
    });

    const priyaUser = await User.create({
      name: 'Priya Patel',
      email: 'priya@techcorp.com',
      password: hashedPassword,
      roleId: roles[3]!._id,
      organizationId: orgId,
      isActive: true,
    });

    // Reports to nobody: this is the "unrelated colleague" that the ownership
    // checks must refuse to a manager and to another employee.
    const priyaEmp = await Employee.create({
      organizationId: orgId,
      userId: priyaUser._id,
      employeeCode: 'EMP-0005',
      name: 'Priya Patel',
      email: 'priya@techcorp.com',
      departmentId: departments[2]!._id,
      position: 'Account Executive',
      employmentType: 'full-time',
      salary: 112000,
      isActive: true,
      joiningDate: new Date('2023-09-18'),
    });

    console.log('🌱 Seeding Compensation History...');
    const compensationRows = [
      { employeeId: managerEmp._id, baseSalary: 180000, effectiveFrom: '2022-01-15', reason: 'initial' as const },
      { employeeId: managerEmp._id, baseSalary: 190000, effectiveFrom: '2024-04-01', reason: 'raise' as const },
      { employeeId: employeeEmp._id, baseSalary: 148000, effectiveFrom: '2023-03-10', reason: 'initial' as const },
      { employeeId: employeeEmp._id, baseSalary: 158000, effectiveFrom: '2024-04-01', reason: 'raise' as const },
      { employeeId: hrEmp._id, baseSalary: 164000, effectiveFrom: '2021-06-01', reason: 'initial' as const },
      { employeeId: samEmp._id, baseSalary: 128000, effectiveFrom: '2024-02-05', reason: 'initial' as const },
      { employeeId: priyaEmp._id, baseSalary: 112000, effectiveFrom: '2023-09-18', reason: 'initial' as const },
    ];
    await Compensation.insertMany(
      compensationRows.map((row) => ({ ...row, organizationId: orgId, currency: 'PKR', createdBy: users[1]!._id })),
    );

    console.log('🌱 Seeding Holidays...');
    const thisYear = new Date().getFullYear();
    await Holiday.insertMany([
      { organizationId: orgId, name: "New Year's Day", date: `${thisYear}-01-01`, paid: true },
      { organizationId: orgId, name: 'Pakistan Day', date: `${thisYear}-03-23`, paid: true },
      { organizationId: orgId, name: 'Independence Day', date: `${thisYear}-08-14`, paid: true },
    ]);

    console.log('🌱 Seeding Leave Balances...');
    const balanceRows = [
      { employeeId: employeeEmp._id, leaveType: 'vacation', totalAllocated: 20, used: 3 },
      { employeeId: employeeEmp._id, leaveType: 'sick', totalAllocated: 10, used: 1 },
      { employeeId: samEmp._id, leaveType: 'vacation', totalAllocated: 18, used: 2 },
      { employeeId: samEmp._id, leaveType: 'sick', totalAllocated: 10, used: 0 },
      { employeeId: priyaEmp._id, leaveType: 'vacation', totalAllocated: 15, used: 5 },
      { employeeId: priyaEmp._id, leaveType: 'sick', totalAllocated: 10, used: 3 },
    ];
    await LeaveBalance.insertMany(
      balanceRows.map((row) => ({
        ...row,
        organizationId: orgId,
        remaining: row.totalAllocated - row.used,
        year: thisYear,
      })),
    );

    console.log('🌱 Seeding More Leave Requests...');
    const daysFromNow = (days: number) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() + days);
      return date;
    };

    // Approved: shows the balance deduction and fills the team calendar.
    await LeaveRequest.create({
      organizationId: orgId,
      employeeId: samEmp._id,
      leaveType: 'vacation',
      fromDate: daysFromNow(-18),
      toDate: daysFromNow(-16),
      leaveStatus: 'approved',
      approvedById: managerEmp._id,
      reasonForLeave: 'Family trip',
      workingDays: 3,
    });

    // Pending from the unrelated colleague: a manager must not see this one.
    await LeaveRequest.create({
      organizationId: orgId,
      employeeId: priyaEmp._id,
      leaveType: 'sick',
      fromDate: daysFromNow(6),
      toDate: daysFromNow(7),
      leaveStatus: 'pending',
      reasonForLeave: 'Medical appointment',
      workingDays: 2,
    });

    // Cancelled: the refund path and the cancelled filter both need a row.
    await LeaveRequest.create({
      organizationId: orgId,
      employeeId: employeeEmp._id,
      leaveType: 'vacation',
      fromDate: daysFromNow(-40),
      toDate: daysFromNow(-38),
      leaveStatus: 'cancelled',
      reasonForLeave: 'Plans changed',
      workingDays: 3,
    });

    console.log('🌱 Seeding Attendance History...');
    const attendanceRows: Record<string, unknown>[] = [];
    for (const employee of [managerEmp, employeeEmp, hrEmp, samEmp, priyaEmp]) {
      for (let offset = 0; offset < 5; offset += 1) {
        const date = daysFromNow(-offset - 1);
        attendanceRows.push({
          organizationId: orgId,
          employeeId: employee._id,
          date,
          dateKey: dayKey(date),
          checkIn: new Date(startOfDay(dayKey(date)).getTime() + 9 * 60 * 60 * 1000),
          checkOut: new Date(startOfDay(dayKey(date)).getTime() + 17 * 60 * 60 * 1000),
        });
      }
    }
    await Attendance.insertMany(attendanceRows);

    console.log('🌱 Seeding Payroll Run...');
    const periodStart = currentMonthStart.toISOString().slice(0, 10);
    const periodEnd = currentMonthEnd.toISOString().slice(0, 10);
    const payrollRun = await PayrollRun.create({
      organizationId: orgId,
      periodStart,
      periodEnd,
      status: 'draft',
      employeeCount: 5,
      totalNetPay: 190000 + 158000 + 164000 + 128000 + 112000,
      currency: 'USD',
      createdBy: users[1]!._id,
      notes: 'Seed data: a draft run for approving, paying and reversing.',
    });

    await EmployeePayroll.insertMany(
      [
        { employeeId: managerEmp._id, baseSalary: 190000 },
        { employeeId: employeeEmp._id, baseSalary: 158000 },
        { employeeId: hrEmp._id, baseSalary: 164000 },
        { employeeId: samEmp._id, baseSalary: 128000 },
        { employeeId: priyaEmp._id, baseSalary: 112000 },
      ].map((row) => ({
        organizationId: orgId,
        employeeId: row.employeeId,
        payRunId: payrollRun._id,
        baseSalary: row.baseSalary,
        allowances: [],
        deductions: [],
        bonuses: [],
        netPay: row.baseSalary,
        payPeriodStart: currentMonthStart,
        payPeriodEnd: currentMonthEnd,
        paymentMethod: 'bank transfer',
        status: 'pending',
      })),
    );

    console.log('🌱 Seeding Goals...');
    await Goal.insertMany([
      {
        organizationId: orgId,
        employeeId: employeeEmp._id,
        cycleId: cycle._id,
        title: 'Ship the reporting module',
        description: 'Deliver the reports page with export.',
        successCriteria: 'Reports page live with CSV export',
        progress: 60,
        status: 'in_progress',
        dueDate: `${thisYear}-12-31`,
        weight: 40,
        createdBy: users[2]!._id,
      },
      {
        organizationId: orgId,
        employeeId: employeeEmp._id,
        cycleId: cycle._id,
        title: 'Mentor a junior engineer',
        description: 'Weekly pairing with Sam.',
        progress: 30,
        status: 'in_progress',
        weight: 20,
        createdBy: users[2]!._id,
      },
      {
        organizationId: orgId,
        employeeId: samEmp._id,
        cycleId: cycle._id,
        title: 'Own the design system',
        progress: 10,
        status: 'not_started',
        weight: 30,
        createdBy: users[2]!._id,
      },
      {
        organizationId: orgId,
        employeeId: priyaEmp._id,
        cycleId: cycle._id,
        title: 'Close enterprise pipeline',
        progress: 100,
        status: 'completed',
        weight: 50,
        createdBy: users[2]!._id,
      },
    ]);

    console.log('🌱 Seeding Onboarding Checklists...');
    await ChecklistTemplate.insertMany(
      [
        { title: 'Collect signed employment contract', category: 'compliance' as const, dueOffsetDays: 0 },
        { title: 'Create work email and system accounts', category: 'it' as const, dueOffsetDays: 0 },
        { title: 'Assign a buddy and first-week schedule', category: 'manager' as const, dueOffsetDays: 1 },
      ].map((template) => ({ ...template, organizationId: orgId, type: 'onboarding' as const, active: true })),
    );

    await ChecklistTask.insertMany([
      {
        organizationId: orgId,
        employeeId: samEmp._id,
        type: 'onboarding',
        title: 'Create work email and system accounts',
        category: 'it',
        status: 'open',
        dueDate: dayKey(daysFromNow(-2)),
        ownerId: users[1]!._id,
      },
      {
        organizationId: orgId,
        employeeId: samEmp._id,
        type: 'onboarding',
        title: 'Collect signed employment contract',
        category: 'compliance',
        status: 'done',
        dueDate: dayKey(daysFromNow(-3)),
        ownerId: users[1]!._id,
        completedAt: daysFromNow(-3),
        completedBy: users[1]!._id,
      },
    ]);

    console.log('🌱 Seeding Peer Feedback...');
    await Feedback.create({
      targetEmployeeId: priyaEmp._id,
      reviewerId: samEmp._id,
      cycleId: cycle._id,
      relationship: 'peer',
      comment: 'Great partner on the Q4 launch; kept the customer list clean.',
      rating: 4,
      date: daysFromNow(-7),
    });

    console.log('🌱 Seeding More Documents...');
    await EmployeeDocument.insertMany([
      {
        organizationId: orgId,
        employeeId: samEmp._id,
        name: 'Sam ID Proof.pdf',
        type: 'id_proof',
        fileUrl: 'https://example.com/documents/sam_id.pdf',
        uploadedBy: users[1]!._id,
      },
      {
        organizationId: orgId,
        employeeId: priyaEmp._id,
        name: 'Priya Resume.pdf',
        type: 'resume',
        fileUrl: 'https://example.com/documents/priya_resume.pdf',
        uploadedBy: users[1]!._id,
      },
    ]);

    console.log('🌱 Seeding Notifications...');
    await Notification.insertMany([
      { userId: users[0]!._id, title: 'Payroll run needs approval', detail: `${periodStart} → ${periodEnd} is in draft.`, href: '/payroll', kind: 'payroll' },
      { userId: users[1]!._id, title: 'Leave awaiting approval', detail: 'Priya Patel requested 2 days of sick leave.', href: '/leaves', kind: 'leave' },
      { userId: users[1]!._id, title: 'Onboarding in progress', detail: 'Sam Rivera has 1 open onboarding task.', href: '/employees', kind: 'employee' },
      { userId: users[2]!._id, title: 'Leave awaiting your approval', detail: 'Diana Employee requested vacation leave.', href: '/leaves', kind: 'leave' },
      { userId: users[3]!._id, title: 'Payslip available', detail: 'Your payslip for the current period is ready.', href: '/payroll', kind: 'payroll' },
    ]);

    // The audit page is part of the product, so a fresh database shows a
    // realistic trail instead of an empty state that reads like a broken screen.
    // Written through the driver collection to keep the seeded timestamps.
    console.log('🌱 Seeding Audit Trail...');
    const day = 24 * 60 * 60 * 1000;
    const auditTrail = [
      { actorId: users[0]!._id, actorName: 'Alice Admin', action: 'organizationSetting.update', entity: 'OrganizationSetting', detail: 'PATCH /api/v1/organization-settings', daysAgo: 9 },
      { actorId: users[1]!._id, actorName: 'Bob HR', action: 'department.create', entity: 'Department', detail: 'POST /api/v1/departments', daysAgo: 8 },
      { actorId: users[1]!._id, actorName: 'Bob HR', action: 'jobPosting.create', entity: 'JobPosting', entityId: jobPosting._id.toString(), detail: 'POST /api/v1/job-postings', daysAgo: 6 },
      { actorId: users[0]!._id, actorName: 'Alice Admin', action: 'role.update', entity: 'Role', entityId: roles[1]!._id.toString(), detail: 'PATCH /api/v1/roles/:id', daysAgo: 5 },
      { actorId: users[1]!._id, actorName: 'Bob HR', action: 'document.create', entity: 'Document', entityId: contract._id.toString(), detail: 'POST /api/v1/documents', daysAgo: 4 },
      { actorId: users[3]!._id, actorName: 'Diana Employee', action: 'leaveRequest.create', entity: 'LeaveRequest', entityId: leaveRequest._id.toString(), detail: 'POST /api/v1/leave-requests', daysAgo: 3 },
      { actorId: users[1]!._id, actorName: 'Bob HR', action: 'payroll.create', entity: 'Payroll', entityId: payroll._id.toString(), detail: 'POST /api/v1/payroll', daysAgo: 2 },
      { actorId: users[0]!._id, actorName: 'Alice Admin', action: 'employee.update', entity: 'Employee', entityId: employeeEmp._id.toString(), detail: 'PATCH /api/v1/employees/:id', daysAgo: 1 },
    ];
    const now = Date.now();
    await AuditLog.collection.insertMany(
      auditTrail.map(({ daysAgo, ...entry }) => ({
        ...entry,
        createdAt: new Date(now - daysAgo * day),
      })),
    );

    console.log('🎉 Database seeded successfully!');
    console.log('👤 Accounts (all use Password123!):');
    for (const account of [
      'admin@techcorp.com   Admin    - sees everything',
      'hr@techcorp.com      HR       - payroll, people, leave',
      'manager@techcorp.com Manager  - own team only',
      'employee@techcorp.com Employee - own records only, reports to Charlie',
      'sam@techcorp.com     Employee - reports to Charlie (manager may read)',
      'priya@techcorp.com   Employee - Sales, no manager (other-record test)',
    ]) {
      console.log('   ' + account);
    }

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed.');
    process.exit(process.exitCode ?? 0);
  }
}

seedDatabase();

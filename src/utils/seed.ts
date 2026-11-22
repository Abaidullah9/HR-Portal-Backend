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

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/HR-DB';

async function seedDatabase() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    console.log('🧹 Clearing existing data...');
    await Promise.all([
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
    await OrganizationSetting.create({
      organizationName: 'TechCorp Solutions',
      email: 'admin@techcorp.com',
      phone: '+1-555-0198',
      address: '123 Innovation Drive, Tech City, TC 90210',
      workingDays: [1, 2, 3, 4, 5],
      lateAfter: '09:15',
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
    const hrActionIds = actionDocs
      .filter(a => hrModules.some(m => a.actionName.endsWith(`_${m}`)))
      .map(a => a._id);
    // Manager gets: Employee, Department, Attendance, Appraisal, Feedback, Team, LeaveRequest, PerformanceCycle
    const managerModules = ['Employee', 'Department', 'Attendance', 'Appraisal', 'Feedback', 'Team', 'LeaveRequest', 'PerformanceCycle'];
    const managerActionIds = actionDocs
      .filter(a => managerModules.some(m => a.actionName.endsWith(`_${m}`)))
      .map(a => a._id);
    // Employee gets: LeaveRequest, Feedback, Document, Attendance (but NOT approveReject).
    // Self-service views are authorised on actions Employee already holds, so no
    // extra read grants are needed here.
    const employeeModules = ['LeaveRequest', 'Feedback', 'Document', 'Attendance'];
    const employeeActionIds = actionDocs
      .filter(a => employeeModules.some(m => a.actionName.endsWith(`_${m}`)) && a.actionName !== 'approveReject_LeaveRequest')
      .map(a => a._id);

    const roles = await Role.insertMany([
      { roleName: 'Admin', actions: adminActionIds },
      { roleName: 'HR', actions: hrActionIds },
      { roleName: 'Manager', actions: managerActionIds },
      { roleName: 'Employee', actions: employeeActionIds },
    ]);

    console.log('🌱 Seeding Departments...');
    const departments = await Department.insertMany([
      { name: 'Engineering', description: 'Software development and IT' },
      { name: 'Human Resources', description: 'Recruitment, payroll, and employee relations' },
      { name: 'Sales', description: 'Revenue generation and client management' },
    ]);

    console.log('🌱 Seeding Users...');
    const hashedPassword = await bcrypt.hash('Password123!', 10);

    const orgSettings = await OrganizationSetting.findOne();
    const orgId = orgSettings!._id;

    const users = await User.insertMany([
      { name: 'Alice Admin', email: 'admin@techcorp.com', password: hashedPassword, roleId: roles[0]!._id, isActive: true },
      { name: 'Bob HR', email: 'hr@techcorp.com', password: hashedPassword, roleId: roles[1]!._id, isActive: true },
      { name: 'Charlie Manager', email: 'manager@techcorp.com', password: hashedPassword, roleId: roles[2]!._id, isActive: true },
      { name: 'Diana Employee', email: 'employee@techcorp.com', password: hashedPassword, roleId: roles[3]!._id, isActive: true },
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
      salary: 9500,
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
      salary: 7916.67,
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
      jobPostingId: jobPosting._id,
      name: 'Evan Candidate',
      email: 'evan@example.com',
      phone: '+1-555-0142',
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
      employeeId: employeeEmp._id,
      leaveType: 'vacation',
      totalAllocated: 20,
      used: 3,
      remaining: 17,
      year: 2024
    });

    await LeaveRequest.create({
      employeeId: employeeEmp._id,
      leaveType: 'vacation',
      fromDate: new Date('2024-12-20'),
      toDate: new Date('2024-12-24'),
      leaveStatus: 'pending',
      reasonForLeave: 'Winter holiday trip'
    });

    console.log('🌱 Seeding Attendance...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await Attendance.create({
      employeeId: employeeEmp._id,
      date: today,
      checkIn: new Date(today.getTime() + 9 * 60 * 60 * 1000),
      checkOut: new Date(today.getTime() + 17 * 60 * 60 * 1000),
    });

    console.log('🌱 Seeding Payroll...');
    const currentMonthStart = new Date();
    currentMonthStart.setDate(1);
    const currentMonthEnd = new Date(currentMonthStart);
    currentMonthEnd.setMonth(currentMonthStart.getMonth() + 1);
    currentMonthEnd.setDate(0);

    await EmployeePayroll.create({
      employeeId: employeeEmp._id,
      baseSalary: 7916.67,
      allowances: [{ type: 'transport', amount: 200, taxable: false }],
      deductions: [{ type: 'tax', amount: 1200, note: 'Monthly income tax' }],
      bonuses: [],
      netPay: 6916.67,
      payPeriodStart: currentMonthStart,
      payPeriodEnd: currentMonthEnd,
      paymentMethod: 'bank transfer',
      status: 'completed'
    });

    console.log('🌱 Seeding Appraisals & Feedback...');
    await Appraisal.create({
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
    await EmployeeDocument.create({
      employeeId: employeeEmp._id,
      name: 'Diana Contract.pdf',
      type: 'contract',
      fileUrl: 'https://example.com/documents/diana_contract.pdf',
      uploadedBy: users[1]!._id
    });

    console.log('🎉 Database seeded successfully!');
    console.log('👤 Test Login: admin@techcorp.com / Password123!');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed.');
    process.exit(0);
  }
}

seedDatabase();

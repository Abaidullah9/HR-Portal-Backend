import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
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
      Employee.deleteMany({}),
      User.deleteMany({}),
      Department.deleteMany({}),
      Role.deleteMany({}),
      Action.deleteMany({}),
      OrganizationSetting.deleteMany({}),
    ]);

    console.log('🌱 Seeding Organization Settings...');
    await OrganizationSetting.create({
      organizationName: 'TechCorp Solutions',
      email: 'admin@techcorp.com',
      phone: '+1-555-0198',
      address: '123 Innovation Drive, Tech City, TC 90210',
      workingDays: [1, 2, 3, 4, 5],
      logoUrl: 'https://example.com/logo.png'
    });

    console.log('🌱 Seeding Actions...');
    const actionDocs = await Action.insertMany([
      { actionName: 'view_dashboard', actionDescription: 'Can view main dashboard', module: 'general' },
      { actionName: 'manage_users', actionDescription: 'Can create, update, delete users', module: 'hr' },
      { actionName: 'approve_leave', actionDescription: 'Can approve or reject leave requests', module: 'hr' },
      { actionName: 'process_payroll', actionDescription: 'Can generate and process payroll', module: 'payroll' },
      { actionName: 'manage_postings', actionDescription: 'Can create and manage job postings', module: 'recruitment' },
    ]);

    console.log('🌱 Seeding Roles...');
    const adminActionIds = actionDocs.map(a => a._id);
    const hrActionIds = actionDocs
      .filter(a => ['view_dashboard', 'manage_users', 'approve_leave', 'manage_postings'].includes(a.actionName))
      .map(a => a._id);

    const managerActionIds = actionDocs
      .filter(a => a.actionName === 'view_dashboard' || a.actionName === 'approve_leave')
      .map(a => a._id);

    const employeeActionIds = actionDocs
      .filter(a => a.actionName === 'view_dashboard')
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

    const users = await User.insertMany([
      { name: 'Alice Admin', email: 'admin@techcorp.com', password: hashedPassword, roleId: roles[0]!._id, isActive: true },
      { name: 'Bob HR', email: 'hr@techcorp.com', password: hashedPassword, roleId: roles[1]!._id, isActive: true },
      { name: 'Charlie Manager', email: 'manager@techcorp.com', password: hashedPassword, roleId: roles[2]!._id, isActive: true },
      { name: 'Diana Employee', email: 'employee@techcorp.com', password: hashedPassword, roleId: roles[3]!._id, isActive: true },
    ]);

    console.log('🌱 Seeding Employees...');
    const managerEmp = await Employee.create({
      userId: users[2]!._id,
      employeeCode: 'EMP-0001',
      name: 'Charlie Manager',
      email: 'manager@techcorp.com',
      departmentId: departments[0]!._id,
      position: 'Engineering Manager',
      employmentType: 'full-time',
      isActive: true,
      joiningDate: new Date('2022-01-15'),
    });

    await Department.findByIdAndUpdate(departments[0]!._id, { managerId: managerEmp._id });

    const employeeEmp = await Employee.create({
      userId: users[3]!._id,
      employeeCode: 'EMP-0002',
      name: 'Diana Employee',
      email: 'employee@techcorp.com',
      departmentId: departments[0]!._id,
      reportingManagerId: managerEmp._id,
      position: 'Senior Software Engineer',
      employmentType: 'full-time',
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

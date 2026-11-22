import candidateModel from '../models/candidate.model';
import employeeModel from '../models/employee.model';
import jobPostingModel from '../models/jobPosting.model';
import organizationSettingModel from '../models/organizationSetting.model';
import { AppError } from '../utils/helper/AppError';
import { StatusCode } from '../utils/helper/constants/enum';
import { tenantFilter } from '../utils/context';
import { isDayKey, todayKey } from '../utils/dates';
import { inviteUser } from './user.services';
import checklistServices from './checklist.services';
import compensationServices from './compensation.services';

export interface HireInput {
  departmentId?: string;
  position?: string;
  salary?: number;
  employmentType?: 'full-time' | 'contract' | 'intern';
  joiningDate?: string;
  reportingManagerId?: string;
  employeeCode?: string;
}

/**
 * Converts a hired/offered candidate into a real employee.
 *
 * This is the step that used to mean retyping the candidate's name and email
 * into the employee form: the candidate carries the post and department, so the
 * employee record is derived from it and the candidate is marked hired with a
 * link back to the employee.
 */
export const hireCandidate = async (candidateId: string, input: HireInput = {}) => {
  const candidate = await candidateModel.findOne(tenantFilter({ _id: candidateId }));
  if (!candidate) throw new AppError('Candidate not found', StatusCode.NOT_FOUND);
  if (candidate.hiredEmployeeId) {
    throw new AppError('This candidate has already been converted to an employee', StatusCode.CONFLICT);
  }
  if (!['offered', 'hired', 'interview'].includes(candidate.status)) {
    throw new AppError('Move the candidate to offered before converting them', StatusCode.CONFLICT);
  }

  const posting = await jobPostingModel.findById(candidate.jobPostingId);
  const organizationId =
    (await organizationSettingModel.findOne().select('_id').lean())?._id?.toString() ?? undefined;

  const departmentId = input.departmentId ?? posting?.departmentId?.toString();
  if (!departmentId) throw new AppError('A department is required to hire this candidate', StatusCode.BAD_REQUEST);

  const position = input.position ?? posting?.position ?? candidate.offer?.position;
  if (!position) throw new AppError('A position is required to hire this candidate', StatusCode.BAD_REQUEST);

  const joiningDate = isDayKey(input.joiningDate ?? '')
    ? (input.joiningDate as string)
    : isDayKey(candidate.offer?.startDate ?? '')
      ? (candidate.offer?.startDate as string)
      : todayKey();

  const invite = await inviteUser(
    { name: candidate.name, email: candidate.email, roleName: 'Employee' },
    organizationId,
  );

  const existingCount = await employeeModel.countDocuments(organizationId ? { organizationId } : {});
  const employeeCode = input.employeeCode?.trim()
    || `EMP-${String(existingCount + 1).padStart(4, '0')}`;

  const employee = await employeeModel.create({
    ...(organizationId ? { organizationId } : {}),
    userId: invite.user._id,
    employeeCode,
    name: candidate.name,
    email: candidate.email,
    departmentId,
    position,
    employmentType: input.employmentType ?? 'full-time',
    joiningDate: new Date(`${joiningDate}T00:00:00.000Z`),
    isActive: true,
    ...(input.reportingManagerId ? { reportingManagerId: input.reportingManagerId } : {}),
    ...(input.salary && input.salary > 0 ? { salary: input.salary } : {}),
  });

  if (input.salary && input.salary > 0) {
    await compensationServices.recordCompensation({
      employeeId: employee._id.toString(),
      baseSalary: input.salary,
      effectiveFrom: joiningDate,
      reason: 'initial',
    });
  }

  await checklistServices.startChecklist(employee._id.toString(), 'onboarding', joiningDate);

  candidate.status = 'hired';
  candidate.hiredEmployeeId = employee._id;
  candidate.stageChangedAt = new Date();
  await candidate.save();

  return {
    employee,
    inviteLink: invite.inviteLink,
    delivered: invite.delivered,
    ...(process.env.NODE_ENV !== 'production' ? { inviteToken: invite.token } : {}),
  };
};

export default { hireCandidate };

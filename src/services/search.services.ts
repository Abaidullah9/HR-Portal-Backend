import employeeModel from '../models/employee.model';
import documentModel from '../models/document.model';
import candidateModel from '../models/candidate.model';
import jobPostingModel from '../models/jobPosting.model';
import { tenantFilter } from '../utils/context';
import type { ReadScope } from '../utils/helper/ownership';

export interface SearchHit {
  id: string;
  type: 'employee' | 'document' | 'candidate';
  title: string;
  subtitle: string;
  href: string;
}

/**
 * Global search behind the command palette. Results are limited to what the
 * caller's scope can already open: people outside the scope are not searchable,
 * and documents are only matched for their owner or an unrestricted reader.
 */
export const globalSearch = async (query: string, scope: ReadScope): Promise<SearchHit[]> => {
  const term = query.trim();
  if (term.length < 2) return [];
  const pattern = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

  const peopleFilter: Record<string, unknown> = tenantFilter({
    $or: [{ name: pattern }, { email: pattern }, { employeeCode: pattern }, { position: pattern }],
  });

  if (!scope.canReadAll) {
    const reachable = [scope.ownEmployeeId, ...(scope.managedEmployeeIds ?? [])].filter(
      (id): id is string => Boolean(id),
    );
    if (reachable.length === 0) return [];
    peopleFilter._id = { $in: reachable };
  }

  const [employees, documents, candidates] = await Promise.all([
    employeeModel.find(peopleFilter).select('name email employeeCode position').limit(5).lean(),
    documentModel
      .find(
        tenantFilter({
          name: pattern,
          ...(scope.canReadAll
            ? {}
            : { employeeId: { $in: [scope.ownEmployeeId, ...(scope.managedEmployeeIds ?? [])].filter(Boolean) } }),
        }),
      )
      .limit(3)
      .lean(),
    scope.canReadAll
      ? candidateModel.find(tenantFilter({ $or: [{ name: pattern }, { email: pattern }] })).limit(3).lean()
      : Promise.resolve([]),
  ]);

  const postingIds = candidates.map((candidate) => candidate.jobPostingId);
  const postings = postingIds.length
    ? await jobPostingModel.find({ _id: { $in: postingIds } }).select('position').lean()
    : [];
  const postingTitles = new Map(postings.map((posting) => [posting._id.toString(), posting.position]));

  return [
    ...employees.map((employee) => ({
      id: employee._id.toString(),
      type: 'employee' as const,
      title: employee.name,
      subtitle: [employee.position, employee.employeeCode].filter(Boolean).join(' · '),
      href: `/employees/${employee._id.toString()}`,
    })),
    ...documents.map((document) => ({
      id: document._id.toString(),
      type: 'document' as const,
      title: document.name,
      subtitle: `Document · ${document.type.replace(/_/g, ' ')}`,
      href: `/employees/${document.employeeId.toString()}`,
    })),
    ...candidates.map((candidate) => ({
      id: candidate._id.toString(),
      type: 'candidate' as const,
      title: candidate.name,
      subtitle: `Candidate · ${postingTitles.get(candidate.jobPostingId.toString()) ?? 'Recruitment'}`,
      href: '/recruitment',
    })),
  ];
};

export default { globalSearch };

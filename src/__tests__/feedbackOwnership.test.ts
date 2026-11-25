jest.mock('../models/feedback.model', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    findById: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
}));

import feedbackServices from '../services/feedback.services';
import type { ReadScope } from '../utils/helper/ownership';

const feedbackModel = jest.requireMock('../models/feedback.model').default as {
  find: jest.Mock;
  findById: jest.Mock;
  countDocuments: jest.Mock;
  create: jest.Mock;
  findByIdAndUpdate: jest.Mock;
  findByIdAndDelete: jest.Mock;
};

const OWN: ReadScope = { canReadAll: false, ownEmployeeId: 'emp-me' };
const HR: ReadScope = { canReadAll: true, roleName: 'hr' };

const queryChain = (rows: unknown[] = []) => {
  const chain: Record<string, jest.Mock> = {};
  for (const method of ['populate', 'skip', 'limit']) chain[method] = jest.fn().mockReturnValue(chain);
  chain.limit = jest.fn().mockResolvedValue(rows);
  return chain;
};

beforeEach(() => jest.clearAllMocks());

describe('feedback ownership', () => {
  it('limits the list to reviews the caller wrote or received', async () => {
    let captured: Record<string, unknown> = {};
    feedbackModel.find.mockImplementation((filter: Record<string, unknown>) => {
      captured = filter;
      return queryChain();
    });
    feedbackModel.countDocuments.mockResolvedValue(0);

    await feedbackServices.getAllFeedback({ page: '1', limit: '10' } as never, {
      ...OWN,
      managedEmployeeIds: ['emp-report'],
    });

    expect(captured.$or).toEqual([
      { targetEmployeeId: { $in: ['emp-me', 'emp-report'] } },
      { reviewerId: { $in: ['emp-me', 'emp-report'] } },
    ]);
  });

  it('leaves the list unfiltered for a company-wide reader', async () => {
    let captured: Record<string, unknown> = { untouched: true };
    feedbackModel.find.mockImplementation((filter: Record<string, unknown>) => {
      captured = filter;
      return queryChain();
    });
    feedbackModel.countDocuments.mockResolvedValue(0);

    await feedbackServices.getAllFeedback({ page: '1', limit: '10' } as never, HR);

    expect(captured).toEqual({});
  });

  it('hides a single review from someone it is not about', async () => {
    feedbackModel.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        targetEmployeeId: 'emp-other',
        reviewerId: 'emp-reviewer',
      }),
    });

    await expect(feedbackServices.getFeedbackById('f1', OWN)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('shows a single review to the person it is about', async () => {
    const review = {
      targetEmployeeId: 'emp-me',
      reviewerId: 'emp-reviewer',
    };
    feedbackModel.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(review) });

    await expect(feedbackServices.getFeedbackById('f1', OWN)).resolves.toBe(review);
  });

  it('refuses to file feedback in someone else’s name', async () => {
    await expect(
      feedbackServices.addFeedback(
        { reviewerId: 'emp-colleague', targetEmployeeId: 'emp-me', comment: 'x' } as never,
        OWN,
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(feedbackModel.create).not.toHaveBeenCalled();
  });

  it('refuses an edit by anyone but the author', async () => {
    feedbackModel.findById.mockResolvedValue({
      targetEmployeeId: 'emp-me',
      reviewerId: 'emp-colleague',
    });

    await expect(
      feedbackServices.updateFeedback('f1', { comment: 'rewritten' } as never, OWN),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(feedbackModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('lets the author delete their own review', async () => {
    feedbackModel.findById.mockResolvedValue({
      targetEmployeeId: 'emp-me',
      reviewerId: 'emp-me',
    });
    feedbackModel.findByIdAndDelete.mockResolvedValue({ _id: 'f1' });

    await expect(feedbackServices.deleteFeedback('f1', OWN)).resolves.toEqual({ _id: 'f1' });
  });
});

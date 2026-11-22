jest.mock('../models/leaveBalance.model', () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn(),
}));

import leaveBalanceServices from '../services/leaveBalance.services';

const balanceDoc = (overrides: Record<string, unknown> = {}) => ({
  accrualRate: 2,
  totalAllocated: 20,
  used: 4,
  remaining: 4,
  year: 2026,
  lastAccruedAt: new Date(2026, 0, 15),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('Leave accrual', () => {
  let leaveBalanceModel: any;

  beforeEach(() => {
    jest.clearAllMocks();
    leaveBalanceModel = require('../models/leaveBalance.model');
  });

  it('adds one month of accrual per elapsed month', async () => {
    const balance = balanceDoc();
    leaveBalanceModel.find.mockResolvedValue([balance]);

    const result = await leaveBalanceServices.accrueLeaveBalances(new Date(2026, 2, 15));

    expect(balance.remaining).toBe(8); // 4 + 2 months x 2 days
    expect(balance.save).toHaveBeenCalled();
    expect(result.updated).toBe(1);
  });

  it('never accrues past the unused entitlement', async () => {
    const balance = balanceDoc({ remaining: 15 });
    leaveBalanceModel.find.mockResolvedValue([balance]);

    await leaveBalanceServices.accrueLeaveBalances(new Date(2026, 5, 15));

    expect(balance.remaining).toBe(16); // capped at totalAllocated(20) - used(4)
  });

  it('does nothing when no full month has passed', async () => {
    const balance = balanceDoc();
    leaveBalanceModel.find.mockResolvedValue([balance]);

    const result = await leaveBalanceServices.accrueLeaveBalances(new Date(2026, 0, 20));

    expect(balance.remaining).toBe(4);
    expect(balance.save).not.toHaveBeenCalled();
    expect(result.updated).toBe(0);
  });

  it('drains remaining by the days taken instead of recomputing it', async () => {
    const balance = balanceDoc({ remaining: 6, used: 4, totalAllocated: 20 });
    leaveBalanceModel.findOne.mockReturnValue({
      session: jest.fn().mockResolvedValue(balance),
    });

    await leaveBalanceServices.deductLeaveBalance('emp1', 'vacation', 2026, 2);

    expect(balance.used).toBe(6);
    expect(balance.remaining).toBe(4);
  });
});

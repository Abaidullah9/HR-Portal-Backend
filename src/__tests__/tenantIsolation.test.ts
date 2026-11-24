jest.mock('../models/employee.model', () => ({
  find: jest.fn(() => ({
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue([]),
  })),
  countDocuments: jest.fn().mockResolvedValue(0),
  findOne: jest.fn(),
}));

import { Types } from 'mongoose';
import { runWithContext, tenantFields, tenantFilter } from '../utils/context';
import employeeServices from '../services/employee.services';

const ORG_A = '64b7f0c2f1a2b3c4d5e6f7a8';
const ORG_B = '64b7f0c2f1a2b3c4d5e6f7b9';

describe('tenant isolation', () => {
  let employeeModel: any;

  beforeEach(() => {
    jest.clearAllMocks();
    employeeModel = require('../models/employee.model');
  });

  it('scopes a list query to the session organisation as an ObjectId', async () => {
    await runWithContext({ requestId: 'r1', userId: 'u1', organizationId: ORG_A }, async () => {
      await employeeServices.getAllEmployee({});
    });

    const filter = employeeModel.find.mock.calls[0][0] as Record<string, unknown>;
    const organisation = filter.organizationId as Types.ObjectId;

    // A string here would be cast by `find` but never match inside an
    // aggregation pipeline — the regression that emptied the analytics panels.
    expect(organisation).toBeInstanceOf(Types.ObjectId);
    expect(organisation.toString()).toBe(ORG_A);
    expect(organisationsIn(employeeModel)).toEqual([ORG_A]);
  });

  it('never filters on another organisation', async () => {
    await runWithContext({ requestId: 'r2', userId: 'u2', organizationId: ORG_B }, async () => {
      await employeeServices.getAllEmployee({});
    });

    expect(organisationsIn(employeeModel)).toEqual([ORG_B]);
  });

  it('leaves background work (seed, scripts) unscoped', async () => {
    await employeeServices.getAllEmployee({});
    const filter = employeeModel.find.mock.calls[0][0] as Record<string, unknown>;
    expect(filter).not.toHaveProperty('organizationId');
    expect(tenantFilter()).toEqual({});
    expect(tenantFields()).toEqual({});
  });

  it('fails closed when a request has no organisation', async () => {
    await runWithContext({ requestId: 'r3', userId: 'u3' }, async () => {
      expect(tenantFilter({ isActive: true })).toMatchObject({ organizationId: null });
      expect(tenantFields()).toEqual({});
    });
  });
});

/** Every organisation value passed to the employee model during a test. */
const organisationsIn = (model: any): string[] =>
  model.find.mock.calls
    .map((call: any[]) => call[0]?.organizationId)
    .filter(Boolean)
    .map((value: Types.ObjectId | string) => value.toString());

// Mock models before importing the helper.
jest.mock('../models/user.model', () => ({ findById: jest.fn() }));
jest.mock('../models/role.model', () => ({ findById: jest.fn() }));
jest.mock('../models/employee.model', () => ({ findOne: jest.fn(), find: jest.fn() }));

import { resolveReadScope } from '../utils/helper/ownership';

describe('resolveReadScope', () => {
  let userModel: any;
  let roleModel: any;
  let employeeModel: any;

  beforeEach(() => {
    jest.clearAllMocks();
    userModel = require('../models/user.model');
    roleModel = require('../models/role.model');
    employeeModel = require('../models/employee.model');
  });

  it('grants canReadAll to Admin without looking up an employee', async () => {
    userModel.findById.mockResolvedValue({ _id: 'u1', roleId: 'r1' });
    roleModel.findById.mockResolvedValue({ roleName: 'Admin' });

    const scope = await resolveReadScope('u1');
    expect(scope).toMatchObject({ canReadAll: true });
    expect(employeeModel.findOne).not.toHaveBeenCalled();
  });

  it('grants canReadAll to HR', async () => {
    userModel.findById.mockResolvedValue({ _id: 'u2', roleId: 'r2' });
    roleModel.findById.mockResolvedValue({ roleName: 'HR' });

    const scope = await resolveReadScope('u2');
    expect(scope).toMatchObject({ canReadAll: true });
  });

  it('scopes a Manager to their own employee record', async () => {
    userModel.findById.mockResolvedValue({ _id: 'u3', roleId: 'r3' });
    roleModel.findById.mockResolvedValue({ roleName: 'Manager' });
    employeeModel.findOne.mockResolvedValue({ _id: 'emp9' });
    employeeModel.find.mockReturnValue({ select: jest.fn().mockResolvedValue([{ _id: 'emp10' }]) });

    const scope = await resolveReadScope('u3');
    expect(scope).toMatchObject({
      canReadAll: false,
      ownEmployeeId: 'emp9',
      managedEmployeeIds: ['emp10'],
    });
    expect(employeeModel.findOne).toHaveBeenCalledWith({ userId: 'u3' });
  });

  it('returns canReadAll false without an employee record', async () => {
    userModel.findById.mockResolvedValue({ _id: 'u4', roleId: 'r4' });
    roleModel.findById.mockResolvedValue({ roleName: 'Manager' });
    employeeModel.findOne.mockResolvedValue(null);

    const scope = await resolveReadScope('u4');
    expect(scope.canReadAll).toBe(false);
    expect(scope.ownEmployeeId).toBeUndefined();
  });

  it('returns canReadAll false for an unknown user', async () => {
    userModel.findById.mockResolvedValue(null);
    const scope = await resolveReadScope('missing');
    expect(scope).toEqual({ canReadAll: false });
  });
});
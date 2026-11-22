jest.mock('../models/employee.model', () => ({
  find: jest.fn(),
  countDocuments: jest.fn(),
  findById: jest.fn(),
}));

import employeeServices from '../services/employee.services';

describe('Employee services', () => {
  let employeeModel: any;

  beforeEach(() => {
    jest.clearAllMocks();
    employeeModel = require('../models/employee.model');
  });

  const chain = (rows: any[]) => {
    const obj: any = { populate: jest.fn(), sort: jest.fn(), skip: jest.fn(), limit: jest.fn() };
    obj.populate.mockReturnValue(obj);
    // Sorting moved into the database so it covers the whole collection.
    obj.sort.mockReturnValue(obj);
    obj.skip.mockReturnValue(obj);
    obj.limit.mockResolvedValue(rows);
    return obj;
  };

  it('getAllEmployee returns an unfiltered page when no search is given', async () => {
    let capturedFilter: any;
    let capturedCount: any;
    employeeModel.find.mockImplementation((f: any) => {
      capturedFilter = f;
      return chain([]);
    });
    employeeModel.countDocuments.mockImplementation((f: any) => {
      capturedCount = f;
      return Promise.resolve(0);
    });

    await employeeServices.getAllEmployee({ page: '1', limit: '10' } as any);

    expect(capturedFilter).toEqual({});
    expect(capturedCount).toEqual({});
  });

  it('getAllEmployee builds a case-insensitive search across name, email, code and position', async () => {
    let capturedFilter: any;
    let capturedCount: any;
    employeeModel.find.mockImplementation((f: any) => {
      capturedFilter = f;
      return chain([]);
    });
    employeeModel.countDocuments.mockImplementation((f: any) => {
      capturedCount = f;
      return Promise.resolve(0);
    });

    await employeeServices.getAllEmployee({ page: '1', limit: '10', search: 'john' } as any);

    expect(capturedFilter.$or).toHaveLength(4);
    const fields = capturedFilter.$or.map((clause: any) => Object.keys(clause)[0]);
    expect(fields).toEqual(['name', 'email', 'employeeCode', 'position']);
    for (const clause of capturedFilter.$or) {
      const value = Object.values(clause)[0] as RegExp;
      expect(value).toBeInstanceOf(RegExp);
      expect(value.flags).toContain('i');
    }
    expect(capturedCount).toEqual(capturedFilter);
  });

  it('getAllEmployee escapes regex metacharacters in the search term', async () => {
    let capturedFilter: any;
    employeeModel.find.mockImplementation((f: any) => {
      capturedFilter = f;
      return chain([]);
    });
    employeeModel.countDocuments.mockResolvedValue(0);

    await employeeServices.getAllEmployee({ page: '1', limit: '10', search: 'a.b*c' } as any);

    const patterns = capturedFilter.$or.map((clause: any) => (Object.values(clause)[0] as RegExp).source);
    for (const pattern of patterns) {
      expect(pattern).not.toContain('.*');
    }
  });

  it('getAllEmployee ignores a blank search', async () => {
    let capturedFilter: any;
    employeeModel.find.mockImplementation((f: any) => {
      capturedFilter = f;
      return chain([]);
    });
    employeeModel.countDocuments.mockResolvedValue(0);

    await employeeServices.getAllEmployee({ page: '1', limit: '10', search: '   ' } as any);

    expect(capturedFilter).toEqual({});
  });
});
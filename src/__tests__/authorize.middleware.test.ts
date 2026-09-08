// Mock models before importing middleware
jest.mock('../models/role.model', () => ({
  findById: jest.fn(),
}));

jest.mock('../models/action.model', () => ({}));

describe('Authorize Middleware', () => {
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: { roleId: 'role123' },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  it('should return 401 when user is not set', async () => {
    req.user = undefined;
    const { authorize } = require('../middlewares/authorize.middleware');
    const middleware = authorize('read_User');
    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    const error = next.mock.calls[0][0];
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('Not authenticated');
  });

  it('should return 403 when role is not found', async () => {
    const roleModel = require('../models/role.model');
    roleModel.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue(null),
    });

    const { authorize } = require('../middlewares/authorize.middleware');
    const middleware = authorize('read_User');
    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    const error = next.mock.calls[0][0];
    expect(error.statusCode).toBe(403);
    expect(error.message).toBe('Role not found');
  });

  it('should return 403 when user lacks permission', async () => {
    const roleModel = require('../models/role.model');
    roleModel.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        actions: [{ actionName: 'write_User' }],
      }),
    });

    const { authorize } = require('../middlewares/authorize.middleware');
    const middleware = authorize('read_User');
    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    const error = next.mock.calls[0][0];
    expect(error.statusCode).toBe(403);
    expect(error.message).toContain('Not authorized');
  });

  it('should call next when user has permission', async () => {
    const roleModel = require('../models/role.model');
    roleModel.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        actions: [{ actionName: 'read_User' }],
      }),
    });

    const { authorize } = require('../middlewares/authorize.middleware');
    const middleware = authorize('read_User');
    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith();
  });
});

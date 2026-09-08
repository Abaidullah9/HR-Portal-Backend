// Mock models before importing middleware
jest.mock('../models/user.model', () => ({
  findOne: jest.fn(),
}));

jest.mock('../models/role.model', () => ({
  findById: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

import { Request, Response, NextFunction } from 'express';

describe('Auth Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      cookies: {},
      headers: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  describe('isAuthenticated', () => {
    it('should return 401 when no token is provided', async () => {
      const { isAuthenticated } = require('../middlewares/auth.middleware');
      await isAuthenticated(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should call next when valid token is provided', async () => {
      const jwt = require('jsonwebtoken');
      const userModel = require('../models/user.model');

      jwt.verify.mockReturnValue({ userId: '123' });
      userModel.findOne.mockResolvedValue({ _id: '123', isActive: true });

      req.cookies = { accessToken: 'valid-token' };

      const { isAuthenticated } = require('../middlewares/auth.middleware');
      await isAuthenticated(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.userId).toBe('123');
    });

    it('should accept Bearer token from header', async () => {
      const jwt = require('jsonwebtoken');
      const userModel = require('../models/user.model');

      jwt.verify.mockReturnValue({ userId: '456' });
      userModel.findOne.mockResolvedValue({ _id: '456', isActive: true });

      req.headers = { authorization: 'Bearer valid-token' };

      const { isAuthenticated } = require('../middlewares/auth.middleware');
      await isAuthenticated(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(req.userId).toBe('456');
    });
  });

  describe('isAdmin', () => {
    it('should return 401 when user is not set', async () => {
      const { isAdmin } = require('../middlewares/auth.middleware');
      req.user = undefined;
      await isAdmin(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should call next when user is admin', async () => {
      const roleModel = require('../models/role.model');

      req.user = { roleId: 'role123' };
      roleModel.findById.mockResolvedValue({ roleName: 'admin' });

      const { isAdmin } = require('../middlewares/auth.middleware');
      await isAdmin(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });
  });
});

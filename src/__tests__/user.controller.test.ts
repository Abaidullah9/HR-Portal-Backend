// Mock services before importing controller
jest.mock('../services/user.services', () => ({
  registerUser: jest.fn(),
  loginUser: jest.fn(),
  getAllUser: jest.fn(),
  getUserById: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
  updateUserStatus: jest.fn(),
  updateUserRole: jest.fn(),
}));

import { Request, Response } from 'express';

describe('User Controller', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      body: {},
      params: {},
      query: {},
      cookies: {},
      headers: {},
      userId: 'user123',
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };
  });

  describe('loginUser', () => {
    it('should login user and set cookie', async () => {
      const userServices = require('../services/user.services');
      userServices.loginUser.mockResolvedValue({
        user: { _id: '123', email: 'test@test.com' },
        token: 'jwt-token',
      });

      req.body = { email: 'test@test.com', password: 'password123' };

      const userController = require('../controllers/user.controller').default;
      await userController.loginUser(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.cookie).toHaveBeenCalledWith('accessToken', 'jwt-token', expect.objectContaining({
        httpOnly: true,
      }));
    });
  });

  describe('logoutUser', () => {
    it('should clear the access token cookie', async () => {
      const userController = require('../controllers/user.controller').default;
      await userController.logoutUser(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      // Browsers match a deletion on the cookie name and its path.
      expect(res.clearCookie).toHaveBeenCalledWith('accessToken', { path: '/' });
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      const userServices = require('../services/user.services');
      userServices.getUserById.mockResolvedValue({ _id: '123', name: 'Test User' });

      req.params = { _id: '123' };

      const userController = require('../controllers/user.controller').default;
      await userController.getUserById(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: { _id: '123', name: 'Test User' },
      }));
    });
  });

  describe('getMe', () => {
    it('should return current user', async () => {
      const userServices = require('../services/user.services');
      userServices.getUserById.mockResolvedValue({ _id: 'user123', name: 'Current User' });

      const userController = require('../controllers/user.controller').default;
      await userController.getMe(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(userServices.getUserById).toHaveBeenCalledWith('user123');
    });
  });
});

import { AppError } from '../utils/helper/AppError';

describe('AppError', () => {
  it('should create an error with statusCode', () => {
    const error = new AppError('Not found', 404);
    expect(error.message).toBe('Not found');
    expect(error.statusCode).toBe(404);
    expect(error.isOperational).toBe(true);
  });

  it('should set isOperational to false when specified', () => {
    const error = new AppError('System error', 500, false);
    expect(error.isOperational).toBe(false);
  });

  it('should be an instance of Error', () => {
    const error = new AppError('Test', 400);
    expect(error).toBeInstanceOf(Error);
  });
});

describe('sendErrorResponse', () => {
  let res: any;

  beforeEach(() => {
    jest.clearAllMocks();
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    process.env.NODE_ENV = 'development';
  });

  it('should handle CastError', () => {
    const { sendErrorResponse } = require('../utils/helper/sendError');
    const error = { name: 'CastError', message: 'Invalid ObjectId' };

    sendErrorResponse(res, error);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: 'Invalid ID format. Please provide a valid identifier.',
    }));
  });

  it('should handle ValidationError', () => {
    const { sendErrorResponse } = require('../utils/helper/sendError');
    const error = { name: 'ValidationError', message: 'Validation failed' };

    sendErrorResponse(res, error);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: 'Validation failed',
    }));
  });

  it('should handle duplicate key error (code 11000)', () => {
    const { sendErrorResponse } = require('../utils/helper/sendError');
    const error = { code: 11000, message: 'Duplicate key' };

    sendErrorResponse(res, error);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: 'Duplicate value. This record already exists.',
    }));
  });

  it('should handle AppError with custom statusCode', () => {
    const { sendErrorResponse } = require('../utils/helper/sendError');
    const error = new AppError('Custom error', 422);

    sendErrorResponse(res, error);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: 'Custom error',
    }));
  });

  it('should default to 500 for unknown errors', () => {
    const { sendErrorResponse } = require('../utils/helper/sendError');
    const error = new Error('Unknown error');

    sendErrorResponse(res, error);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: 'Unknown error',
    }));
  });

  it('should include stack trace in development', () => {
    const { sendErrorResponse } = require('../utils/helper/sendError');
    const error = new AppError('Test error', 400);

    sendErrorResponse(res, error);

    const callArgs = res.json.mock.calls[0][0];
    expect(callArgs).toHaveProperty('stack');
  });

  it('should hide stack trace in production', () => {
    process.env.NODE_ENV = 'production';
    const { sendErrorResponse } = require('../utils/helper/sendError');
    const error = new AppError('Test error', 400);

    sendErrorResponse(res, error);

    const callArgs = res.json.mock.calls[0][0];
    expect(callArgs.stack).toBeUndefined();
  });
});

describe('errorHandler middleware', () => {
  it('should call sendErrorResponse', () => {
    const { sendErrorResponse } = require('../utils/helper/sendError');
    const spy = jest.spyOn(require('../utils/helper/sendError'), 'sendErrorResponse');

    const errorHandler = require('../middlewares/error.middleware').default;
    const error = new Error('Test');
    const req = {};
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    errorHandler(error, req, res, next);

    expect(spy).toHaveBeenCalledWith(res, error);
  });
});

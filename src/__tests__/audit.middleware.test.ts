jest.mock('../utils/helper/audit', () => ({
  recordAudit: jest.fn().mockResolvedValue(undefined),
}));

import { NextFunction, Request, Response } from 'express';
import { auditMutations } from '../middlewares/audit.middleware';
import { recordAudit } from '../utils/helper/audit';

/** Minimal stand-in that lets a test fire the response's finish event. */
const buildResponse = (locals: Record<string, unknown> = {}): { res: Response; finish: () => void } => {
  let onFinish: (() => void) | undefined;
  const res = {
    statusCode: 200,
    locals,
    on: (event: string, handler: () => void) => {
      if (event === 'finish') onFinish = handler;
      return res;
    },
  };
  return { res: res as unknown as Response, finish: () => onFinish?.() };
};

const buildRequest = (overrides: Partial<Request>): Request => ({
  method: 'POST',
  originalUrl: '/api/v1/employees',
  params: {},
  body: {},
  userId: 'actor-1',
  ...overrides,
} as unknown as Request);

describe('auditMutations', () => {
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    next = jest.fn();
  });

  it('records a successful mutation', () => {
    const { res, finish } = buildResponse();

    auditMutations(buildRequest({}), res, next);
    finish();

    expect(next).toHaveBeenCalled();
    expect(recordAudit).toHaveBeenCalledWith(
      'actor-1',
      expect.objectContaining({ action: 'employee.post', entity: 'Employee', detail: 'POST /api/v1/employees' }),
    );
  });

  it('records the id of the record that was changed', () => {
    const { res, finish } = buildResponse();

    auditMutations(
      buildRequest({ method: 'PATCH', originalUrl: '/api/v1/leave-requests/abc123', params: { _id: 'abc123' } }),
      res,
      next,
    );
    finish();

    expect(recordAudit).toHaveBeenCalledWith(
      'actor-1',
      expect.objectContaining({ action: 'leaveRequest.patch', entityId: 'abc123' }),
    );
  });

  it('ignores read requests', () => {
    const { res, finish } = buildResponse();

    auditMutations(buildRequest({ method: 'GET' }), res, next);
    finish();

    expect(recordAudit).not.toHaveBeenCalled();
  });

  it('ignores failed mutations', () => {
    const { res, finish } = buildResponse();
    res.statusCode = 422;

    auditMutations(buildRequest({}), res, next);
    finish();

    expect(recordAudit).not.toHaveBeenCalled();
  });

  it('stays quiet when a controller already recorded a richer entry', () => {
    const { res, finish } = buildResponse({ auditRecorded: true });

    auditMutations(buildRequest({}), res, next);
    finish();

    expect(recordAudit).not.toHaveBeenCalled();
  });

  it('does not attribute anonymous mutations', () => {
    const { res, finish } = buildResponse();

    auditMutations(buildRequest({ userId: undefined }), res, next);
    finish();

    expect(recordAudit).not.toHaveBeenCalled();
  });
});

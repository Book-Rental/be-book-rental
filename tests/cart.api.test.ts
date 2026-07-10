import { describe, it, expect, vi, beforeEach } from 'vitest';

import { auth } from '../src/middlewares/authMiddleware';
import type { AuthRequest } from '../src/middlewares/authMiddleware';
import { JWT_TOKEN_NAME, Messages } from '../src/utils/constants';

vi.mock('../src/utils/jwt', () => ({
  verifyToken: vi.fn(),
}));

vi.mock('../src/utils/response', () => ({
  failResponse: vi.fn(),
  successResponse: vi.fn(),
}));

import { verifyToken } from '../src/utils/jwt';
import { failResponse } from '../src/utils/response';

describe('Cart API auth middleware (unit tests)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when cookie token is missing', async () => {
    const req = { cookies: {} } as any as AuthRequest;
    const res = {} as any;
    const next = vi.fn();

    await auth(req, res, next);

    expect(failResponse).toHaveBeenCalled();
    const [, message, statusCode] = (failResponse as any).mock.calls[0];
    expect(message).toBe(Messages.Not_Authorized_No_Token);
    expect(statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token is invalid', async () => {
    (verifyToken as any).mockRejectedValue({ name: 'JsonWebTokenError' });

    const req = { cookies: { [JWT_TOKEN_NAME]: 'bad-token' } } as any as AuthRequest;
    const res = {} as any;
    const next = vi.fn();

    await auth(req, res, next);

    const [, message, statusCode] = (failResponse as any).mock.calls[0];
    expect(message).toBe(Messages.Invalid_Token);
    expect(statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token is expired', async () => {
    // Uses the exact err.name value that authMiddleware checks.
    (verifyToken as any).mockRejectedValue({ name: Messages.Token_Expired_Error });

    const req = { cookies: { [JWT_TOKEN_NAME]: 'expired' } } as any as AuthRequest;
    const res = {} as any;
    const next = vi.fn();

    await auth(req, res, next);

    const [, message, statusCode] = (failResponse as any).mock.calls[0];
    expect(message).toBe(Messages.Token_Expired);
    expect(statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });


  it('returns 401 when verifyToken throws an error-like object (err exists, err.name !== Token_Expired_Error)', async () => {
    // Exercises catch branch where `err` is truthy and `err.name` is not Token_Expired_Error.
    (verifyToken as any).mockRejectedValue({ name: 'SomeOtherJwtError' });

    const req = { cookies: { [JWT_TOKEN_NAME]: 'some-token' } } as any as AuthRequest;
    const res = {} as any;
    const next = vi.fn();

    await auth(req, res, next);

    const [, message, statusCode] = (failResponse as any).mock.calls[0];
    expect(message).toBe(Messages.Invalid_Token);
    expect(statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('does not call next when verifyToken throws a falsy value (covers `if (err)` false branch)', async () => {
    // authMiddleware has: `catch (err: any) { if (err) { ... } }`
    // This forces the `if (err)` condition to be false.
    (verifyToken as any).mockRejectedValue(undefined);

    const req = { cookies: { [JWT_TOKEN_NAME]: 'some-token' } } as any as AuthRequest;
    const res = {} as any;
    const next = vi.fn();

    await auth(req, res, next);

    // When err is falsy, authMiddleware currently does not return failResponse.
    // We assert that it didn't call next.
    expect(next).not.toHaveBeenCalled();
  });



  it('sets req.user and calls next when token is valid', async () => {
    const payload = { id: '507f1f77bcf86cd799439011' };
    (verifyToken as any).mockResolvedValue(payload);

    const req = { cookies: { [JWT_TOKEN_NAME]: 'valid-token' } } as any as AuthRequest;
    const res = {} as any;
    const next = vi.fn();

    await auth(req, res, next);

    expect(req.user).toEqual(payload);
    expect(next).toHaveBeenCalledTimes(1);
  });
});


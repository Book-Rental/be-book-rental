import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getBooksBySellerId } from '../src/controllers/bookController';
import * as bookService from '../src/services/bookService';
import * as responseUtils from '../src/utils/response';
import { StatusCode } from '../src/utils/StatusCodes';
import { Messages } from '../src/utils/constants';

vi.mock('../src/services/bookService', () => ({
  getBooksBySellerIdService: vi.fn(),
}));

vi.mock('../src/utils/response', () => ({
  successResponse: vi.fn(),
  failResponse: vi.fn(),
  errorResponse: vi.fn(),
}));

describe('books - getBooksBySellerId endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 and books when sellerId is valid and service succeeds', async () => {
    const sellerId = '507f1f77bcf86cd799439011';
    const books = [{ _id: '1', sellerId }];

    (bookService.getBooksBySellerIdService as any).mockResolvedValue(books);

    const req: any = { params: { sellerId } };
    const res: any = {};

    await getBooksBySellerId(req, res);

    expect(responseUtils.successResponse).toHaveBeenCalledTimes(1);
    expect(responseUtils.successResponse).toHaveBeenCalledWith(
      res,
      { books },
      'Books fetched successfully',
      StatusCode.OK
    );
  });

  it('returns 400 when service throws', async () => {
    const sellerId = '507f1f77bcf86cd799439011';
    const err = new Error('DB failure');

    (bookService.getBooksBySellerIdService as any).mockRejectedValue(err);

    const req: any = { params: { sellerId } };
    const res: any = {};

    await getBooksBySellerId(req, res);

    expect(responseUtils.failResponse).toHaveBeenCalledTimes(1);
    expect(responseUtils.failResponse).toHaveBeenCalledWith(
      res,
      'DB failure',
      StatusCode.Bad_Request
    );
  });

  it('still returns 400 when sellerId is missing (controller relies on service validation)', async () => {
    (bookService.getBooksBySellerIdService as any).mockRejectedValue(
      new Error(Messages.Invalid_UserId)
    );

    const req: any = { params: {} };
    const res: any = {};

    await getBooksBySellerId(req, res);

    expect(responseUtils.failResponse).toHaveBeenCalledTimes(1);
    expect(responseUtils.failResponse).toHaveBeenCalledWith(
      res,
      Messages.Invalid_UserId,
      StatusCode.Bad_Request
    );
  });
});


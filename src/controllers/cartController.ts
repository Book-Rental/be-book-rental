import { Request, Response } from "express";
import {
  addItemToCartService,
  clearCartService,
  getCartByUserIdService,
  removeItemFromCartService,
  updateCartItemQuantityService,
  validateCartService,
} from "../services/cartService";
import { failResponse, successResponse } from "../utils/response";
import { StatusCode } from "../utils/StatusCodes";
import { Messages } from "../utils/constants";

interface AuthenticatedRequest extends Request {
    user?: any;
}

const getAuthenticatedUserId = (req: AuthenticatedRequest): string | null => {
    const user = req.user;
    return user?.id || user?._id || user?.userId || null;
};

export const getCart = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId)
      return failResponse(res, Messages.Unauthorized_User, StatusCode.Unauthorized);

    const cart = await getCartByUserIdService(userId);
    const cartData = cart ?? { userId, items: [] };

    return successResponse(res, cartData, Messages.Cart_Fetched, StatusCode.OK);
  } catch (err: any) {
    return failResponse(res, err?.message || Messages.Cart_Fetch_Failed, StatusCode.Bad_Request);
  }
};

export const addItemToCart = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId)
      return failResponse(res, Messages.Unauthorized_User, StatusCode.Unauthorized);

    const { bookId, quantity, pricingMode, rentalPeriod } = req.body;
    if (!bookId) return failResponse(res, Messages.BookId_Required, StatusCode.Bad_Request);

    const qty = quantity !== undefined ? Number(quantity) : 1;
    if (Number.isNaN(qty) || qty < 1)
      return failResponse(res, Messages.Quantity_Minimum_One, StatusCode.Bad_Request);

    const updatedCart = await addItemToCartService(userId, bookId, qty, pricingMode, rentalPeriod);
    return successResponse(res, updatedCart, Messages.Cart_Item_Added, StatusCode.OK);
  } catch (err: any) {
    return failResponse(res, err?.message || Messages.Cart_Add_Item_Failed, StatusCode.Bad_Request);
  }
};

export const removeItemFromCart = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId)
      return failResponse(res, Messages.Unauthorized_User, StatusCode.Unauthorized);

    const bookId = req.params.bookId as string;
    const { pricingMode, rentalPeriod } = req.body;
    if (!bookId) return failResponse(res, Messages.BookId_Required, StatusCode.Bad_Request);

    const updatedCart = await removeItemFromCartService(userId, bookId, pricingMode, rentalPeriod);
    return successResponse(res, updatedCart, Messages.Cart_Item_Removed, StatusCode.OK);
  } catch (err: any) {
    return failResponse(res, err?.message || Messages.Cart_Remove_Item_Failed, StatusCode.Bad_Request);
  }
};

export const patchCartItemQuantity = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId)
      return failResponse(res, Messages.Unauthorized_User, StatusCode.Unauthorized);

    const bookId = req.params.bookId as string;
    if (!bookId) return failResponse(res, Messages.BookId_Required, StatusCode.Bad_Request);

    const { quantity, pricingMode, rentalPeriod } = req.body;
    const qty = quantity !== undefined ? Number(quantity) : NaN;

    if (Number.isNaN(qty) || qty < 0)
      return failResponse(res, Messages.Quantity_Invalid, StatusCode.Bad_Request);

    if (qty === 0) {
      const updatedCart = await removeItemFromCartService(userId, bookId, pricingMode, rentalPeriod);
      return successResponse(res, updatedCart, Messages.Cart_Item_Removed, StatusCode.OK);
    }

    const updatedCart = await updateCartItemQuantityService(userId, bookId, qty, pricingMode, rentalPeriod);
    return successResponse(res, updatedCart, Messages.Cart_Item_Updated, StatusCode.OK);
  } catch (err: any) {
    return failResponse(res, err?.message || Messages.Cart_Update_Item_Failed, StatusCode.Bad_Request);
  }
};

export const clearCart = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId)
      return failResponse(res, Messages.Unauthorized_User, StatusCode.Unauthorized);

    const cleared = await clearCartService(userId);
    return successResponse(res, cleared, Messages.Cart_Cleared, StatusCode.OK);
  } catch (err: any) {
    return failResponse(res, err?.message || Messages.Cart_Clear_Failed, StatusCode.Bad_Request);
  }
};

export const validateCart = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return failResponse(res, Messages.Unauthorized_User, StatusCode.Unauthorized);
    }

    const validation = await validateCartService(userId);
    return successResponse(res, validation, Messages.Cart_Valid, StatusCode.OK);
  } catch (err: any) {
    return failResponse(res, err?.message || Messages.Cart_Fetch_Failed, StatusCode.Bad_Request);
  }
};


import { Request, Response } from "express";
import {
  addItemToCartService,
  clearCartService,
  getCartByUserIdService,
  removeItemFromCartService,
  updateCartItemQuantityService,
} from "../services/cartService";
import { failResponse, successResponse } from "../utils/response";
import { StatusCode } from "../utils/StatusCodes";

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
    if (!userId) return failResponse(res, "Unauthorized", StatusCode.Unauthorized);

    const cart = await getCartByUserIdService(userId);
    return successResponse(res, cart ?? { userId, items: [] }, "Cart fetched successfully", StatusCode.OK);
  } catch (err: any) {
    return failResponse(res, err?.message || "Failed to fetch cart", StatusCode.Bad_Request);
  }
};

export const addItemToCart = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return failResponse(res, "Unauthorized", StatusCode.Unauthorized);

    const { bookId, quantity, pricingMode, rentalPeriod } = req.body;
    if (!bookId) return failResponse(res, "bookId is required", StatusCode.Bad_Request);

    const qty = quantity !== undefined ? Number(quantity) : 1;
    if (Number.isNaN(qty) || qty < 1) return failResponse(res, "quantity must be >= 1", StatusCode.Bad_Request);

    const updatedCart = await addItemToCartService(userId, bookId, qty, pricingMode, rentalPeriod);
    return successResponse(res, updatedCart, "Item added to cart", StatusCode.OK);
  } catch (err: any) {
    return failResponse(res, err?.message || "Failed to add item to cart", StatusCode.Bad_Request);
  }
};

export const removeItemFromCart = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return failResponse(res, "Unauthorized", StatusCode.Unauthorized);

    const bookId = req.params.bookId as string;
    const { pricingMode, rentalPeriod } = req.body;
    if (!bookId) return failResponse(res, "bookId is required", StatusCode.Bad_Request);

    const updatedCart = await removeItemFromCartService(userId, bookId, pricingMode, rentalPeriod);
    return successResponse(res, updatedCart, "Item removed from cart", StatusCode.OK);
  } catch (err: any) {
    return failResponse(res, err?.message || "Failed to remove item from cart", StatusCode.Bad_Request);
  }
};

export const patchCartItemQuantity = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return failResponse(res, "Unauthorized", StatusCode.Unauthorized);

    const bookId = req.params.bookId as string;
    if (!bookId) return failResponse(res, "bookId is required", StatusCode.Bad_Request);

    const { quantity, pricingMode, rentalPeriod } = req.body;
    const qty = quantity !== undefined ? Number(quantity) : NaN;

    if (Number.isNaN(qty) || qty < 0) {
      return failResponse(res, "quantity must be a valid number >= 0", StatusCode.Bad_Request);
    }

    if (qty === 0) {
      const updatedCart = await removeItemFromCartService(userId, bookId, pricingMode, rentalPeriod);
      return successResponse(res, updatedCart, "Item removed from cart", StatusCode.OK);
    }

    const updatedCart = await updateCartItemQuantityService(userId, bookId, qty, pricingMode, rentalPeriod);
    return successResponse(res, updatedCart, "Cart item quantity updated", StatusCode.OK);
  } catch (err: any) {
    return failResponse(res, err?.message || "Failed to update item quantity", StatusCode.Bad_Request);
  }
};

export const clearCart = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return failResponse(res, "Unauthorized", StatusCode.Unauthorized);

    const cleared = await clearCartService(userId);
    return successResponse(res, cleared, "Cart cleared", StatusCode.OK);
  } catch (err: any) {
    return failResponse(res, err?.message || "Failed to clear cart", StatusCode.Bad_Request);
  }
};

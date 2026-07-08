import { Request, Response } from "express";
import {
  addBookToWishlistService,
  createWishlistGroupService,
  getUserWishlistNamesService,
  getWishlistsByUserService,
  removeBookFromWishlistService,
} from "../services/wishListService";

import {
  successResponse,
  failResponse,
  errorResponse,
} from "../utils/response";

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
  };
}


export const getUserWishlists = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const { userId } = req.params as { userId: string };
    console.log("Fetching wishlists for userId:", userId);
    if (!userId) {
      failResponse(res, "User Id is required.", 400);
      return;
    }

    const wishlists = await getWishlistsByUserService(
      userId,
      req.query,
    );

    successResponse(
      res,
      wishlists,
      "Wishlists fetched successfully.",
      200,
    );
  } catch (error) {
    console.error("Get Wishlists Error:", error);

    errorResponse(
      res,
      error instanceof Error
        ? error.message
        : "Failed to fetch wishlists.",
    );
  }
};

/**
 * Create Wishlist
 */
export const createWishlistGroup = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    // const userId = req.user?.id;
    const { userId, name, description } = req.body;

    if (!userId) {
      failResponse(res, "Unauthorized login session.", 401);
      return;
    }

    if (!name?.trim()) {
      failResponse(res, "Wishlist name is required.", 400);
      return;
    }

    const wishlist = await createWishlistGroupService(
      userId,
      name,
      description,
    );

    successResponse(res, wishlist, "Wishlist created successfully.", 201);
  } catch (error: any) {
    console.error("Create Wishlist Error:", error);

    if (error.code === 11000) {
      failResponse(res, "Wishlist with this name already exists.", 409);
      return;
    }

    errorResponse(res, error.message || "Failed to create wishlist.");
  }
};

/**
 * Add Book To Wishlist
 */
export const addItemToWishlist = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    // const userId = req.user?.id;
    const {  wishlistId, bookId } = req.body;


    if (!wishlistId) {
      failResponse(res, "Wishlist Id is required.", 400);
      return;
    }

    if (!bookId) {
      failResponse(res, "Book Id is required.", 400);
      return;
    }

    const wishlist = await addBookToWishlistService( wishlistId, bookId);

    if (!wishlist) {
      failResponse(res, "Wishlist not found.", 404);
      return;
    }

    successResponse(res, wishlist, "Book added to wishlist successfully.", 200);
  } catch (error) {
    console.error("Add Book To Wishlist Error:", error);

    if (error instanceof Error) {
      failResponse(res, error.message, 400);
      return;
    }

    errorResponse(res);
  }
};

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
  };
}

export const removeBookFromWishlist = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const bookId = req.params.id as string;
    const {  wishlistId } = req.body;

 

    if (!wishlistId) {
      failResponse(res, "Wishlist Id is required.", 400);
      return;
    }

    if (!bookId) {
      failResponse(res, "Book Id is required.", 400);
      return;
    }

    const wishlist = await removeBookFromWishlistService(
     
      wishlistId,
      bookId,
    );

    successResponse(
      res,
      wishlist,
      "Book removed from wishlist successfully.",
      200,
    );
  } catch (error) {
    console.error("Remove Book Error:", error);

    if (error instanceof Error) {
      failResponse(res, error.message, 400);
      return;
    }

    errorResponse(res);
  }
};


export const getUserWishlistNames = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const { userId } = req.params as { userId: string };

    if (!userId) {
      failResponse(res, "User Id is required.", 400);
      return;
    }

    const wishlists = await getUserWishlistNamesService(userId);

    successResponse(
      res,
      wishlists,
      "Wishlist names fetched successfully.",
      200,
    );
  } catch (error) {
    console.error("Get Wishlist Names Error:", error);

    errorResponse(
      res,
      error instanceof Error
        ? error.message
        : "Failed to fetch wishlist names.",
    );
  }
};
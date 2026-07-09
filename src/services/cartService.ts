import mongoose from "mongoose";
import Cart from "../models/Cart";
import Book from "../models/Book";
import { computeCartTotals } from "../utils/cartTotals";

const BOOK_POPULATE = {
  path: "items.bookId",
  select:
    "name description coverImage rentalPricePerDay rentalPricePerWeek rentalPricePerMonth purchasePrice securityDeposit",
};

const getPopulatedCartWithSummary = async (
  cartId: mongoose.Types.ObjectId
) => {
  const cart = await Cart.findById(cartId)
    .populate(BOOK_POPULATE)
    .lean();

  if (!cart) return null;

  return {
    ...cart,
    summary: computeCartTotals(cart as any),
  };
};

export const getCartByUserIdService = async (userId: string) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid userId");
  }

  const cart = await Cart.findOne({ userId })
    .populate(BOOK_POPULATE)
    .lean();

  if (!cart) {
    return {
      userId,
      items: [],
      summary: computeCartTotals(null),
    };
  }

  return {
    ...cart,
    summary: computeCartTotals(cart as any),
  };
};

export const addItemToCartService = async (
  userId: string,
  bookId: string,
  quantity = 1,
  pricingMode: "rent" | "sale" = "rent",
  rentalPeriod?: "day" | "week" | "month"
) => {
  if (!mongoose.Types.ObjectId.isValid(userId))
    throw new Error("Invalid userId");

  if (!mongoose.Types.ObjectId.isValid(bookId))
    throw new Error("Invalid bookId");

  const bookExists = await Book.findById(bookId).select("_id");

  if (!bookExists) throw new Error("Book not found");

  let cart = await Cart.findOne({ userId });

  if (!cart) {
    cart = await Cart.create({
      userId,
      items: [
        {
          bookId: new mongoose.Types.ObjectId(bookId),
          quantity,
          pricingMode,
          rentalPeriod,
          addedAt: new Date(),
        },
      ],
    });

    return await getPopulatedCartWithSummary(cart._id);
  }

  const existingItem = cart.items.find(
    (item) =>
      item.bookId.toString() === bookId &&
      item.pricingMode === pricingMode &&
      item.rentalPeriod === rentalPeriod
  );

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.items.push({
      bookId: new mongoose.Types.ObjectId(bookId),
      quantity,
      pricingMode,
      rentalPeriod,
      addedAt: new Date(),
    });
  }

  await cart.save();

  return await getPopulatedCartWithSummary(cart._id);
};

export const updateCartItemQuantityService = async (
  userId: string,
  bookId: string,
  quantity: number,
  pricingMode: "rent" | "sale",
  rentalPeriod?: "day" | "week" | "month"
) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid userId");
  }

  if (!mongoose.Types.ObjectId.isValid(bookId)) {
    throw new Error("Invalid bookId");
  }

  if (quantity < 1) {
    throw new Error("Quantity must be at least 1");
  }

  const cart = await Cart.findOne({ userId });

  if (!cart) {
    throw new Error("Cart not found");
  }

  const existingItem = cart.items.find(
    (item) =>
      item.bookId.toString() === bookId &&
      item.pricingMode === pricingMode &&
      item.rentalPeriod === rentalPeriod
  );

  if (!existingItem) {
    throw new Error("Cart item not found");
  }

  existingItem.quantity = quantity;

  await cart.save();

  return await getPopulatedCartWithSummary(cart._id);
};

export const removeItemFromCartService = async (
  userId: string,
  bookId: string,
  pricingMode: "rent" | "sale",
  rentalPeriod?: "day" | "week" | "month"
) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid userId");
  }

  if (!mongoose.Types.ObjectId.isValid(bookId)) {
    throw new Error("Invalid bookId");
  }

  const cart = await Cart.findOne({ userId });

  if (!cart) {
    throw new Error("Cart not found");
  }

  const initialLength = cart.items.length;

  cart.items = cart.items.filter(
    (item) =>
      !(
        item.bookId.toString() === bookId &&
        item.pricingMode === pricingMode &&
        item.rentalPeriod === rentalPeriod
      )
  );

  if (cart.items.length === initialLength) {
    throw new Error("Cart item not found");
  }

  await cart.save();

  return await getPopulatedCartWithSummary(cart._id);
};

export const clearCartService = async (userId: string) => {
  if (!mongoose.Types.ObjectId.isValid(userId))
    throw new Error("Invalid userId");

  const cart = await Cart.findOne({ userId });

  if (!cart) {
    return {
      userId,
      items: [],
      summary: computeCartTotals(null),
    };
  }

  cart.items = [];

  await cart.save();

  return await getPopulatedCartWithSummary(cart._id);
};
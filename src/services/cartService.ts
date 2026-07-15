import mongoose from "mongoose";
import Cart from "../models/Cart";
import Book from "../models/Book";
import { computeCartTotals } from "../utils/cartTotals";
import { Messages } from "../utils/constants";

const BOOK_POPULATE = {
  path: "items.bookId",
  select:
    "name author description coverImage rentalPricePerDay rentalPricePerWeek rentalPricePerMonth purchasePrice securityDeposit isActive isAvailable quantity",
};

const getPopulatedCartWithSummary = async (
  cartId: mongoose.Types.ObjectId
) => {
  const cart = await Cart.findById(cartId)
    .populate(BOOK_POPULATE)
    .lean();

  if (!cart) return null;

  // Reservation rule: reservedQtyForBook = sum(cart quantities for same bookId),
  const reservedQtyByBook = new Map<string, number>();
  for (const item of cart.items as any[]) {
    const populatedBook = (item as any).bookId;
    const bookId = populatedBook?._id ? String(populatedBook._id) : String((item as any).bookId);
    reservedQtyByBook.set(
      bookId,
      (reservedQtyByBook.get(bookId) ?? 0) + Number((item as any).quantity ?? 1)
    );
  }

  const cartWithAvailability = {
    ...cart,
    items: cart.items.map((item: any) => {
      const populatedBook = item.bookId;
      const bookId = populatedBook?._id ? String(populatedBook._id) : String(item.bookId);
      const reservedQty = reservedQtyByBook.get(bookId) ?? 0;
      const inventoryQty = Number(populatedBook?.quantity ?? 0);
      const effectiveIsAvailable = inventoryQty >= reservedQty;

      return {
        ...item,
        bookId: {
          ...populatedBook,
          isAvailable: effectiveIsAvailable,
          isActive: populatedBook?.isActive,
        },
      };
    }),
  };

  return {
    ...cartWithAvailability,
    summary: computeCartTotals(cart as any),
  };
};

export const getCartByUserIdService = async (userId: string) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error(Messages.Invalid_UserId);
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
    throw new Error(Messages.Invalid_UserId);

  if (!mongoose.Types.ObjectId.isValid(bookId))
    throw new Error(Messages.Invalid_BookId);

  const bookExists = await Book.findById(bookId).select("_id");

  if (!bookExists) throw new Error(Messages.Book_Not_Found);

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
    throw new Error(Messages.Invalid_UserId);
  }

  if (!mongoose.Types.ObjectId.isValid(bookId)) {
    throw new Error(Messages.Invalid_BookId);
  }

  if (quantity < 1) {
    throw new Error(Messages.Quantity_Must_Be_At_Least_One);
  }

  const cart = await Cart.findOne({ userId });

  if (!cart) {
    throw new Error(Messages.Cart_Not_Found);
  }

  const existingItem = cart.items.find(
    (item) =>
      item.bookId.toString() === bookId &&
      item.pricingMode === pricingMode &&
      item.rentalPeriod === rentalPeriod
  );

  if (!existingItem) {
    throw new Error(Messages.Cart_Item_Not_Found);
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
    throw new Error(Messages.Invalid_UserId);
  }

  if (!mongoose.Types.ObjectId.isValid(bookId)) {
    throw new Error(Messages.Invalid_BookId);
  }

  const cart = await Cart.findOne({ userId });

  if (!cart) {
    throw new Error(Messages.Cart_Not_Found);
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
    throw new Error(Messages.Cart_Item_Not_Found);
  }

  await cart.save();

  return await getPopulatedCartWithSummary(cart._id);
};

export const clearCartService = async (userId: string) => {
  if (!mongoose.Types.ObjectId.isValid(userId))
    throw new Error(Messages.Invalid_UserId);

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
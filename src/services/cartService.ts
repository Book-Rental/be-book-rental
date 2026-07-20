import mongoose from "mongoose";
import Cart from "../models/Cart";
import Book from "../models/Book";
import { computeCartTotals } from "../utils/cartTotals";
import { Messages } from "../utils/constants";
import { CartIdentity } from "../middlewares/resolveCartIdentity";

const BOOK_POPULATE = {
    path: "items.bookId",
    select: "name author description coverImage rentalPricePerDay rentalPricePerWeek rentalPricePerMonth purchasePrice securityDeposit isActive isAvailable quantity",
};

const getPopulatedCartWithSummary = async (cartId: mongoose.Types.ObjectId) => {
    const cart = await Cart.findById(cartId).populate(BOOK_POPULATE).lean();

    if (!cart) return null;

    // Reservation rule: reservedQtyForBook = sum(cart quantities for same bookId),
    const reservedQtyByBook = new Map<string, number>();
    for (const item of cart.items as any[]) {
        const populatedBook = (item as any).bookId;
        const bookId = populatedBook?._id
            ? String(populatedBook._id)
            : String((item as any).bookId);
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

// ---- Identity helpers ----

type CartFilter = {
    userId?: string;
    anonymousId?: string;
};

const identityToFilter = (identity: CartIdentity): CartFilter => {
    const filter: CartFilter = {};
    if (identity.userId) filter.userId = identity.userId;
    if (identity.anonymousId) filter.anonymousId = identity.anonymousId;
    return filter;
};

const validateIdentity = (identity: CartIdentity): void => {
    if (identity.userId && !mongoose.Types.ObjectId.isValid(identity.userId)) {
        throw new Error(Messages.Invalid_UserId);
    }
    if (!identity.userId && !identity.anonymousId) {
        throw new Error(Messages.Invalid_UserId);
    }
};

const buildEmptyCartResult = (identity: CartIdentity) => ({
    ...identity,
    items: [],
    summary: computeCartTotals(null),
});

// ---- Public services ----

export const getCartByIdentityService = async (identity: CartIdentity) => {
    validateIdentity(identity);

    const filter = identityToFilter(identity);
    const cart = await Cart.findOne(filter).populate(BOOK_POPULATE).lean();

    if (!cart) {
        return buildEmptyCartResult(identity);
    }

    return {
        ...cart,
        summary: computeCartTotals(cart as any),
    };
};

// Kept for backward compatibility (used by tests, etc.)
export const getCartByUserIdService = async (userId: string) => {
    return getCartByIdentityService({ userId });
};

export const addItemToCartService = async (
    identity: CartIdentity,
    bookId: string,
    quantity = 1,
    pricingMode: "rent" | "sale" = "rent",
    rentalPeriod?: "day" | "week" | "month"
) => {
    validateIdentity(identity);

    if (!mongoose.Types.ObjectId.isValid(bookId)) throw new Error(Messages.Invalid_BookId);

    const bookExists = await Book.findById(bookId).select("_id");
    if (!bookExists) throw new Error(Messages.Book_Not_Found);

    const filter = identityToFilter(identity);
    let cart = await Cart.findOne(filter);

    if (!cart) {
        const createPayload: any = {
            items: [
                {
                    bookId: new mongoose.Types.ObjectId(bookId),
                    quantity,
                    pricingMode,
                    rentalPeriod,
                    addedAt: new Date(),
                },
            ],
        };
        if (identity.userId) createPayload.userId = identity.userId;
        if (identity.anonymousId) createPayload.anonymousId = identity.anonymousId;

        cart = await Cart.create(createPayload);
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
    identity: CartIdentity,
    bookId: string,
    quantity: number,
    pricingMode: "rent" | "sale",
    rentalPeriod?: "day" | "week" | "month"
) => {
    validateIdentity(identity);

    if (!mongoose.Types.ObjectId.isValid(bookId)) {
        throw new Error(Messages.Invalid_BookId);
    }

    if (quantity < 1) {
        throw new Error(Messages.Quantity_Must_Be_At_Least_One);
    }

    const filter = identityToFilter(identity);
    const cart = await Cart.findOne(filter);

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
    identity: CartIdentity,
    bookId: string,
    pricingMode: "rent" | "sale",
    rentalPeriod?: "day" | "week" | "month"
) => {
    validateIdentity(identity);

    if (!mongoose.Types.ObjectId.isValid(bookId)) {
        throw new Error(Messages.Invalid_BookId);
    }

    const filter = identityToFilter(identity);
    const cart = await Cart.findOne(filter);

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

export const clearCartService = async (identity: CartIdentity) => {
    validateIdentity(identity);

    const filter = identityToFilter(identity);
    const cart = await Cart.findOne(filter);

    if (!cart) {
        return buildEmptyCartResult(identity);
    }

    cart.items = [];
    await cart.save();

    return await getPopulatedCartWithSummary(cart._id);
};

export const validateCartService = async (identity: CartIdentity) => {
    validateIdentity(identity);

    const filter = identityToFilter(identity);
    const cart = await Cart.findOne(filter)
        .populate({
            path: "items.bookId",
            select: "quantity isActive isAvailable",
        })
        .lean();

    if (!cart || !cart.items?.length) {
        return {
            ...identity,
            isValid: true,
            invalidItems: [],
            validationSummary: {
                totalItems: 0,
                invalidCount: 0,
            },
        };
    }

    const reservedQtyByBook = new Map<string, number>();
    for (const item of cart.items as any[]) {
        const populatedBook = (item as any).bookId;
        const bookId = populatedBook?._id
            ? String(populatedBook._id)
            : String((item as any).bookId);

        reservedQtyByBook.set(
            bookId,
            (reservedQtyByBook.get(bookId) ?? 0) + Number((item as any).quantity ?? 1)
        );
    }

    const invalidItems: Array<{ bookId: string; reason: string }> = [];

    for (const item of cart.items as any[]) {
        const populatedBook = item.bookId;
        const bookId = populatedBook?._id ? String(populatedBook._id) : String(item.bookId);

        const reservedQty = reservedQtyByBook.get(bookId) ?? 0;
        const inventoryQty = Number(populatedBook?.quantity ?? 0);

        const isAvailableNow = inventoryQty >= reservedQty;
        const isActiveNow = populatedBook?.isActive ?? true;

        if (!isActiveNow) {
            invalidItems.push({ bookId, reason: Messages.Book_Inactive });
            continue;
        }

        if (!isAvailableNow) {
            invalidItems.push({
                bookId,
                reason: Messages.Insufficient_Quantity,
            });
        }
    }

    const deduped = new Map<string, { bookId: string; reason: string }>();
    for (const inv of invalidItems) {
        if (!deduped.has(inv.bookId)) deduped.set(inv.bookId, inv);
    }

    const invalidItemsUnique = Array.from(deduped.values());

    return {
        ...identity,
        isValid: invalidItemsUnique.length === 0,
        invalidItems: invalidItemsUnique,
        validationSummary: {
            totalItems: cart.items.length,
            invalidCount: invalidItemsUnique.length,
        },
    };
};

// ---- Merge guest cart into user cart (called after login/signup) ----

export const mergeGuestCartIntoUserCartService = async (userId: string, anonymousId: string) => {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error(Messages.Invalid_UserId);
    }
    if (!anonymousId) {
        // No guest cart to merge; just return user cart
        return await getCartByIdentityService({ userId });
    }

    const guestCart = await Cart.findOne({ anonymousId }).lean();
    if (!guestCart || !guestCart.items?.length) {
        // Guest cart is empty; return user cart as-is
        return await getCartByIdentityService({ userId });
    }

    // Find or create user cart
    let userCart = await Cart.findOne({ userId });

    if (!userCart) {
        // Transfer guest cart directly to user
        await Cart.updateOne(
            { _id: guestCart._id },
            { $set: { userId: new mongoose.Types.ObjectId(userId), anonymousId: undefined } }
        );
        return await getPopulatedCartWithSummary(guestCart._id);
    }

    // Merge guest items into user cart
    for (const guestItem of guestCart.items) {
        const existingItem = userCart.items.find(
            (item) =>
                item.bookId.toString() === guestItem.bookId.toString() &&
                item.pricingMode === guestItem.pricingMode &&
                item.rentalPeriod === guestItem.rentalPeriod
        );

        if (existingItem) {
            existingItem.quantity += guestItem.quantity;
        } else {
            userCart.items.push({
                bookId: guestItem.bookId,
                quantity: guestItem.quantity,
                pricingMode: guestItem.pricingMode,
                rentalPeriod: guestItem.rentalPeriod,
                addedAt: guestItem.addedAt || new Date(),
            });
        }
    }

    await userCart.save();

    // Delete guest cart after merge
    await Cart.deleteOne({ _id: guestCart._id });

    return await getPopulatedCartWithSummary(userCart._id);
};

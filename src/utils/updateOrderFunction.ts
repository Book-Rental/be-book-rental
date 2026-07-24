import mongoose from "mongoose";
import Book from "../models/Book";
import { DepositStatus, ItemStatus, OrderStatus, PaymentStatus } from "../models/Order";
import { StatusCode } from "./StatusCodes";

export enum BookStatus {
    AVAILABLE = "available",
    RESERVED = "reserved",
    RENTED = "rented",
    UNAVAILABLE = "unavailable",
}

/* =========================================================
 * Transition maps (module-level — built once, not per call)
 * ========================================================= */

export const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
    [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
    [OrderStatus.CONFIRMED]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
    [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
    [OrderStatus.DELIVERED]: [OrderStatus.RETURN_REQUESTED],
    [OrderStatus.RETURN_REQUESTED]: [OrderStatus.RETURNED],
    [OrderStatus.RETURNED]: [],
    [OrderStatus.CANCELLED]: [],
};

export const PAYMENT_STATUS_TRANSITIONS: Record<string, string[]> = {
    [PaymentStatus.PENDING]: [PaymentStatus.SUCCESS, PaymentStatus.FAILED],
    [PaymentStatus.SUCCESS]: [PaymentStatus.REFUNDED],
    [PaymentStatus.FAILED]: [],
    [PaymentStatus.REFUNDED]: [],
};

export const ITEM_STATUS_TRANSITIONS: Record<string, string[]> = {
    [ItemStatus.PENDING]: [ItemStatus.CONFIRMED, ItemStatus.CANCELLED],
    [ItemStatus.CONFIRMED]: [ItemStatus.SHIPPED, ItemStatus.CANCELLED],
    [ItemStatus.SHIPPED]: [ItemStatus.DELIVERED],
    [ItemStatus.DELIVERED]: [ItemStatus.RETURN_REQUESTED],
    [ItemStatus.RETURN_REQUESTED]: [ItemStatus.RETURNED],
    [ItemStatus.RETURNED]: [],
    [ItemStatus.CANCELLED]: [],
};

export const DEPOSIT_STATUS_TRANSITIONS: Record<string, string[]> = {
    [DepositStatus.PENDING]: [DepositStatus.HOLD],
    [DepositStatus.HOLD]: [
        DepositStatus.REFUNDED,
        DepositStatus.PARTIALLY_REFUNDED,
        DepositStatus.DEDUCTED,
    ],
    [DepositStatus.REFUNDED]: [],
    [DepositStatus.PARTIALLY_REFUNDED]: [],
    [DepositStatus.DEDUCTED]: [],
};

/** Item status -> resulting Book status. Adjust once real Book enum is shared. */
export const ITEM_STATUS_TO_BOOK_STATUS: Partial<Record<ItemStatus, BookStatus>> = {
    [ItemStatus.PENDING]: BookStatus.RESERVED,
    [ItemStatus.CONFIRMED]: BookStatus.RESERVED,
    [ItemStatus.SHIPPED]: BookStatus.RENTED,
    [ItemStatus.DELIVERED]: BookStatus.RENTED,
    [ItemStatus.RETURN_REQUESTED]: BookStatus.RENTED,
    [ItemStatus.RETURNED]: BookStatus.AVAILABLE,
    [ItemStatus.CANCELLED]: BookStatus.AVAILABLE,
    [ItemStatus.REJECTED]: BookStatus.AVAILABLE,
};

/* =========================================================
 * Shared helper
 * ========================================================= */

export function assertTransition(
    map: Record<string, string[]>,
    from: string,
    to: string,
    label: string
) {
    if (to === from) return;
    const allowed = map[from] || [];
    if (!allowed.includes(to)) {
        const error: any = new Error(
            `Cannot change ${label} from '${from}' to '${to}'.`
        );
        error.statusCode = StatusCode.Conflict;
        throw error;
    }
}

/* =========================================================
 * Validators
 * ========================================================= */

export function validateOrderStatusTransition(order: any, updateData: any) {
    if (updateData.orderStatus && updateData.orderStatus !== order.orderStatus) {
        assertTransition(
            ORDER_STATUS_TRANSITIONS,
            order.orderStatus,
            updateData.orderStatus,
            "order status"
        );
    }
}

export function validatePaymentStatusTransition(order: any, updateData: any) {
    const nextStatus = updateData.payment?.paymentStatus;
    if (nextStatus) {
        assertTransition(
            PAYMENT_STATUS_TRANSITIONS,
            order.payment.paymentStatus,
            nextStatus,
            "payment status"
        );
    }
}

export function validateRentalDates(existingItem: any, rental: any, today: Date) {
    if (rental.rentStartDate) {
        const rentStart = new Date(rental.rentStartDate);
        if (rentStart < today) {
            const error: any = new Error("Rent start date cannot be in the past.");
            error.statusCode = StatusCode.Bad_Request;
            throw error;
        }
    }

    if (rental.expectedReturnDate) {
        const expectedReturn = new Date(rental.expectedReturnDate);
        const startDate = rental.rentStartDate
            ? new Date(rental.rentStartDate)
            : existingItem.rental.rentStartDate;

        if (expectedReturn <= startDate) {
            const error: any = new Error(
                "Expected return date must be after rent start date."
            );
            error.statusCode = StatusCode.Bad_Request;
            throw error;
        }
    }

    if (
        rental.extensionCount !== undefined &&
        rental.extensionCount > existingItem.rental.maximumExtensions
    ) {
        const error: any = new Error("Maximum rental extensions exceeded.");
        error.statusCode = StatusCode.Bad_Request;
        throw error;
    }

    if (rental.actualReturnDate && existingItem.itemStatus !== ItemStatus.RETURNED) {
        const error: any = new Error(
            "Actual return date can only be updated when the item is returned."
        );
        error.statusCode = StatusCode.Bad_Request;
        throw error;
    }
}

/** Resolves each updateData item against its existing subdoc once, and validates
 *  item-status, deposit-status, and rental-date rules in a single pass. */
export function validateAndResolveItems(order: any, updateData: any) {
    if (!updateData.items?.length) return [];

    const today = new Date();
    const resolved: Array<{ existingItem: any; incoming: any }> = [];

    for (const incoming of updateData.items) {
        const existingItem = order.items.id(incoming._id);

        if (!existingItem) {
            const error: any = new Error(`Order item '${incoming._id}' not found.`);
            error.statusCode = StatusCode.Not_Found;
            throw error;
        }

        if (incoming.itemStatus) {
            assertTransition(
                ITEM_STATUS_TRANSITIONS,
                existingItem.itemStatus,
                incoming.itemStatus,
                "item status"
            );
        }

        if (incoming.deposit?.status) {
            assertTransition(
                DEPOSIT_STATUS_TRANSITIONS,
                existingItem.deposit.status,
                incoming.deposit.status,
                "deposit status"
            );
        }

        if (incoming.rental) {
            validateRentalDates(existingItem, incoming.rental, today);
        }

        resolved.push({ existingItem, incoming });
    }

    return resolved;
}

/* =========================================================
 * Mutators
 * ========================================================= */

export function applyItemUpdates(resolvedItems: Array<{ existingItem: any; incoming: any }>) {
    for (const { existingItem, incoming } of resolvedItems) {
        if (incoming.itemStatus) existingItem.itemStatus = incoming.itemStatus;
        if (incoming.quantity !== undefined) existingItem.quantity = incoming.quantity;
        if (incoming.deposit) Object.assign(existingItem.deposit, incoming.deposit);
        if (incoming.rental) Object.assign(existingItem.rental, incoming.rental);
    }
}

export function applyTopLevelUpdates(order: any, updateData: any) {
    if (updateData.orderStatus) order.orderStatus = updateData.orderStatus;
    if (updateData.payment) Object.assign(order.payment, updateData.payment);
    if (updateData.shippingAddress) {
        Object.assign(order.shippingAddress, updateData.shippingAddress);
    }
    if (updateData.billingAddress) {
        Object.assign(order.billingAddress, updateData.billingAddress);
    }
    if (updateData.amount) Object.assign(order.amount, updateData.amount);
    if (updateData.updatedBy) order.updatedBy = updateData.updatedBy;
}

/** Derives orderStatus from the aggregate of item statuses. */
export function syncOrderStatusFromItems(order: any) {
    const itemStatuses = order.items.map((item: any) => item.itemStatus);
    const allAre = (...statuses: ItemStatus[]) =>
        itemStatuses.every((s: ItemStatus) => statuses.includes(s));

    if (allAre(ItemStatus.CANCELLED)) {
        order.orderStatus = OrderStatus.CANCELLED;
    } else if (allAre(ItemStatus.RETURNED)) {
        order.orderStatus = OrderStatus.RETURNED;
    } else if (allAre(ItemStatus.RETURNED, ItemStatus.RETURN_REQUESTED)) {
        order.orderStatus = OrderStatus.RETURN_REQUESTED;
    } else if (
        allAre(ItemStatus.DELIVERED, ItemStatus.RETURN_REQUESTED, ItemStatus.RETURNED)
    ) {
        order.orderStatus = OrderStatus.DELIVERED;
    } else if (
        allAre(
            ItemStatus.SHIPPED,
            ItemStatus.DELIVERED,
            ItemStatus.RETURN_REQUESTED,
            ItemStatus.RETURNED
        )
    ) {
        order.orderStatus = OrderStatus.SHIPPED;
    } else if (
        allAre(
            ItemStatus.CONFIRMED,
            ItemStatus.SHIPPED,
            ItemStatus.DELIVERED,
            ItemStatus.RETURN_REQUESTED,
            ItemStatus.RETURNED
        )
    ) {
        order.orderStatus = OrderStatus.CONFIRMED;
    } else {
        order.orderStatus = OrderStatus.PENDING;
    }
}

/** Updates Book.status for every item whose itemStatus changed in this request. */
export async function syncBookStatuses(
    resolvedItems: Array<{ existingItem: any; incoming: any }>,
    session?: mongoose.ClientSession
) {
    const changedItems = resolvedItems.filter(
        ({ existingItem, incoming }) =>
            incoming.itemStatus && incoming.itemStatus !== existingItem.itemStatus
    );

    if (!changedItems.length) return;

    const bookUpdates = changedItems
        .map(({ existingItem, incoming }) => {
            const newBookStatus =
                ITEM_STATUS_TO_BOOK_STATUS[incoming.itemStatus as ItemStatus];
            if (!newBookStatus) return null;

            return Book.findByIdAndUpdate(
                existingItem.bookId,
                { status: newBookStatus },
                { new: true, session }
            );
        })
        .filter(Boolean);

    if (bookUpdates.length) {
        await Promise.all(bookUpdates);
    }
}

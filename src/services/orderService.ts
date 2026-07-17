import Book from "../models/Book";
import Order, { OrderStatus, OrderType, PaymentStatus } from "../models/Order";
import { IOrder } from "../models/orderInteface";
import User from "../models/User";
import { buildPaginationQuery } from "../utils/appFunctions";

//getAll Order
export const getAllOrdersService = async (query: {
    userId?: string;
    orderStatus?: string;
    orderId?: string;
    page?: number;
    limit?: number;
}) => {
    try {
        const { skip, limit, page } = buildPaginationQuery(query);

        const { userId, orderStatus, orderId } = query;

        const searchFilter: any = {};

        if (userId) {
            searchFilter.userId = userId;
        }

        if (orderStatus) {
            searchFilter.orderStatus = orderStatus;
        }

        if (orderId) {
            searchFilter._id = orderId;
        }

        const totalRecords = await Order.countDocuments(searchFilter);

        const totalPages = Math.ceil(totalRecords / limit);

        const hasMore = page < totalPages;

        const orders = await Order.find(searchFilter)
            .populate({
                path: "items.bookId",
                select: "name author coverImage",
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        return {
            orders,
            meta: {
                totalRecords,
                totalPages,
                currentPage: page,
                limit,
                hasMore,
            },
        };
    } catch (error) {
        throw error;
    }
};

//get By Order
export const getOrderByOrderIdService = async (orderId: string) => {
    try {
        return await Order.findById(orderId);
    } catch (error) {
        return error;
    }
};

//Create Order
export const createOrderService = async (orderData: any) => {
    try {
        const {
            userId,
            items,
            deliveryAddress,
            paymentMethod,
            subtotal,
            securityDepositTotal,
            deliveryFee,
            tax,
            discount,
            total,
            createdBy,
        } = orderData;

        // ================= User Validation =================
        const user = await User.findById(userId);

        if (!user) {
            throw new Error("User not found.");
        }

        const orderItems = [];

        // ================= Validate Books =================
        for (const item of items) {
            const book: any = await Book.findById(item.bookId);

            if (!book) {
                throw new Error(`Book not found : ${item.bookId}`);
            }

            if (!book.isActive) {
                throw new Error(`${book.name} is inactive.`);
            }

            if (!book.isAvailable) {
                throw new Error(`${book.name} is unavailable.`);
            }

            if (item.orderType === OrderType.BUY && !book.availableForSale) {
                throw new Error(`${book.name} is not available for sale.`);
            }

            if (item.orderType === OrderType.RENT && !book.availableForRent) {
                throw new Error(`${book.name} is not available for rent.`);
            }

            // ======================================
            // Validate Frontend Amounts
            // ======================================

            let calculatedSubtotal = 0;
            let calculatedSecurityDeposit = 0;

            for (const item of items) {
                const book: any = await Book.findById(item.bookId);

                if (!book) {
                    throw new Error(`Book not found: ${item.bookId}`);
                }

                if (item.orderType === OrderType.BUY) {
                    calculatedSubtotal += Number(book.purchasePrice) * Number(item.quantity);
                } else {
                    let rentalPrice = 0;

                    switch (item.rentalType) {
                        case "day":
                            rentalPrice = Number(book.rentalPricePerDay);
                            break;

                        case "week":
                            rentalPrice = Number(book.rentalPricePerWeek);
                            break;

                        case "month":
                            rentalPrice = Number(book.rentalPricePerMonth);
                            break;

                        default:
                            throw new Error("Invalid rental type.");
                    }

                    calculatedSubtotal += rentalPrice * Number(item.quantity);

                    calculatedSecurityDeposit +=
                        Number(book.securityDeposit) * Number(item.quantity);
                }
            }

            const calculatedTotal =
                calculatedSubtotal +
                calculatedSecurityDeposit +
                Number(deliveryFee) +
                Number(tax) -
                Number(discount);

            // Validate subtotal
            if (Number(subtotal) !== calculatedSubtotal) {
                throw new Error(
                    `Subtotal mismatch. Expected ${calculatedSubtotal}, Received ${subtotal}`
                );
            }

            if (Number(securityDepositTotal) !== calculatedSecurityDeposit) {
                throw new Error(
                    `Security Deposit mismatch. Expected ${calculatedSecurityDeposit}, Received ${securityDepositTotal}`
                );
            }

            if (Number(total) !== calculatedTotal) {
                throw new Error(
                    `Total Amount mismatch. Expected ${calculatedTotal}, Received ${total}`
                );
            }
            let rentalPrice = 0;

            if (item.orderType === OrderType.RENT) {
                switch (item.rentalType) {
                    case "day":
                        rentalPrice = Number(book.rentalPricePerDay);
                        break;

                    case "week":
                        rentalPrice = Number(book.rentalPricePerWeek);
                        break;

                    case "month":
                        rentalPrice = Number(book.rentalPricePerMonth);
                        break;

                    default:
                        throw new Error("Invalid rental type.");
                }
            }
            orderItems.push({
                bookId: book._id,
                sellerId: book.sellerId,
                orderType: item.orderType,
                quantity: item.quantity,
                rentalPrice: item.orderType === OrderType.RENT ? rentalPrice : 0,

                securityDeposit:
                    item.orderType === OrderType.RENT ? Number(book.securityDeposit) : 0,
                rentStartDate: item.rentStartDate || null,
                expectedReturnDate: item.expectedReturnDate || null,
                actualReturnDate: null,
                lateFee: 0,
            });
        }

        // ================= Generate Order Number =================
        const orderNumber = `ORD${Date.now()}`;

        // ================= Create Order =================
        const order = await Order.create({
            orderNumber,

            userId,

            items: orderItems,

            deliveryAddress,

            subtotal: Number(subtotal),

            securityDepositTotal: Number(securityDepositTotal),

            deliveryFee: Number(deliveryFee),

            tax: Number(tax),

            discount: Number(discount),

            total: Number(total),

            paymentMethod,

            paymentStatus: PaymentStatus.PENDING,

            orderStatus: OrderStatus.PENDING,

            transactionId: null,

            createdBy,

            updatedBy: createdBy,

            isActive: true,
        });

        return await Order.findById(order._id)
            .populate("userId", "firstName lastName email")
            .populate("items.bookId", "name author images purchasePrice rentalPrice")
            .populate("items.sellerId", "firstName lastName email");
    } catch (error) {
        throw error;
    }
};

export const getOrderByUserIdService = async (userId: string, query: any = {}) => {
    try {
        const { skip, limit, page } = buildPaginationQuery(query);
        const orderStatus = query.orderStatus;
        const filter: any = { userId };

        // Apply orderStatus filter if provided
        if (orderStatus && orderStatus !== "ALL") {
            filter.orderStatus = orderStatus;
        }

        const totalRecords = await Order.countDocuments(filter);
        const totalPages = Math.ceil(totalRecords / limit);
        const hasMore = page < totalPages;

        const orders = await Order.find(filter)
            .populate({
                path: "items.bookId",
                select: "name author coverImage",
            })
            .skip(skip)
            .limit(limit);

        return {
            orders,
            meta: {
                totalRecords,
                totalPages,
                currentPage: page,
                limit,
                hasMore,
            },
        };
    } catch (error) {
        throw error;
    }
};

// Seller dashboard: orders that contain at least one item for the seller,
// and each returned order's items are filtered to only seller-owned items.
export const getSellerOrdersService = async (sellerUserId: string, query: any = {}) => {
    try {
        const { skip, limit, page } = buildPaginationQuery(query);
        const orderStatus = query.orderStatus;

        const filter: any = {
            "items.sellerId": sellerUserId,
        };

        // Optional orderStatus filter to match existing conventions.
        // if (orderStatus && orderStatus !== "ALL") {
        //     filter.orderStatus = orderStatus;
        // }

        const totalRecords = await Order.countDocuments(filter);
        const totalPages = Math.ceil(totalRecords / limit);
        const hasMore = page < totalPages;

        const orders = await Order.find(filter)
            .populate({
                path: "items.bookId",
                select: "name author coverImage ",
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const filteredOrders = orders
            .map((order: any) => {
                const sellerItems = (order.items || []).filter((it: any) => {
                    if (!it?.sellerId) return false;
                    return it.sellerId.toString() === sellerUserId;
                });

                if (!sellerItems.length) return null;

                return {
                    ...order.toObject?.(),
                    items: sellerItems,
                };
            })
            .filter(Boolean);

        return {
            orders: filteredOrders,
            meta: {
                totalRecords,
                totalPages,
                currentPage: page,
                limit,
                hasMore,
            },
        };
    } catch (error) {
        throw error;
    }
};

export const deleteOrderByIdService = async (orderId: string) => {
    try {
        const result = await Order.findByIdAndDelete(orderId);
        return result !== null;
    } catch (error) {
        throw error;
    }
};

export const getOrderBookDetailsService = async (orderId: string, bookId: string) => {
    const order: any = await Order.findById(orderId).populate({
        path: "items.bookId",
        select: "name author coverImage",
    });

    if (!order) {
        throw new Error("Order not found.");
    }

    const orderItem = order.items.find((item: any) => item.bookId?._id.toString() === bookId);

    if (!orderItem) {
        throw new Error("Book not found in this order.");
    }

    return {
        _id: orderItem._id,

        bookId: {
            _id: orderItem.bookId._id,
            name: orderItem.bookId.name,
            author: orderItem.bookId.author,
            coverImage: orderItem.bookId.coverImage,
        },

        sellerId: orderItem.sellerId,

        orderType: orderItem.orderType,

        quantity: orderItem.quantity,

        // These values come from the ORDER
        purchasePrice: orderItem.purchasePrice,
        rentalPrice: orderItem.rentalPrice,
        securityDeposit: orderItem.securityDeposit,

        itemStatus: orderItem.itemStatus,

        rentStartDate: orderItem.rentStartDate,
        expectedReturnDate: orderItem.expectedReturnDate,
        actualReturnDate: orderItem.actualReturnDate,

        lateFee: orderItem.lateFee,
    };
};
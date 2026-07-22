import mongoose from "mongoose";
import Book from "../models/Book";
import Order, { OrderStatus, PaymentStatus } from "../models/Order";
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

        const filter: any = {
            isActive: true,
        };

        if (userId) {
            filter.userId = userId;
        }

        if (orderStatus) {
            filter.orderStatus = orderStatus;
        }

        if (orderId) {
            filter._id = orderId;
        }

        const totalRecords = await Order.countDocuments(filter);

        const totalPages = Math.ceil(totalRecords / limit);

        const hasMore = page < totalPages;

        const orders = await Order.find(filter)
            .populate({
                path: "items.bookId",
                select: "name author coverImage",
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const formattedOrders = orders.map((order: any) => ({
            orderId: order._id,
            orderNumber: order.orderNumber,
            orderDate: order.createdAt,
            orderStatus: order.orderStatus,
            paymentStatus: order.payment.paymentStatus,
            totalAmount: order.amount.totalAmount,

            items: order.items.map((item: any) => ({
                bookId: item.bookId?._id,
                bookName: item.bookId?.name,
                author: item.bookId?.author,
                coverImage: item.bookId?.coverImage,

                quantity: item.quantity,
                itemStatus: item.itemStatus,

                rentalDuration: item.rental?.rentalDuration,
            })),
        }));

        return {
            orders: formattedOrders,
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
        const order = await Order.findById(orderId).populate({
            path: "items.bookId",
            select: "name author coverImage language edition purchasePrice rentalPricePerDay rentalPricePerWeek rentalPricePerMonth securityDeposit",
        });

        if (!order) {
            throw new Error("Order not found.");
        }

        return order;
    } catch (error) {
        return error;
    }
};

// //Create Order

export const createOrderService = async (orderData: any) => {
    try {
        const { userId, items, shippingAddress, billingAddress, payment, amount, createdBy } =
            orderData;

        // ================= User Validation =================

        const user = await User.findById(userId);

        if (!user) {
            throw new Error("User not found.");
        }

        const orderItems = [];

        let calculatedRentalAmount = 0;
        let calculatedSecurityDeposit = 0;

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

            if (!book.availableForRent) {
                throw new Error(`${book.name} is not available for rent.`);
            }

            // ================= Rental Calculation =================

            let rentalPrice = 0;
            let rentalDuration = 0;

            const rentStartDate = new Date();
            const expectedReturnDate = new Date(rentStartDate);

            switch (item.rentalType) {
                case "day":
                    rentalPrice = Number(book.rentalPricePerDay);
                    rentalDuration = 1;
                    expectedReturnDate.setDate(expectedReturnDate.getDate() + 1);
                    break;

                case "week":
                    rentalPrice = Number(book.rentalPricePerWeek);
                    rentalDuration = 7;
                    expectedReturnDate.setDate(expectedReturnDate.getDate() + 7);
                    break;

                case "month":
                    rentalPrice = Number(book.rentalPricePerMonth);
                    rentalDuration = 30;
                    expectedReturnDate.setDate(expectedReturnDate.getDate() + 30);
                    break;

                default:
                    throw new Error("Invalid rental type.");
            }

            calculatedRentalAmount += rentalPrice * item.quantity;

            calculatedSecurityDeposit += Number(book.securityDeposit) * item.quantity;

            orderItems.push({
                bookId: new mongoose.Types.ObjectId(book._id),

                sellerId: new mongoose.Types.ObjectId(book.sellerId),

                quantity: item.quantity,

                itemStatus: OrderStatus.PENDING,

                rental: {
                    rentalPrice,

                    securityDeposit: Number(book.securityDeposit),

                    rentalDuration,

                    rentStartDate,

                    expectedReturnDate,

                    actualReturnDate: null,

                    extensionCount: 0,

                    maximumExtensions: 2,

                    extendedUntil: null,

                    lateFee: 0,
                },

                deposit: {
                    amount: Number(book.securityDeposit),

                    status: "pending",

                    refundedAmount: 0,

                    deductionAmount: 0,

                    deductionReason: "",

                    refundedDate: null,
                },
            });
        }

        // ================= Amount Validation =================

        const calculatedTotal =
            calculatedRentalAmount +
            calculatedSecurityDeposit +
            Number(amount.deliveryFee) +
            Number(amount.tax) -
            Number(amount.discount);

        if (Number(amount.rentalAmount) !== calculatedRentalAmount) {
            throw new Error(`Rental Amount mismatch. Expected ${calculatedRentalAmount}`);
        }

        if (Number(amount.securityDeposit) !== calculatedSecurityDeposit) {
            throw new Error(`Security Deposit mismatch. Expected ${calculatedSecurityDeposit}`);
        }

        if (Number(amount.totalAmount) !== calculatedTotal) {
            throw new Error(`Total Amount mismatch. Expected ${calculatedTotal}`);
        }

        // Continue with Order Creation in Part 2B...
        // ================= Generate Order Number =================

        const orderNumber = `ORD${Date.now()}`;

        // ================= Create Order =================

        const order = await Order.create({
            orderNumber,

            userId,

            items: orderItems,

            shippingAddress,

            billingAddress,

            payment: {
                paymentMethod: payment.paymentMethod,
                paymentStatus: PaymentStatus.SUCCESS,
                transactionId: payment.transactionId,
                paidAt: new Date(),
            },

            amount: {
                rentalAmount: calculatedRentalAmount,
                securityDeposit: calculatedSecurityDeposit,
                deliveryFee: Number(amount.deliveryFee),
                discount: Number(amount.discount),
                tax: Number(amount.tax),
                totalAmount: calculatedTotal,
                refundAmount: 0,
            },

            orderStatus: OrderStatus.PENDING,

            createdBy,

            updatedBy: createdBy,

            isActive: true,
        });

        // ================= Return Order =================

        return await Order.findById(order._id)
            .populate("items.bookId", "name author publisher language isbn edition coverImage")
            .populate("items.sellerId", "firstName lastName")
            .populate("userId", "firstName lastName email phone");
    } catch (error) {
        throw error;
    }
};

export const getOrderByUserIdService = async (userId: string, query: any = {}) => {
    try {
        const { skip, limit, page } = buildPaginationQuery(query);

        const { orderStatus } = query;

        const filter: any = {
            userId,
            isActive: true,
        };

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
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const formattedOrders = orders.map((order: any) => ({
            orderId: order._id,

            orderNumber: order.orderNumber,

            orderDate: order.createdAt,

            orderStatus: order.orderStatus,

            paymentStatus: order.payment.paymentStatus,

            totalAmount: order.amount.totalAmount,

            totalBooks: order.items.length,

            items: order.items.map((item: any) => ({
                bookId: item.bookId?._id,

                name: item.bookId?.name,

                author: item.bookId?.author,

                coverImage: item.bookId?.coverImage,

                quantity: item.quantity,

                itemStatus: item.itemStatus,

                rentalType:
                    item.rental.rentalDuration === 1
                        ? "day"
                        : item.rental.rentalDuration === 7
                          ? "week"
                          : "month",

                rentalPrice: item.rental.rentalPrice,

                securityDeposit: item.rental.securityDeposit,

                totalPrice: item.quantity * (item.rental.rentalPrice + item.rental.securityDeposit),
            })),
        }));

        return {
            orders: formattedOrders,

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

export const getSellerDashboardService = async (sellerUserId: string) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(sellerUserId)) {
            throw new Error("Invalid seller user ID");
        }

        const sellerObjectId = new mongoose.Types.ObjectId(sellerUserId);

        // ── Aggregation for order-related stats ──
        const orderStats = await Order.aggregate([
            // Match orders containing at least one item from this seller
            { $match: { "items.sellerId": sellerObjectId } },

            // Unwind items to work with individual items
            { $unwind: "$items" },

            // Filter only items belonging to this seller
            { $match: { "items.sellerId": sellerObjectId } },

            // Group to compute stats
            {
                $group: {
                    _id: null,
                    totalOrders: { $addToSet: "$_id" },
                    activeItems: {
                        $sum: {
                            $cond: [
                                { $in: ["$items.itemStatus", ["pending", "confirmed", "shipped"]] },
                                1,
                                0,
                            ],
                        },
                    },
                    completedItems: {
                        $sum: {
                            $cond: [{ $eq: ["$items.itemStatus", "delivered"] }, 1, 0],
                        },
                    },
                    returnedItems: {
                        $sum: {
                            $cond: [{ $eq: ["$items.itemStatus", "returned"] }, 1, 0],
                        },
                    },
                    cancelledItems: {
                        $sum: {
                            $cond: [{ $eq: ["$items.itemStatus", "cancelled"] }, 1, 0],
                        },
                    },
                    // For earnings: sum subtotal from orders where this seller has delivered items
                    // Note: subtotal is at order level; we approximate seller earnings
                    // by proportionally splitting order subtotal across items
                    totalEarnings: {
                        $sum: {
                            $cond: [
                                { $eq: ["$items.itemStatus", "delivered"] },
                                {
                                    $multiply: [
                                        { $divide: ["$subtotal", { $size: "$items" }] },
                                        "$items.quantity",
                                    ],
                                },
                                0,
                            ],
                        },
                    },
                },
            },

            // Project final shape
            {
                $project: {
                    _id: 0,
                    totalOrders: { $size: "$totalOrders" },
                    activeOrdersCount: "$activeItems",
                    completedOrdersCount: "$completedItems",
                    returnedOrdersCount: "$returnedItems",
                    cancelledOrdersCount: "$cancelledItems",
                    totalEarnings: { $round: ["$totalEarnings", 2] },
                },
            },
        ]);

        // ── Book-related stats ──
        const totalBooks = await Book.countDocuments({ sellerId: sellerObjectId });
        const availableBooksCount = await Book.countDocuments({
            sellerId: sellerObjectId,
            isAvailable: true,
            quantity: { $gt: 0 },
        });

        // Default stats if no orders exist
        const stats = orderStats[0] || {
            totalOrders: 0,
            activeOrdersCount: 0,
            completedOrdersCount: 0,
            returnedOrdersCount: 0,
            cancelledOrdersCount: 0,
            totalEarnings: 0,
        };

        return {
            ...stats,
            totalBooks,
            availableBooksCount,
        };
    } catch (error) {
        throw error;
    }
};

export const getOrderBookDetailsService = async (orderId: string, bookId: string) => {
    const order: any = await Order.findById(orderId)
        .populate({
            path: "items.bookId",
            select: "name author publisher language isbn categoryId edition coverImage",
            populate: {
                path: "categoryId",
                select: "name",
            },
        })
        .populate({
            path: "items.sellerId",
            select: "name",
        });

    if (!order) {
        throw new Error("Order not found.");
    }

    const orderItem = order.items.find((item: any) => item.bookId?._id.toString() === bookId);

    if (!orderItem) {
        throw new Error("Book not found in this order.");
    }

    return {
        orderId: order._id,

        orderNumber: order.orderNumber,

        orderDate: order.createdAt,

        orderStatus: order.orderStatus,

        quantity: orderItem.quantity,

        itemStatus: orderItem.itemStatus,

        book: {
            _id: orderItem.bookId._id,
            name: orderItem.bookId.name,
            author: orderItem.bookId.author,
            publisher: orderItem.bookId.publisher,
            language: orderItem.bookId.language,
            isbn: orderItem.bookId.isbn,
            category: orderItem.bookId.categoryId?.name,
            edition: orderItem.bookId.edition,
            coverImage: orderItem.bookId.coverImage,
        },

        seller: {
            _id: orderItem.sellerId?._id,
            name: orderItem.sellerId?.name,
        },

        rental: {
            rentalPrice: orderItem.rental.rentalPrice,
            securityDeposit: orderItem.rental.securityDeposit,
            rentalDuration: orderItem.rental.rentalDuration,
            rentStartDate: orderItem.rental.rentStartDate,
            expectedReturnDate: orderItem.rental.expectedReturnDate,
            actualReturnDate: orderItem.rental.actualReturnDate,
            extensionCount: orderItem.rental.extensionCount,
            maximumExtensions: orderItem.rental.maximumExtensions,
            extendedUntil: orderItem.rental.extendedUntil,
            lateFee: orderItem.rental.lateFee,
        },

        shippingAddress: {
            name: order.shippingAddress.name,
            phone: order.shippingAddress.phone,
            addressLine1: order.shippingAddress.addressLine1,
            addressLine2: order.shippingAddress.addressLine2,
            landmark: order.shippingAddress.landmark,
            city: order.shippingAddress.city,
            state: order.shippingAddress.state,
            pincode: order.shippingAddress.pincode,
            country: order.shippingAddress.country,
        },

        billingAddress: {
            name: order.billingAddress.name,
            phone: order.billingAddress.phone,
            addressLine1: order.billingAddress.addressLine1,
            addressLine2: order.billingAddress.addressLine2,
            landmark: order.billingAddress.landmark,
            city: order.billingAddress.city,
            state: order.billingAddress.state,
            pincode: order.billingAddress.pincode,
            country: order.billingAddress.country,
        },

        payment: {
            paymentMethod: order.payment.paymentMethod,
            paymentStatus: order.payment.paymentStatus,
            transactionId: order.payment.transactionId,
            paidAt: order.payment.paidAt,
        },

        priceSummary: {
            rentalAmount: order.amount.rentalAmount,
            securityDeposit: order.amount.securityDeposit,
            deliveryFee: order.amount.deliveryFee,
            discount: order.amount.discount,
            tax: order.amount.tax,
            totalAmount: order.amount.totalAmount,
            refundAmount: order.amount.refundAmount,
        },

        deposit: {
            amount: orderItem.deposit.amount,
            status: orderItem.deposit.status,
            refundedAmount: orderItem.deposit.refundedAmount,
            deductionAmount: orderItem.deposit.deductionAmount,
            deductionReason: orderItem.deposit.deductionReason,
            refundedDate: orderItem.deposit.refundedDate,
        },
    };
};

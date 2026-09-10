import mongoose, { Types } from "mongoose";
import Book from "../models/Book";
import Order, { OrderStatus, PaymentStatus, ItemStatus, OrderItemSchema, DepositStatus, ShipmentType, OrderType } from "../models/Order";

import User from "../models/User";
import { buildPaginationQuery } from "../utils/appFunctions";
import { Messages, PaymentMethod } from "../utils/constants";
import { StatusCode } from "../utils/StatusCodes";
import { applyItemUpdates, applyTopLevelUpdates, syncBookStatuses, syncOrderStatusFromItems, validateAndResolveItems, validateOrderStatusTransition, validatePaymentStatusTransition } from "../utils/updateOrderFunction";
import { buildOrderPipeline, formatOrderRecords, OrderQuery } from "./orderFilters";
import { createReturnShipmentFromOrder, createShipmentFromOrder } from "../helper/shipmentHelper";
import { sendEmail } from "./email.service";
import { sendOrderStatusEmail, getShipmentEvent, getOutForDeliveryEvent, getDeliveredEvent } from "./orderEmail.service";
import Transaction, { TransactionDirection, TransactionStatus, TransactionType } from "../models/Transaction";
import { createTransaction } from "./transaction.service";
import { getAllAuctionBidsService } from "./auctionBidService";
const { compileTemplate } = require("../templates/template");

//getAll Order
export const getAllOrdersService = async (query: OrderQuery) => {
    try {
        const { skip, limit, page } = buildPaginationQuery(query);

        // 1. Generate the pipeline architecture arrays
        const pipeline = buildOrderPipeline(query, skip, limit);

        // 2. Query execution runtime
        const [facetResult] = await Order.aggregate(pipeline);

        const rawOrders = facetResult?.data || [];
        const totalRecords = facetResult?.totalCount?.[0]?.count || 0;
        const totalPages = Math.ceil(totalRecords / limit) || 1;
        const hasMore = page < totalPages;

        // // 3. Format and payload adjustments
        const orders = formatOrderRecords(rawOrders);

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
        const order = await Order.findById(orderId).populate({
            path: "items.bookId",
            select: "name author coverImage language edition purchasePrice rentalPricePerDay rentalPricePerWeek rentalPricePerMonth securityDeposit ",
        });

        if (!order) {
            throw new Error("Order not found.");
        }

        return order;
    } catch (error) {
        return error;
    }
};

const createTransactionBreakup = (
    orderItems: any[],
    amount: any
) => {
    const totalItemBaseAmount = orderItems.reduce(
        (sum: number, item: any) => {
            const rentalAmount = Number(
                item.rental?.rentalPrice || 0
            );

            const securityDeposit = Number(
                item.deposit?.amount || 0
            );

            // For BUY and AUCTION orders, the item amount
            // will be derived from the total item amount.
            return (
                sum +
                rentalAmount +
                securityDeposit
            );
        },
        0
    );

    const deliveryFee = Number(amount.deliveryFee) || 0;
    const discount = Number(amount.discount) || 0;
    const tax = Number(amount.tax) || 0;

    let allocatedDeliveryFee = 0;
    let allocatedDiscount = 0;
    let allocatedTax = 0;

    return orderItems.map(
        (item: any, index: number) => {
            const rentalAmount = Number(
                item.rental?.rentalPrice || 0
            );

            const securityDeposit = Number(
                item.deposit?.amount || 0
            );

            let itemBaseAmount =
                rentalAmount + securityDeposit;

            // For BUY or AUCTION orders, rental is null.
            // Since auction orders currently contain one item,
            // use the complete itemAmount.
            if (itemBaseAmount === 0) {
                itemBaseAmount =
                    Number(amount.itemAmount || 0);
            }

            const effectiveTotalBaseAmount =
                totalItemBaseAmount > 0
                    ? totalItemBaseAmount
                    : Number(amount.itemAmount || 0);

            const ratio =
                effectiveTotalBaseAmount > 0
                    ? itemBaseAmount /
                    effectiveTotalBaseAmount
                    : 0;

            const isLastItem =
                index === orderItems.length - 1;

            // Give any rounding remainder to the last item
            const itemDeliveryFee = isLastItem
                ? deliveryFee - allocatedDeliveryFee
                : Number(
                    (deliveryFee * ratio).toFixed(2)
                );

            const itemDiscount = isLastItem
                ? discount - allocatedDiscount
                : Number(
                    (discount * ratio).toFixed(2)
                );

            const itemTax = isLastItem
                ? tax - allocatedTax
                : Number(
                    (tax * ratio).toFixed(2)
                );

            allocatedDeliveryFee += itemDeliveryFee;
            allocatedDiscount += itemDiscount;
            allocatedTax += itemTax;

            const itemTotalAmount =
                itemBaseAmount +
                itemDeliveryFee +
                itemTax -
                itemDiscount;

            return {
                orderItemId: item._id,
                bookId: item.bookId,
                sellerId: item.sellerId,

                rentalAmount,

                securityDeposit,

                itemAmount: Number(
                    itemBaseAmount.toFixed(2)
                ),

                deliveryFee: itemDeliveryFee,

                discount: itemDiscount,

                tax: itemTax,

                totalAmount: Number(
                    itemTotalAmount.toFixed(2)
                ),
            };
        }
    );
};

export const createOrderService = async (orderData: any) => {
    try {
        const {
            userId,
            items,
            shippingAddress,
            billingAddress,
            payment,
            amount,
            createdBy,
            orderType = OrderType.RENT,
        } = orderData;

        // =====================================================
        // VALIDATE ORDER TYPE
        // =====================================================

        if (!Object.values(OrderType).includes(orderType)) {
            throw new Error(
                "Invalid order type. Allowed values are buy, rent and auction."
            );
        }

        // =====================================================
        // USER VALIDATION
        // =====================================================

        const user = await User.findById(userId);

        if (!user) {
            throw new Error("User not found.");
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            throw new Error("Order should contain at least one book.");
        }

        // Auction orders should contain only one book
        if (
            orderType === OrderType.AUCTION &&
            items.length !== 1
        ) {
            throw new Error(
                "An auction order must contain exactly one book."
            );
        }

        const orderItems = [];

        let calculatedItemAmount = 0;
        let calculatedSecurityDeposit = 0;

        // This will be automatically generated from the book
        let formattedAuctionDetails = null;

        // =====================================================
        // PROCESS ORDER ITEMS
        // =====================================================

        for (const item of items) {
            const book = await Book.findById(item.bookId);


            if (!book) {
                throw new Error(
                    `Book not found: ${item.bookId}`
                );
            }

            if (!book.isActive) {
                throw new Error(
                    `${book.name} is inactive.`
                );
            }

            if (!book.isAvailable) {
                throw new Error(
                    `${book.name} is unavailable.`
                );
            }

            const quantity = Number(item.quantity || 1);

            if (quantity < 1) {
                throw new Error(
                    "Item quantity must be at least 1."
                );
            }

            // =================================================
            // BASE ORDER ITEM
            // =================================================

            const orderItem: any = {
                bookId: new mongoose.Types.ObjectId(book._id),

                sellerId: new mongoose.Types.ObjectId(
                    book.sellerId
                ),

                quantity,

                itemStatus: ItemStatus.PENDING,

                rental: null,

                deposit: null,

                shipmentDetails: [],
            };

            // =================================================
            // RENT ORDER
            // =================================================

            if (orderType === OrderType.RENT) {
                if (!book.availableForRent) {
                    throw new Error(
                        `${book.name} is not available for rent.`
                    );
                }

                let rentalPrice = 0;
                let rentalDuration = 0;

                const rentStartDate = new Date();

                const expectedReturnDate = new Date(
                    rentStartDate
                );

                switch (item.rentalType) {
                    case "day":
                        rentalPrice = Number(
                            book.rentalPricePerDay
                        );

                        rentalDuration = 1;

                        expectedReturnDate.setDate(
                            expectedReturnDate.getDate() + 1
                        );

                        break;

                    case "week":
                        rentalPrice = Number(
                            book.rentalPricePerWeek
                        );

                        rentalDuration = 7;

                        expectedReturnDate.setDate(
                            expectedReturnDate.getDate() + 7
                        );

                        break;

                    case "month":
                        rentalPrice = Number(
                            book.rentalPricePerMonth
                        );

                        rentalDuration = 30;

                        expectedReturnDate.setDate(
                            expectedReturnDate.getDate() + 30
                        );

                        break;

                    default:
                        throw new Error(
                            `Invalid rental type for ${book.name}.`
                        );
                }

                if (!rentalPrice || rentalPrice <= 0) {
                    throw new Error(
                        `Rental price is not configured for ${book.name}.`
                    );
                }

                const securityDeposit = Number(
                    book.securityDeposit || 0
                );

                calculatedItemAmount +=
                    rentalPrice * quantity;

                calculatedSecurityDeposit +=
                    securityDeposit * quantity;

                orderItem.rental = {
                    rentalPrice,

                    securityDeposit,

                    rentalDuration,

                    rentStartDate,

                    expectedReturnDate,

                    actualReturnDate: null,

                    extensionCount: 0,

                    maximumExtensions: 2,

                    extendedUntil: null,

                    lateFee: 0,
                };

                orderItem.deposit = {
                    amount: securityDeposit,

                    status: DepositStatus.PENDING,

                    refundedAmount: 0,

                    deductionAmount: 0,

                    deductionReason: "",

                    refundedDate: null,
                };
            }



            // =================================================
            // AUCTION ORDER
            // =================================================

            // =================================================
            // AUCTION ORDER
            // =================================================

            if (orderType === OrderType.AUCTION) {
                // Auction quantity should always be one
                if (quantity !== 1) {
                    throw new Error(
                        "Auction order quantity must be 1."
                    );
                }

                if (!book?.auctionId) {
                    throw new Error(
                        `Auction ID not found for book: ${book.name}`
                    );
                }

                // =============================================
                // GET AUCTION DETAILS FROM AUCTION SERVICE
                // =============================================

                const auctionResponse =
                    await getAllAuctionBidsService(
                        book.auctionId.toString()
                    );



                // =============================================
                // VALIDATE AUCTION RESPONSE
                // =============================================

                const auctionData =
                    (auctionResponse as any)?.data ??
                    auctionResponse;

                if (!auctionData?.auction) {
                    throw new Error(
                        `Auction details not found for book: ${book.name}`
                    );
                }

                if (
                    !auctionData?.bids ||
                    !Array.isArray(auctionData.bids) ||
                    auctionData.bids.length === 0
                ) {
                    throw new Error(
                        `No bids found for auction: ${book.auctionId}`
                    );
                }

                // =============================================
                // GET WINNING BID
                // Rank 1 is considered the winning bid
                // =============================================

                const winningBid = auctionData.bids.find(
                    (bid: any) =>
                        bid.rank == 1

                );

                if (!winningBid) {
                    throw new Error(
                        "Winning bid not found for this auction."
                    );
                }

                // =============================================
                // VALIDATE WINNER
                // =============================================

                const winnerId =
                    winningBid?.user?.userId;

                if (!winnerId) {
                    throw new Error(
                        "Winner details not found for this auction."
                    );
                }

                if (
                    winnerId.toString() !==
                    userId.toString()
                ) {
                    throw new Error(
                        "Only the auction winner can create this order."
                    );
                }

                // =============================================
                // VALIDATE WINNING BID AMOUNT
                // =============================================

                const winningAmount = Number(
                    winningBid.bidPrice
                );

                if (
                    !winningAmount ||
                    winningAmount <= 0
                ) {
                    throw new Error(
                        "Invalid winning bid amount."
                    );
                }

                // =============================================
                // VALIDATE AUCTION BOOK
                // =============================================

                if (
                    auctionData.auction.bookId.toString() !==
                    book._id.toString()
                ) {
                    throw new Error(
                        "Auction book does not match the order book."
                    );
                }

                // =============================================
                // CALCULATE AUCTION AMOUNT
                // =============================================

                calculatedItemAmount +=
                    winningAmount;

                // =============================================
                // CREATE AUCTION DETAILS
                // =============================================

                formattedAuctionDetails = {
                    auctionId: new mongoose.Types.ObjectId(
                        auctionData.auction._id
                    ),

                    winningBidId:
                        new mongoose.Types.ObjectId(
                            winningBid._id
                        ),

                    winningBidAmount:
                        winningAmount,

                    winnerId:
                        new mongoose.Types.ObjectId(
                            winnerId
                        ),

                    // Since the response does not contain
                    // a completed/won date, we use the
                    // order creation time
                    wonAt: new Date(),
                };
            }

            // =================================================
            // ADD ORDER ITEM
            // =================================================

            orderItems.push(orderItem);
        }

        // =====================================================
        // AMOUNT CALCULATION
        // =====================================================

        const deliveryFee = Number(
            amount?.deliveryFee || 0
        );

        const discount = Number(
            amount?.discount || 0
        );

        const tax = Number(
            amount?.tax || 0
        );

        const calculatedTotal =
            calculatedItemAmount +
            calculatedSecurityDeposit +
            deliveryFee +
            tax -
            discount;

        // =====================================================
        // AMOUNT VALIDATION
        // =====================================================

        // The item amount is calculated by the backend
        // This validation is optional because frontend
        // doesn't need to send itemAmount.

        if (
            amount?.itemAmount !== undefined &&
            Number(amount.itemAmount) !==
            calculatedItemAmount
        ) {
            throw new Error(
                `Item Amount mismatch. Expected ${calculatedItemAmount}`
            );
        }

        if (
            amount?.securityDeposit !== undefined &&
            Number(amount.securityDeposit) !==
            calculatedSecurityDeposit
        ) {
            throw new Error(
                `Security Deposit mismatch. Expected ${calculatedSecurityDeposit}`
            );
        }

        if (
            amount?.totalAmount !== undefined &&
            Number(amount.totalAmount) !==
            calculatedTotal
        ) {
            throw new Error(
                `Total Amount mismatch. Expected ${calculatedTotal}`
            );
        }

        // =====================================================
        // GENERATE ORDER NUMBER
        // =====================================================

        const orderNumber = `ORD${Date.now()}`;

        // =====================================================
        // PAYMENT VALIDATION
        // =====================================================

        if (!payment?.paymentMethod) {
            throw new Error(
                "Payment method is required."
            );
        }

        const paymentMethod =
            payment.paymentMethod.toUpperCase();

        const isCOD =
            paymentMethod === PaymentMethod.COD;

        const isCash =
            paymentMethod === PaymentMethod.COD;

        const requiresOnlineTransaction =
            !isCOD && !isCash;

        if (
            requiresOnlineTransaction &&
            !payment.transactionId
        ) {
            throw new Error(
                "Transaction ID is required for online payments."
            );
        }

        const paymentStatus =
            isCOD || isCash
                ? PaymentStatus.PENDING
                : PaymentStatus.SUCCESS;

        const paidAt =
            requiresOnlineTransaction
                ? new Date()
                : null;

        // =====================================================
        // CREATE ORDER
        // =====================================================

        const order = await Order.create({
            orderNumber,

            orderType,

            userId,

            items: orderItems,

            // Automatically retrieved auction details
            auctionDetails:
                formattedAuctionDetails,

            shippingAddress,

            billingAddress,

            payment: {
                paymentMethod,

                paymentStatus,

                transactionId:
                    requiresOnlineTransaction
                        ? payment.transactionId
                        : null,

                paidAt,
            },

            amount: {
                itemAmount:
                    calculatedItemAmount,

                securityDeposit:
                    calculatedSecurityDeposit,

                deliveryFee,

                discount,

                tax,

                totalAmount:
                    calculatedTotal,

                refundAmount: 0,
            },

            orderStatus:
                OrderStatus.PENDING,

            createdBy,

            updatedBy: createdBy,

            isActive: true,
        });

        // =====================================================
        // CREATE TRANSACTION
        // =====================================================
        console.log('dkjsfnjksdjkfjdsjfnj')
        if (requiresOnlineTransaction) {
            const transactionBreakup =
                createTransactionBreakup(
                    order.items,
                    {
                        itemAmount:
                            calculatedItemAmount,

                        securityDeposit:
                            calculatedSecurityDeposit,

                        deliveryFee,

                        discount,

                        tax,

                        totalAmount:
                            calculatedTotal,
                    }
                );

            await createTransaction({
                transactionId:
                    payment.transactionId,

                orderId: order._id,

                userId,

                transactionType:
                    TransactionType.PAYMENT,

                totalAmount:
                    calculatedTotal,

                paymentMethod,

                paymentStatus:
                    TransactionStatus.SUCCESS,

                gatewayTransactionId:
                    payment.transactionId,

                breakup:
                    transactionBreakup,
            });
        }

        // =====================================================
        // GET CREATED ORDER
        // =====================================================

        const createdOrder: any =
            await Order.findById(order._id)
                .populate(
                    "items.bookId",
                    "name author publisher language isbn edition coverImage"
                )
                .populate(
                    "items.sellerId",
                    "firstName lastName"
                )
                .populate(
                    "userId",
                    "firstName lastName email phone"
                )
                .populate(
                    "auctionDetails.auctionId"
                );

        if (!createdOrder) {
            throw new Error(
                "Order created but could not be retrieved."
            );
        }

        // =====================================================
        // SEND ORDER CONFIRMATION EMAIL
        // =====================================================

        const createdUser: any =
            createdOrder.userId;

        if (createdUser?.email) {
            try {
                const orderId =
                    createdOrder._id.toString();

                const bookId =
                    createdOrder.items?.[0]?.bookId?._id
                        ? createdOrder.items[0]
                            .bookId._id.toString()
                        : createdOrder.items?.[0]?.bookId?.toString();

                const trackingUrl =
                    `${process.env.FRONTEND_HOST}` +
                    `/order-details?orderId=${orderId}` +
                    `&bookId=${bookId}`;

                const html = compileTemplate(
                    "orderConfirmationEmail.hbs",
                    {
                        title:
                            "Order Confirmation",

                        orderNumber:
                            createdOrder.orderNumber,

                        orderId,

                        trackingUrl,

                        orderType:
                            createdOrder.orderType,

                        year:
                            new Date().getFullYear(),
                    }
                );

                await sendEmail(
                    [
                        {
                            Email:
                                createdUser.email,

                            Name:
                                `${createdUser.firstName || ""} ` +
                                `${createdUser.lastName || ""}`.trim(),
                        },
                    ],
                    "Order Confirmation",
                    html
                );
            } catch (emailError) {
                console.error(
                    "Order created successfully, but email sending failed:",
                    emailError
                );
            }
        }

        return createdOrder;

    } catch (error) {
        throw error;
    }
};


export const getOrderByUserIdService = async (
    userId: string,
    query: any = {}
) => {
    try {
        // 1. Destructure all filter params safely from the incoming query first
        const { orderStatus, orderType } = query;
        
        // 2. Compute pagination limits safely
        const { skip, limit, page } = buildPaginationQuery(query);

        // ================= FILTER =================

        const filter: any = {
            userId: new Types.ObjectId(userId), // Ensure 'new' keyword is present
            isActive: true,
        };

        console.log('Incoming Filters:', { orderStatus, orderType });

        // 3. Robust clean-up check handling case-insensitivity (.toUpperCase())
        if (orderStatus && String(orderStatus).toUpperCase() !== "ALL") {
            // If your DB expects uppercase enums, force uppercase here: String(orderStatus).toUpperCase()
            filter.orderStatus = orderStatus; 
        }

        if (orderType && String(orderType).toUpperCase() !== "ALL") {
            // If your DB expects uppercase enums, force uppercase here: String(orderType).toUpperCase()
            filter.orderType = orderType;
        }

        console.log('Final MongoDB Query Filter Object:', filter);

        // ================= PAGINATION =================

        const totalRecords = await Order.countDocuments(filter);
        const totalPages = Math.ceil(totalRecords / limit);
        const hasMore = page < totalPages;

        // ================= GET ORDERS =================

        const orders = await Order.find(filter)
            .populate({
                path: "items.bookId",
                select: "name author coverImage",
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // ================= FORMAT ORDERS =================
        const formattedOrders = orders.map((order: any) => {
            const isAuctionOrder = order.orderType === OrderType.AUCTION;

            return {
                orderId: order._id,
                orderNumber: order.orderNumber,
                orderType: order.orderType,
                orderDate: order.createdAt,
                orderStatus: order.orderStatus,
                paymentStatus: order.payment?.paymentStatus,
                totalAmount: order.amount?.totalAmount,
                totalBooks: order.items?.length || 0,

                // ================= AUCTION DETAILS =================
                auctionDetails: isAuctionOrder && order.auctionDetails
                    ? {
                        auctionId: order.auctionDetails.auctionId,
                        winningBidId: order.auctionDetails.winningBidId,
                        winningBidAmount: order.auctionDetails.winningBidAmount,
                        winnerId: order.auctionDetails.winnerId,
                        wonAt: order.auctionDetails.wonAt,
                    }
                    : null,

                // ================= ITEMS =================
                items: (order.items || []).map((item: any) => {
                    const rentalDuration = item.rental?.rentalDuration;
                    let rentalType = null;

                    if (rentalDuration === 1) {
                        rentalType = "day";
                    } else if (rentalDuration === 7) {
                        rentalType = "week";
                    } else if (rentalDuration) {
                        rentalType = "month";
                    }

                    const rentalPrice = Number(item.rental?.rentalPrice || 0);
                    const securityDeposit = Number(item.rental?.securityDeposit || 0);
                    const quantity = Number(item.quantity || 1);

                    return {
                        bookId: item.bookId?._id,
                        name: item.bookId?.name,
                        author: item.bookId?.author,
                        coverImage: item.bookId?.coverImage,
                        quantity,
                        itemStatus: item.itemStatus,

                        // ================= RENT DETAILS =================
                        rentalType,
                        rentalPrice,
                        securityDeposit,
                        totalPrice: quantity * (rentalPrice + securityDeposit),
                    };
                }),
            };
        });

        // ================= RESPONSE =================
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
        console.error("Error in getOrderByUserIdService:", error);
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

// Service 1: Recent Seller Orders (item-level, default limit 5)
export const getSellerRecentOrdersService = async (
    sellerUserId: string,
    query: { page?: number; limit?: number } = {}
) => {
    try {
        const { skip, limit, page } = buildPaginationQuery({ ...query, limit: query.limit || 5 });

        // Find orders containing seller's items, then unwind + match to get only seller items
        const [result] = await Order.aggregate([
            { $match: { "items.sellerId": new mongoose.Types.ObjectId(sellerUserId) } },
            { $unwind: "$items" },
            { $match: { "items.sellerId": new mongoose.Types.ObjectId(sellerUserId) } },
            {
                $lookup: {
                    from: "books",
                    localField: "items.bookId",
                    foreignField: "_id",
                    as: "book",
                },
            },
            { $unwind: { path: "$book", preserveNullAndEmptyArrays: true } },
            { $sort: { createdAt: -1 } },
            {
                $facet: {
                    metadata: [{ $count: "totalRecords" }],
                    data: [
                        { $skip: skip },
                        { $limit: limit },
                        {
                            $project: {
                                _id: 0,
                                orderId: "$_id",
                                orderItemId: "$items._id",
                                orderNumber: 1,
                                bookId: "$items.bookId",
                                bookName: { $ifNull: ["$book.name", "Unknown"] },
                                rentalPrice: { $ifNull: ["$items.rental.rentalPrice", 0] },
                                status: "$items.itemStatus",
                                date: "$createdAt",
                            },
                        },
                    ],
                },
            },
        ]);

        const orders = result?.data || [];
        const totalRecords = result?.metadata?.[0]?.totalRecords || 0;
        const totalPages = Math.ceil(totalRecords / limit);
        const hasMore = page < totalPages;

        return {
            orders,
            meta: { totalRecords, totalPages, currentPage: page, limit, hasMore },
        };
    } catch (error) {
        throw error;
    }
};

// Service 2: All Seller Orders (item-level with buyer name + status filter)
export const getSellerAllOrdersService = async (
    sellerUserId: string,
    query: { page?: number; limit?: number; status?: string } = {}
) => {
    try {
        const { skip, limit, page } = buildPaginationQuery(query);

        const matchStage: any = {
            "items.sellerId": new mongoose.Types.ObjectId(sellerUserId),
        };

        // If status filter is provided, filter at item level
        if (query.status && query.status !== "ALL") {
            matchStage["items.itemStatus"] = query.status;
        }

        const [result] = await Order.aggregate([
            { $match: { "items.sellerId": new mongoose.Types.ObjectId(sellerUserId) } },
            { $unwind: "$items" },
            { $match: matchStage },
            {
                $lookup: {
                    from: "books",
                    localField: "items.bookId",
                    foreignField: "_id",
                    as: "book",
                },
            },
            { $unwind: { path: "$book", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "buyer",
                },
            },
            { $unwind: { path: "$buyer", preserveNullAndEmptyArrays: true } },
            { $sort: { createdAt: -1 } },
            {
                $facet: {
                    metadata: [{ $count: "totalRecords" }],
                    data: [
                        { $skip: skip },
                        { $limit: limit },
                        {
                            $project: {
                                _id: 0,
                                orderId: "$_id",
                                orderItemId: "$items._id",
                                orderNumber: 1,
                                bookId: "$items.bookId",
                                bookName: { $ifNull: ["$book.name", "Unknown"] },
                                rentalPrice: { $ifNull: ["$items.rental.rentalPrice", 0] },
                                status: "$items.itemStatus",
                                date: "$createdAt",
                                buyerName: {
                                    $concat: [
                                        { $ifNull: ["$buyer.firstName", ""] },
                                        " ",
                                        { $ifNull: ["$buyer.lastName", ""] },
                                    ],
                                },
                            },
                        },
                    ],
                },
            },
        ]);

        const orders = result?.data || [];
        const totalRecords = result?.metadata?.[0]?.totalRecords || 0;
        const totalPages = Math.ceil(totalRecords / limit);
        const hasMore = page < totalPages;

        return {
            orders,
            meta: { totalRecords, totalPages, currentPage: page, limit, hasMore },
        };
    } catch (error) {
        throw error;
    }
};

// ─── Service 3: Single Order Item Detail for Seller ───
export const getSellerOrderItemDetailService = async (
    sellerUserId: string,
    orderItemId: string
) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(orderItemId)) {
            throw new Error("Invalid order item ID");
        }

        const order = await Order.findOne(
            { "items._id": new mongoose.Types.ObjectId(orderItemId) },
            {
                orderNumber: 1,
                userId: 1,
                shippingAddress: 1,
                billingAddress: 1,
                payment: 1,
                amount: 1,
                orderStatus: 1,
                createdAt: 1,
                items: {
                    $elemMatch: { _id: new mongoose.Types.ObjectId(orderItemId) },
                },
            }
        )
            .populate({
                path: "userId",
                select: "firstName lastName email phone",
            })
            .lean();

        if (!order || !order.items || order.items.length === 0) {
            throw new Error("Order item not found");
        }

        const orderItem = order.items[0] as any;

        if (orderItem.sellerId?.toString() !== sellerUserId) {
            throw new Error("Unauthorized: This order item does not belong to you");
        }

        const book = await Book.findById(orderItem.bookId).select(
            "name author description coverImage images language edition isbn rentalPricePerDay rentalPricePerWeek rentalPricePerMonth purchasePrice securityDeposit quantity isActive isAvailable"
        ).lean();

        // Build payment summary specific to this book/item
        const paymentSummary = {
            rentalAmount: orderItem.rental?.rentalPrice || 0,
            securityDeposit: orderItem.rental?.securityDeposit || 0,
            quantity: orderItem.quantity || 1,
            subtotal: (orderItem.rental?.rentalPrice || 0) * (orderItem.quantity || 1),
            depositTotal: (orderItem.rental?.securityDeposit || 0) * (orderItem.quantity || 1),
            deliveryFee: order.amount?.deliveryFee || 0,
            discount: order.amount?.discount || 0,
            tax: order.amount?.tax || 0,
            totalAmount: order.amount?.totalAmount || 0,
            refundAmount: order.amount?.refundAmount || 0,
            depositStatus: orderItem.deposit?.status || "pending",
            depositRefundedAmount: orderItem.deposit?.refundedAmount || 0,
            depositDeductionAmount: orderItem.deposit?.deductionAmount || 0,
        };

        const timeline = {
            orderCreated: order.createdAt,
            rentStartDate: orderItem.rental?.rentStartDate || null,
            expectedReturnDate: orderItem.rental?.expectedReturnDate || null,
            actualReturnDate: orderItem.rental?.actualReturnDate || null,
            shippedDate: null, // Populate after discussing
            deliveredDate: null, // Populate after discussing
            returnDate: orderItem.rental?.actualReturnDate || null,
        };

        const buyer: any = order.userId || {};
        const buyerInfo = {
            _id: buyer._id,
            firstName: buyer.firstName || "",
            lastName: buyer.lastName || "",
            email: buyer.email || "",
            phone: buyer.phone || "",
            shippingAddress: order.shippingAddress || null,
            billingAddress: order.billingAddress || null,
        };

        return {
            orderId: order._id,
            orderNumber: order.orderNumber,
            orderStatus: order.orderStatus,
            book: book || null,
            rental: {
                rentalDuration: orderItem.rental?.rentalDuration || 0,
                rentStartDate: orderItem.rental?.rentStartDate || null,
                expectedReturnDate: orderItem.rental?.expectedReturnDate || null,
                actualReturnDate: orderItem.rental?.actualReturnDate || null,
                extensionCount: orderItem.rental?.extensionCount || 0,
                lateFee: orderItem.rental?.lateFee || 0,
            },
            shipementDetails: orderItem.shipmentDetails || [],
            itemStatus: orderItem.itemStatus,
            quantity: orderItem.quantity,
            buyer: buyerInfo,
            timeline,
            paymentSummary,
        };
    } catch (error) {
        throw error;
    }
};

export const updateSellerOrderItemStatusService = async (
    sellerUserId: string,
    orderItemId: string,
    action: "approve" | "reject"
) => {
    // =========================================================
    // 1. Validate Order Item ID
    // =========================================================

    if (!mongoose.Types.ObjectId.isValid(orderItemId)) {
        const error: any = new Error("Invalid order item ID.");
        error.statusCode = StatusCode.Bad_Request;
        throw error;
    }

    // =========================================================
    // 2. Find Order
    // =========================================================

    const order = await Order.findOne({
        "items._id": new mongoose.Types.ObjectId(orderItemId),
    });

    if (!order) {
        const error: any = new Error(
            Messages.Seller_Order_Item_Not_Found
        );

        error.statusCode = StatusCode.Not_Found;
        throw error;
    }

    // =========================================================
    // 3. Find Specific Item
    // =========================================================

    const orderItem = order.items.find(
        (item: any) =>
            item._id &&
            item._id.toString() === orderItemId
    );

    if (!orderItem) {
        const error: any = new Error(
            Messages.Seller_Order_Item_Not_Found
        );

        error.statusCode = StatusCode.Not_Found;
        throw error;
    }

    // =========================================================
    // 4. Verify Seller Ownership
    // =========================================================

    if (orderItem.sellerId.toString() !== sellerUserId) {
        const error: any = new Error(
            "Unauthorized: This order item does not belong to you."
        );

        error.statusCode = StatusCode.Unauthorized;
        throw error;
    }

    // =========================================================
    // 5. Only PENDING Items Can Be Processed
    // =========================================================

    if (orderItem.itemStatus !== ItemStatus.PENDING) {
        const error: any = new Error(
            Messages.Order_Item_Already_Processed
        );

        error.statusCode = StatusCode.Bad_Request;
        throw error;
    }

    // =========================================================
    // 6. REJECT
    // =========================================================

    if (action === "reject") {
        orderItem.itemStatus = ItemStatus.REJECTED;

        const allItemsProcessed = order.items.every(
            (item: any) =>
                item.itemStatus === ItemStatus.CONFIRMED ||
                item.itemStatus === ItemStatus.REJECTED
        );

        if (allItemsProcessed) {
            const anyConfirmed = order.items.some(
                (item: any) =>
                    item.itemStatus === ItemStatus.CONFIRMED
            );

            order.orderStatus = anyConfirmed
                ? OrderStatus.CONFIRMED
                : OrderStatus.CANCELLED;
        }

        await order.save();

        return {
            orderItemId,
            itemStatus: orderItem.itemStatus,
            orderStatus: order.orderStatus,
            shipmentCreated: false,
        };
    }

    // =========================================================
    // 7. APPROVE
    // =========================================================

    if (action === "approve") {
        try {
            // -------------------------------------------------
            // Check whether Forward shipment already exists
            // -------------------------------------------------

            const existingForwardShipment =
                orderItem.shipmentDetails?.find(
                    (shipment: any) =>
                        shipment.shipmentType ===
                        ShipmentType.FORWARD
                );

            let shipment = null;

            // -------------------------------------------------
            // Create Forward Shipment only if it does not exist
            // -------------------------------------------------

            if (!existingForwardShipment) {
                shipment = await createShipmentFromOrder(
                    order,
                    orderItem
                );

                if (!shipment) {
                    throw new Error(
                        "Forward shipment creation failed."
                    );
                }

                // -------------------------------------------------
                // Store shipment reference
                // -------------------------------------------------

                orderItem.shipmentDetails =
                    orderItem.shipmentDetails || [];

                orderItem.shipmentDetails.push({
                    shipmentId:
                        shipment.shipmentId ||
                        shipment._id?.toString(),

                    awbNumber:
                        shipment.awbNumber,

                    shipmentType:
                        ShipmentType.FORWARD,

                    status:
                        shipment.currentStatus || 'created',
                });
            } else {
                console.log(
                    `Forward shipment already exists for item ${orderItemId}`
                );
            }

            // =====================================================
            // Shipment creation succeeded
            // NOW change item status to CONFIRMED
            // =====================================================

            orderItem.itemStatus = ItemStatus.CONFIRMED;

            // =====================================================
            // 8. Determine Order Status
            // =====================================================

            const allItemsProcessed = order.items.every(
                (item: any) =>
                    item.itemStatus === ItemStatus.CONFIRMED ||
                    item.itemStatus === ItemStatus.REJECTED
            );

            if (allItemsProcessed) {
                const anyConfirmed = order.items.some(
                    (item: any) =>
                        item.itemStatus === ItemStatus.CONFIRMED
                );

                order.orderStatus = anyConfirmed
                    ? OrderStatus.CONFIRMED
                    : OrderStatus.CANCELLED;
            }

            // =====================================================
            // 9. Save Order
            // =====================================================

            await order.save();

            return {
                orderItemId,
                itemStatus: orderItem.itemStatus,
                orderStatus: order.orderStatus,
                shipmentCreated: true,
                shipment,
            };
        } catch (error: any) {
            // =====================================================
            // Shipment creation failed
            //
            // Item remains PENDING
            // Order remains unchanged
            // =====================================================

            console.error(
                `Failed to create forward shipment for order item ${orderItemId}:`,
                error.message
            );

            const shipmentError: any = new Error(
                error.message ||
                "Shipment creation failed. Order item was not approved."
            );

            shipmentError.statusCode =
                error.statusCode ||
                StatusCode.Internal_Server_Error;

            throw shipmentError;
        }
    }

    // =========================================================
    // 10. Invalid Action
    // =========================================================

    const error: any = new Error(
        `Invalid action: ${action}. Use "approve" or "reject".`
    );

    error.statusCode = StatusCode.Bad_Request;

    throw error;
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
    console.log('hhhd', orderItem)
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
        orderItemId: orderItem._id,
        book: {
            bookId: orderItem.bookId._id,
            name: orderItem.bookId.name,
            author: orderItem.bookId.author,
            publisher: orderItem.bookId.publisher,
            language: orderItem.bookId.language,
            isbn: orderItem.bookId.isbn,
            category: orderItem.bookId.categoryId?.name,
            edition: orderItem.bookId.edition,
            coverImage: orderItem.bookId.coverImage,
        },
        shipmentDetails: orderItem.shipmentDetails || [],
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


/* =========================================================
 * Main service — orchestration only
 * ========================================================= */
export const updateOrderByIdService = async (
    orderId: string,
    updateData: any
) => {

    const order = await Order.findById(orderId);

    if (!order) {
        const error: any = new Error("Order not found.");
        error.statusCode = StatusCode.Not_Found;
        throw error;
    }

    const previousItemStatuses = new Map(
        order.items.map((item: any) => [
            item._id.toString(),
            item.itemStatus,
        ])
    );
    validateOrderStatusTransition(order, updateData);

    validatePaymentStatusTransition(order, updateData);

    const resolvedItems = validateAndResolveItems(
        order,
        updateData
    );
    applyItemUpdates(resolvedItems);

    applyTopLevelUpdates(order, updateData);
    syncOrderStatusFromItems(order);

    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        await order.save({ session });

        await syncBookStatuses(
            resolvedItems,
            session
        );

        await session.commitTransaction();
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        await session.endSession();
    }

    for (const item of order.items) {
        const previousStatus =
            previousItemStatuses.get(
                item._id.toString()
            );

        if (
            previousStatus !== ItemStatus.CONFIRMED &&
            item.itemStatus === ItemStatus.CONFIRMED
        ) {
            try {
                const forwardShipmentExists =
                    item.shipmentDetails?.some(
                        (shipment: any) =>
                            shipment.shipmentType ===
                            ShipmentType.FORWARD
                    );

                if (!forwardShipmentExists) {
                    const shipment =
                        await createShipmentFromOrder(
                            order,
                            item
                        );

                    if (shipment) {
                        item.shipmentDetails =
                            item.shipmentDetails || [];

                        item.shipmentDetails.push({
                            shipmentId:
                                shipment.shipmentId ||
                                shipment._id?.toString(),

                            awbNumber:
                                shipment.awbNumber,

                            shipmentType:
                                ShipmentType.FORWARD,

                            status:
                                shipment.currentStatus ||
                                "created",
                        });

                        await order.save();

                        console.log(
                            `Forward shipment created successfully for item ${item._id}`
                        );
                    }
                } else {
                    console.log(
                        `Forward shipment already exists for item ${item._id}`
                    );
                }
            } catch (error) {
                console.error(
                    `Failed to create forward shipment for item ${item._id}`,
                    error
                );
            }
        }

        if (
            previousStatus !== ItemStatus.RETURN_REQUESTED &&
            item.itemStatus === ItemStatus.RETURN_REQUESTED
        ) {
            try {
                const returnShipmentExists =
                    item.shipmentDetails?.some(
                        (shipment: any) =>
                            shipment.shipmentType ===
                            ShipmentType.RETURN
                    );

                if (!returnShipmentExists) {
                    const returnShipment =
                        await createReturnShipmentFromOrder(
                            order,
                            item
                        );

                    if (returnShipment) {
                        item.shipmentDetails =
                            item.shipmentDetails || [];

                        item.shipmentDetails.push({
                            shipmentId:
                                returnShipment.shipmentId ||
                                returnShipment._id?.toString(),

                            awbNumber:
                                returnShipment.awbNumber,

                            shipmentType:
                                ShipmentType.RETURN,

                            status:
                                returnShipment.currentStatus ||
                                "Created",
                        });

                        await order.save();

                        console.log(
                            `Return shipment created successfully for item ${item._id}`
                        );
                    }
                } else {
                    console.log(
                        `Return shipment already exists for item ${item._id}`
                    );
                }
            } catch (error) {
                console.error(
                    `Failed to create return shipment for item ${item._id}`,
                    error
                );
            }
        }
    }

    for (const item of order.items) {
        const previousStatus =
            previousItemStatuses.get(
                item._id.toString()
            );

        const currentStatus = item.itemStatus;

        if (
            previousStatus === currentStatus
        ) {
            continue;
        }

        if (
            currentStatus === ItemStatus.SHIPPED ||
            currentStatus === ItemStatus.OUT_FOR_DELIVERY ||
            currentStatus === ItemStatus.DELIVERED
        ) {
            continue;
        }

        // Pending should not send an email
        if (currentStatus === ItemStatus.PENDING) {
            continue;
        }

        await sendOrderStatusEmail(
            order,
            item
        );
    }


    const previousStatuses = Array.from(
        previousItemStatuses.values()
    );

    const currentStatuses = order.items.map(
        (item: any) => item.itemStatus
    );

    for (const item of order.items) {
        const previousStatus =
            previousItemStatuses.get(
                item._id.toString()
            );

        if (
            previousStatus !== ItemStatus.SHIPPED &&
            item.itemStatus === ItemStatus.SHIPPED
        ) {
            await sendOrderStatusEmail(
                order,
                item,
                "SHIPPED"
            );
        }
    }

    const previousShipmentEvent =
        getShipmentEvent(previousStatuses);

    const currentShipmentEvent =
        getShipmentEvent(currentStatuses);

    if (
        currentShipmentEvent &&
        currentShipmentEvent !== previousShipmentEvent
    ) {
        const shipmentItem =
            order.items.find((item: any) => {
                const previousStatus =
                    previousItemStatuses.get(
                        item._id.toString()
                    );

                return (
                    previousStatus !== ItemStatus.SHIPPED &&
                    item.itemStatus === ItemStatus.SHIPPED
                );
            });

        if (shipmentItem) {
            await sendOrderStatusEmail(
                order,
                shipmentItem,
                currentShipmentEvent
            );
        }
    }

    for (const item of order.items) {
        const previousStatus =
            previousItemStatuses.get(
                item._id.toString()
            );

        if (
            previousStatus !==
            ItemStatus.OUT_FOR_DELIVERY &&
            item.itemStatus ===
            ItemStatus.OUT_FOR_DELIVERY
        ) {
            await sendOrderStatusEmail(
                order,
                item,
                "OUT_FOR_DELIVERY"
            );
        }
    }

    const previousOutForDeliveryEvent =
        getOutForDeliveryEvent(previousStatuses);

    const currentOutForDeliveryEvent =
        getOutForDeliveryEvent(currentStatuses);

    if (
        currentOutForDeliveryEvent &&
        currentOutForDeliveryEvent !==
        previousOutForDeliveryEvent
    ) {
        const outForDeliveryItem =
            order.items.find((item: any) => {
                const previousStatus =
                    previousItemStatuses.get(
                        item._id.toString()
                    );

                return (
                    previousStatus !==
                    ItemStatus.OUT_FOR_DELIVERY &&
                    item.itemStatus ===
                    ItemStatus.OUT_FOR_DELIVERY
                );
            });

        if (outForDeliveryItem) {
            await sendOrderStatusEmail(
                order,
                outForDeliveryItem,
                currentOutForDeliveryEvent
            );
        }
    }

    for (const item of order.items) {
        const previousStatus =
            previousItemStatuses.get(
                item._id.toString()
            );

        if (
            previousStatus !== ItemStatus.DELIVERED &&
            item.itemStatus === ItemStatus.DELIVERED
        ) {
            await sendOrderStatusEmail(
                order,
                item,
                "DELIVERED"
            );
        }
    }

    const previousDeliveredEvent =
        getDeliveredEvent(previousStatuses);

    const currentDeliveredEvent =
        getDeliveredEvent(currentStatuses);

    if (
        currentDeliveredEvent &&
        currentDeliveredEvent !== previousDeliveredEvent
    ) {
        const deliveredItem =
            order.items.find((item: any) => {
                const previousStatus =
                    previousItemStatuses.get(
                        item._id.toString()
                    );

                return (
                    previousStatus !== ItemStatus.DELIVERED &&
                    item.itemStatus === ItemStatus.DELIVERED
                );
            });

        if (deliveredItem) {
            await sendOrderStatusEmail(
                order,
                deliveredItem,
                currentDeliveredEvent
            );
        }
    }

    return order;
};

export const getOrderByItemIdService = async (
    orderId: string,
    itemId: string
) => {
    try {
        // Validate IDs
        if (
            !mongoose.Types.ObjectId.isValid(orderId) ||
            !mongoose.Types.ObjectId.isValid(itemId)
        ) {
            throw new Error("Invalid Order ID or Item ID.");
        }

        // Fetch Order
        const order: any = await Order.findOne({
            _id: orderId,
            isActive: true,
        })
            .populate({
                path: "items.bookId",
                select: "name author coverImage ",
            })
            .lean();
        console.log('order', order)
        if (!order) {
            throw new Error("Order not found.");
        }

        // Find the requested order item
        const specificItem = order.items.find(
            (item: any) => String(item._id) === String(itemId)
        );
        console.log(specificItem)
        if (!specificItem) {
            throw new Error("Order item not found.");
        }

        return {
            orderId: order._id,
            orderItem: {
                orderItemId: specificItem._id,
                bookId: specificItem.bookId?._id,
                bookName:
                    specificItem.bookId.name,
                author:
                    specificItem.bookId.author,
                coverImage:
                    specificItem.bookId.coverImage,
                quantity: specificItem.quantity,
                itemStatus: specificItem.itemStatus,
            }
        };
    } catch (error) {
        throw error;
    }
};
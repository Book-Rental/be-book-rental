import mongoose from "mongoose";
import Order from "../models/Order";
import Transaction, { TransactionDirection, TransactionStatus, TransactionType } from "../models/Transaction";
import { StatusCode } from "../utils/StatusCodes";

export const createTransaction = async (transactionData: any) => {
    const transaction = await Transaction.create({
        ...transactionData,

        direction:
            transactionData.transactionType === "PAYMENT"
                ? TransactionDirection.CREDIT
                : TransactionDirection.DEBIT,
    });

    return transaction;
};

export const createSellerPayout = async (
    orderItemId: string
) => {
    // 1. Fetch the original successful payment transaction
    //    to get the rental amount and seller details.
    const paymentTransaction = await Transaction.findOne({
        "breakup.orderItemId": orderItemId,
        transactionType: TransactionType.PAYMENT,
        paymentStatus: TransactionStatus.SUCCESS,
    });

    if (!paymentTransaction) {
        const error: any = new Error(
            "Successful payment transaction not found for this order item"
        );

        error.statusCode = StatusCode.Not_Found;

        throw error;
    }

    // 2. Find the breakup for this order item
    const breakup = paymentTransaction.breakup.find(
        (item: any) =>
            item.orderItemId.toString() === orderItemId
    );

    if (!breakup) {
        const error: any = new Error(
            "Transaction breakup not found for this order item"
        );

        error.statusCode = StatusCode.Not_Found;

        throw error;
    }

    const rentalAmount = breakup.rentalAmount;

    // 3. Fetch the order to get the deposit deduction
    const order = await Order.findOne({
        "items._id": orderItemId,
    });

    if (!order) {
        const error: any = new Error(
            "Order not found"
        );

        error.statusCode = StatusCode.Not_Found;

        throw error;
    }

    // 4. Find the specific order item
    const orderItem = order.items.find(
        (item: any) =>
            item._id.toString() === orderItemId
    );

    if (!orderItem) {
        const error: any = new Error(
            "Order item not found"
        );

        error.statusCode = StatusCode.Not_Found;

        throw error;
    }

    // 5. Get the amount deducted from customer's deposit
    const deductionAmount =
        orderItem.deposit?.deductionAmount || 0;

    // 6. Seller gets rental + damage deduction
    const sellerPayoutAmount =
        rentalAmount + deductionAmount;

    if (sellerPayoutAmount <= 0) {
        const error: any = new Error(
            "No amount available for seller payout"
        );

        error.statusCode =
            StatusCode.Unprocessable_Entity;

        throw error;
    }

    // 7. Prevent duplicate seller payout
    const existingPayout = await Transaction.findOne({
        "breakup.orderItemId": orderItemId,
        transactionType:
            TransactionType.SELLER_PAYOUT,
    });

    if (existingPayout) {
        const error: any = new Error(
            "Seller payout has already been created for this order item"
        );

        error.statusCode = StatusCode.Conflict;

        throw error;
    }

    // 8. Create seller payout transaction
    const payout = await createTransaction({
        transactionId: `PAY-${Date.now()}`,

        orderId: paymentTransaction.orderId,

        userId: breakup.sellerId,

        transactionType:
            TransactionType.SELLER_PAYOUT,

        totalAmount: sellerPayoutAmount,

        paymentMethod: "INTERNAL",

        paymentStatus:
            TransactionStatus.SUCCESS,

        gatewayTransactionId: null,

        breakup: [
            {
                orderItemId: breakup.orderItemId,

                bookId: breakup.bookId,

                sellerId: breakup.sellerId,

                // Original rental amount
                rentalAmount: rentalAmount,

                // Amount deducted from customer's deposit
                securityDeposit: deductionAmount,

                // Rental + deduction
                totalAmount: sellerPayoutAmount,
            },
        ],
    });

    return payout;
};

// export const getTransactionByOrderId = async (orderId: string) => {
//     const transaction = await Transaction.findOne({
//         orderId,
//     });

//     return transaction;
// };

export const getTransactionsByOrderId = async (
    orderId: string
) => {
    const transactions = await Transaction.find({
        orderId,
    })
        .sort({
            createdAt: 1,
        })
        .lean();

    let remainingAmount = 0;
    let totalCreditedAmount = 0;
    let totalDebitedAmount = 0;

    const transactionData = transactions.map((transaction) => {
        const creditedAmount =
            transaction.direction === TransactionDirection.CREDIT
                ? transaction.totalAmount
                : 0;

        const debitedAmount =
            transaction.direction === TransactionDirection.DEBIT
                ? transaction.totalAmount
                : 0;

        totalCreditedAmount += creditedAmount;
        totalDebitedAmount += debitedAmount;

        remainingAmount =
            totalCreditedAmount - totalDebitedAmount;

        return {
            ...transaction,

            creditedAmount,
            debitedAmount,

            // Balance after this transaction
            remainingAmount,
        };
    });

    return {
        transactions: transactionData,

        summary: {
            totalCreditedAmount,
            totalDebitedAmount,
            remainingAmount,
        },
    };
};

export const getProfitSummary = async () => {
    const result = await Transaction.aggregate([
        {
            $group: {
                _id: null,

                totalCustomerPayments: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    {
                                        $eq: [
                                            "$transactionType",
                                            TransactionType.PAYMENT,
                                        ],
                                    },
                                    {
                                        $eq: [
                                            "$paymentStatus",
                                            TransactionStatus.SUCCESS,
                                        ],
                                    },
                                    {
                                        $eq: [
                                            "$direction",
                                            TransactionDirection.CREDIT,
                                        ],
                                    },
                                ],
                            },
                            "$totalAmount",
                            0,
                        ],
                    },
                },

                totalSellerPayout: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    {
                                        $eq: [
                                            "$transactionType",
                                            TransactionType.SELLER_PAYOUT,
                                        ],
                                    },
                                    {
                                        $eq: [
                                            "$paymentStatus",
                                            TransactionStatus.SUCCESS,
                                        ],
                                    },
                                    {
                                        $eq: [
                                            "$direction",
                                            TransactionDirection.DEBIT,
                                        ],
                                    },
                                ],
                            },
                            "$totalAmount",
                            0,
                        ],
                    },
                },

                totalRefund: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    {
                                        $eq: [
                                            "$transactionType",
                                            TransactionType.REFUND,
                                        ],
                                    },
                                    {
                                        $eq: [
                                            "$paymentStatus",
                                            TransactionStatus.SUCCESS,
                                        ],
                                    },
                                    {
                                        $eq: [
                                            "$direction",
                                            TransactionDirection.DEBIT,
                                        ],
                                    },
                                ],
                            },
                            "$totalAmount",
                            0,
                        ],
                    },
                },
            },
        },

        {
            $set: {
                totalDebitedAmount: {
                    $add: [
                        "$totalSellerPayout",
                        "$totalRefund",
                    ],
                },
            },
        },

        {
            $set: {
                remainingAmount: {
                    $subtract: [
                        "$totalCustomerPayments",
                        "$totalDebitedAmount",
                    ],
                },
            },
        },

        {
            $project: {
                _id: 0,
                totalCustomerPayments: 1,
                totalSellerPayout: 1,
                totalRefund: 1,
                totalDebitedAmount: 1,
                remainingAmount: 1,
            },
        },
    ]);

    const orderCount = await Order.countDocuments();

    return {
        totalOrders: orderCount,

        ...(result[0] || {
            totalCustomerPayments: 0,
            totalSellerPayout: 0,
            totalRefund: 0,
            totalDebitedAmount: 0,
            remainingAmount: 0,
        }),
    };
};

export const getSellerPayouts = async () => {
    const payouts = await Transaction.aggregate([
        {
            $match: {
                transactionType: TransactionType.SELLER_PAYOUT,
                direction: TransactionDirection.DEBIT,
                paymentStatus: TransactionStatus.SUCCESS,
            },
        },

        {
            $unwind: "$breakup",
        },

        {
            $group: {
                _id: "$breakup.sellerId",

                totalPayout: {
                    $sum: "$breakup.totalAmount",
                },

                payoutCount: {
                    $sum: 1,
                },
            },
        },

        {
            $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "seller",
            },
        },

        {
            $unwind: {
                path: "$seller",
                preserveNullAndEmptyArrays: true,
            },
        },

        {
            $sort: {
                totalPayout: -1,
            },
        },

        {
            $project: {
                _id: 0,

                sellerId: "$_id",

                firstName: "$seller.firstName",
                lastName: "$seller.lastName",
                email: "$seller.email",
                profilePic: "$seller.profilePic",

                totalPayout: 1,
                payoutCount: 1,
            },
        },
    ]);

    const totalSellerPayout = payouts.reduce(
        (total, seller) => total + seller.totalPayout,
        0
    );

    return {
        totalSellerPayout,
        sellers: payouts,
    };
};

export const getSellerPayoutDetails = async (
    sellerId: string
) => {
    const payouts = await Transaction.aggregate([
        {
            $match: {
                transactionType: TransactionType.SELLER_PAYOUT,
                direction: TransactionDirection.DEBIT,
                paymentStatus: TransactionStatus.SUCCESS,
                "breakup.sellerId": new mongoose.Types.ObjectId(
                    sellerId
                ),
            },
        },

        {
            $unwind: "$breakup",
        },

        // Keep only this seller's breakup
        {
            $match: {
                "breakup.sellerId": new mongoose.Types.ObjectId(
                    sellerId
                ),
            },
        },

        {
            $sort: {
                createdAt: -1,
            },
        },

        {
            $project: {
                _id: 0,

                transactionId: 1,
                orderId: 1,
                userId: 1,

                amount: "$breakup.totalAmount",

                orderItemId: "$breakup.orderItemId",
                bookId: "$breakup.bookId",

                rentalAmount: "$breakup.rentalAmount",
                securityDeposit: "$breakup.securityDeposit",
                deliveryFee: "$breakup.deliveryFee",
                discount: "$breakup.discount",
                tax: "$breakup.tax",

                paymentMethod: 1,
                paymentStatus: 1,
                gatewayTransactionId: 1,

                payoutDate: "$createdAt",
            },
        },
    ]);

    const totalPayout = payouts.reduce(
        (total, payout) => total + payout.amount,
        0
    );

    return {
        sellerId,
        payoutCount: payouts.length,
        totalPayout,
        payouts,
    };
};

export const getCustomerSummary = async () => {
    const customers = await Transaction.aggregate([
        {
            $match: {
                paymentStatus: TransactionStatus.SUCCESS,
                $or: [
                    {
                        transactionType: TransactionType.PAYMENT,
                        direction: TransactionDirection.CREDIT,
                    },
                    {
                        transactionType: TransactionType.REFUND,
                        direction: TransactionDirection.DEBIT,
                    },
                ],
            },
        },

        {
            $group: {
                _id: {
                    userId: "$userId",
                    transactionType: "$transactionType",
                },

                amount: {
                    $sum: "$totalAmount",
                },

                transactionCount: {
                    $sum: 1,
                },
            },
        },

        {
            $group: {
                _id: "$_id.userId",

                payments: {
                    $sum: {
                        $cond: [
                            {
                                $eq: [
                                    "$_id.transactionType",
                                    TransactionType.PAYMENT,
                                ],
                            },
                            "$amount",
                            0,
                        ],
                    },
                },

                refunds: {
                    $sum: {
                        $cond: [
                            {
                                $eq: [
                                    "$_id.transactionType",
                                    TransactionType.REFUND,
                                ],
                            },
                            "$amount",
                            0,
                        ],
                    },
                },

                paymentCount: {
                    $sum: {
                        $cond: [
                            {
                                $eq: [
                                    "$_id.transactionType",
                                    TransactionType.PAYMENT,
                                ],
                            },
                            "$transactionCount",
                            0,
                        ],
                    },
                },

                refundCount: {
                    $sum: {
                        $cond: [
                            {
                                $eq: [
                                    "$_id.transactionType",
                                    TransactionType.REFUND,
                                ],
                            },
                            "$transactionCount",
                            0,
                        ],
                    },
                },
            },
        },

        {
            $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "customer",
            },
        },

        {
            $unwind: {
                path: "$customer",
                preserveNullAndEmptyArrays: true,
            },
        },

        {
            $project: {
                _id: 0,

                customerId: "$_id",

                firstName: "$customer.firstName",
                lastName: "$customer.lastName",
                email: "$customer.email",
                profilePic: "$customer.profilePic",

                paymentCount: 1,
                refundCount: 1,

                totalPaid: "$payments",
                totalRefunded: "$refunds",

                netAmount: {
                    $subtract: [
                        "$payments",
                        "$refunds",
                    ],
                },
            },
        },

        {
            $sort: {
                totalPaid: -1,
            },
        },
    ]);

    const totalCustomerPayments = customers.reduce(
        (total, customer) =>
            total + customer.totalPaid,
        0
    );

    const totalCustomerRefunds = customers.reduce(
        (total, customer) =>
            total + customer.totalRefunded,
        0
    );

    return {
        totalCustomerPayments,
        totalCustomerRefunds,

        customers,
    };
};

export const getCustomerTransactionDetails = async (
    customerId: string
) => {
    const transactions = await Transaction.find({
        userId: new mongoose.Types.ObjectId(customerId),
        paymentStatus: TransactionStatus.SUCCESS,
        $or: [
            {
                transactionType: TransactionType.PAYMENT,
                direction: TransactionDirection.CREDIT,
            },
            {
                transactionType: TransactionType.REFUND,
                direction: TransactionDirection.DEBIT,
            },
        ],
    })
        .sort({
            createdAt: -1,
        })
        .lean();

    const payments = transactions.filter(
        (transaction) =>
            transaction.transactionType ===
                TransactionType.PAYMENT &&
            transaction.direction ===
                TransactionDirection.CREDIT
    );

    const refunds = transactions.filter(
        (transaction) =>
            transaction.transactionType ===
                TransactionType.REFUND &&
            transaction.direction ===
                TransactionDirection.DEBIT
    );

    const totalPaid = payments.reduce(
        (total, transaction) =>
            total + transaction.totalAmount,
        0
    );

    const totalRefunded = refunds.reduce(
        (total, transaction) =>
            total + transaction.totalAmount,
        0
    );

    return {
        customerId,

        paymentCount: payments.length,
        refundCount: refunds.length,

        totalPaid,
        totalRefunded,

        netAmount: totalPaid - totalRefunded,

        payments,
        refunds,
    };
};
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
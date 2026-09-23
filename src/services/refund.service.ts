import Order, { DepositStatus } from "../models/Order";
import Transaction, {
    TransactionType,
    TransactionStatus,
} from "../models/Transaction";
import { createTransaction } from "./transaction.service";
import { StatusCode } from "../utils/StatusCodes";

export const processRefund = async (
    orderItemId: string,
    condition: string
) => {
    const deductionPercentages: Record<string, number> = {
        GOOD: 0,
        MINOR_DAMAGE: 25,
        MAJOR_DAMAGE: 50,
        LOST: 100,
    };

    const deductionPercentage =
        deductionPercentages[condition];

    // Invalid inspection condition
    if (deductionPercentage === undefined) {
        const error: any = new Error(
            `Invalid inspection condition: ${condition}`
        );

        error.statusCode = StatusCode.Bad_Request;

        throw error;
    }

    // Find order
    const order = await Order.findOne({
        "items._id": orderItemId,
    });

    if (!order) {
        const error: any = new Error(
            "Order item not found"
        );

        error.statusCode = StatusCode.Not_Found;

        throw error;
    }

    // Find order item
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

    // Find deposit
    const deposit = orderItem.deposit;

    if (!deposit) {
        const error: any = new Error(
            "Deposit not found for this order item"
        );

        error.statusCode = StatusCode.Not_Found;

        throw error;
    }

    // Prevent duplicate refund
    if (deposit.status === DepositStatus.REFUNDED) {
        const error: any = new Error(
            "Deposit already refunded"
        );

        error.statusCode = StatusCode.Conflict;

        throw error;
    }

    const depositAmount = deposit.amount;

    // Calculate deduction based on inspection condition
    const deductionAmount =
        (depositAmount * deductionPercentage) / 100;

    // Remaining amount returned to customer
    const refundAmount =
        depositAmount - deductionAmount;

    // Update deposit
    deposit.status = DepositStatus.REFUNDED;

    deposit.refundedAmount = refundAmount;

    deposit.deductionAmount = deductionAmount;

    deposit.deductionReason =
        condition === "GOOD"
            ? ""
            : `Deposit deduction for ${condition}`;

    deposit.refundedDate = new Date();

    await order.save();

    // Create refund transaction using common transaction service
    const refundTransaction = await createTransaction({
        transactionId: `REF-${Date.now()}`,

        orderId: order._id,

        userId: order.userId,

        transactionType:
            TransactionType.REFUND,

        totalAmount: refundAmount,

        paymentMethod: "REFUND",

        paymentStatus:
            TransactionStatus.SUCCESS,

        gatewayTransactionId: null,

        breakup: [
            {
                orderItemId: orderItem._id,

                bookId: orderItem.bookId,

                sellerId: orderItem.sellerId,

                rentalAmount: 0,

                securityDeposit: refundAmount,

                deliveryFee: 0,

                discount: 0,

                tax: 0,

                totalAmount: refundAmount,
            },
        ],
    });

    return {
        orderId: order._id,

        orderItemId,

        condition,

        depositAmount,

        deductionPercentage,

        deductionAmount,

        refundAmount,

        depositStatus: deposit.status,

        refundedDate: deposit.refundedDate,

        refundTransactionId:
            refundTransaction.transactionId,
    };
};
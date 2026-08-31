import mongoose, { Schema, model } from "mongoose";

export enum TransactionType {
    PAYMENT = "PAYMENT",
    REFUND = "REFUND",
    SELLER_PAYOUT = "SELLER_PAYOUT",
}

export enum TransactionStatus {
    PENDING = "PENDING",
    SUCCESS = "SUCCESS",
    FAILED = "FAILED",
}

export enum TransactionDirection {
    DEBIT = "DEBIT",
    CREDIT = "CREDIT",
}

const TransactionBreakupSchema = new Schema(
    {
        orderItemId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },

        bookId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Book",
            required: true,
        },

        sellerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        rentalAmount: {
            type: Number,
            required: true,
            min: 0,
        },

        securityDeposit: {
            type: Number,
            required: true,
            min: 0,
        },

        deliveryFee: {
            type: Number,
            min: 0,
        },

        discount: {
            type: Number,
            min: 0,
        },

        tax: {
            type: Number,
            min: 0,
        },

        totalAmount: {
            type: Number,
            required: true,
            min: 0,
        },
    },
    {
        _id: false,
    }
);

const TransactionSchema = new Schema(
    {
        transactionId: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },

        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            required: true,
        },

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        transactionType: {
            type: String,
            enum: Object.values(TransactionType),
            required: true,
        },

        totalAmount: {
            type: Number,
            required: true,
            min: 0,
        },

        paymentMethod: {
            type: String,
            required: true,
        },

        direction: {
            type: String,
            enum: Object.values(TransactionDirection),
            required: true,
        },

        paymentStatus: {
            type: String,
            enum: Object.values(TransactionStatus),
            default: TransactionStatus.PENDING,
        },

        gatewayTransactionId: {
            type: String,
            default: null,
            trim: true,
        },

        breakup: {
            type: [TransactionBreakupSchema],
            required: true,
            validate: {
                validator: (value: unknown[]) => value.length > 0,
                message: "Transaction must contain at least one breakup.",
            },
        },
    },
    {
        timestamps: true,
    }
);

TransactionSchema.index({ orderId: 1 });
TransactionSchema.index({ userId: 1 });
TransactionSchema.index({ "breakup.orderItemId": 1 });
TransactionSchema.index({ "breakup.sellerId": 1 });

const Transaction = model("Transaction", TransactionSchema);

export default Transaction;
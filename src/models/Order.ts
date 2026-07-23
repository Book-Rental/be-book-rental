import { model, Schema, Types } from "mongoose";
import { addressSchema } from "./User";


export const RentalSchema = new Schema(
    {
        rentalPrice: {
            type: Number,
            required: true,
            min: 0,
        },

        securityDeposit: {
            type: Number,
            required: true,
            min: 0,
        },

        rentalDuration: {
            type: Number,
            required: true, // Number of days
            min: 1,
        },

        rentStartDate: {
            type: Date,
            required: true,
        },

        expectedReturnDate: {
            type: Date,
            required: true,
        },

        actualReturnDate: {
            type: Date,
            default: null,
        },

        extensionCount: {
            type: Number,
            default: 0,
            min: 0,
        },

        maximumExtensions: {
            type: Number,
            default: 2,
            min: 0,
        },

        extendedUntil: {
            type: Date,
            default: null,
        },

        lateFee: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    {
        _id: false,
    }
);

export enum DepositStatus {
    PENDING = "pending",
    HOLD = "hold",
    REFUNDED = "refunded",
    PARTIALLY_REFUNDED = "partially_refunded",
    DEDUCTED = "deducted",
}

export const DepositSchema = new Schema(
    {
        amount: {
            type: Number,
            required: true,
            min: 0,
        },

        status: {
            type: String,
            enum: Object.values(DepositStatus),
            default: DepositStatus.PENDING,
        },

        refundedAmount: {
            type: Number,
            default: 0,
            min: 0,
        },

        deductionAmount: {
            type: Number,
            default: 0,
            min: 0,
        },

        deductionReason: {
            type: String,
            default: "",
            trim: true,
        },

        refundedDate: {
            type: Date,
            default: null,
        },
    },
    {
        _id: false,
    }
);

export enum PaymentStatus {
    PENDING = "pending",
    SUCCESS = "success",
    FAILED = "failed",
    REFUNDED = "refunded",
}

export enum PaymentMethod {
    COD = "COD",
    CASH = "CASH", 
    UPI = "UPI",
    CARD = "CARD",
    NET_BANKING = "NET_BANKING",
    GOOGLE_PAY = "GOOGLE_PAY",
    PHONE_PE = "PHONE_PE",    
}
export const PaymentSchema = new Schema(
    {
        paymentMethod: {
            type: String,
            enum: Object.values(PaymentMethod),
            required: true,
        },

        paymentStatus: {
            type: String,
            enum: Object.values(PaymentStatus),
            default: PaymentStatus.PENDING,
        },

        transactionId: {
            type: String,
            required: true,
            trim: true,
        },

        paidAt: {
            type: Date,
            default: null,
        },
    },
    {
        _id: false,
    }
);

export const AmountSchema = new Schema(
    {
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
            default: 0,
            min: 0,
        },

        discount: {
            type: Number,
            default: 0,
            min: 0,
        },

        tax: {
            type: Number,
            default: 0,
            min: 0,
        },

        totalAmount: {
            type: Number,
            required: true,
            min: 0,
        },

        refundAmount: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    {
        _id: false,
    }
);

export enum ItemStatus {
    PENDING = "pending",
    CONFIRMED = "confirmed",
    SHIPPED = "shipped",
    DELIVERED = "delivered",
    RETURN_REQUESTED = "return_requested",
    RETURNED = "returned",
    CANCELLED = "cancelled",
    REJECTED = "rejected",
}

export const OrderItemSchema = new Schema(
    {
        bookId: {
            type: Types.ObjectId,
            ref: "Book",
            required: true,
        },

        sellerId: {
            type: Types.ObjectId,
            ref: "User",
            required: true,
        },

        quantity: {
            type: Number,
            default: 1,
            min: 1,
        },

        itemStatus: {
            type: String,
            enum: Object.values(ItemStatus),
            default: ItemStatus.PENDING,
        },

        rental: {
            type: RentalSchema,
            required: true,
        },

        deposit: {
            type: DepositSchema,
            required: true,
        },
    },
    {
        _id: true,
    }
);

export enum OrderStatus {
    PENDING = "pending",
    CONFIRMED = "confirmed",
    SHIPPED = "shipped",
    DELIVERED = "delivered",
    RETURN_REQUESTED = "return_requested",
    RETURNED = "returned",
    CANCELLED = "cancelled",
}

const OrderSchema = new Schema(
    {
        orderNumber: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },

        userId: {
            type: Types.ObjectId,
            ref: "User",
            required: true,
        },

        items: {
            type: [OrderItemSchema],
            required: true,
            validate: {
                validator: (items: any[]) => items.length > 0,
                message: "Order should contain at least one book.",
            },
        },

        shippingAddress: {
            type: addressSchema,
            required: true,
        },

        billingAddress: {
            type: addressSchema,
            required: true,
        },

        payment: {
            type: PaymentSchema,
            required: true,
        },

        amount: {
            type: AmountSchema,
            required: true,
        },

        orderStatus: {
            type: String,
            enum: Object.values(OrderStatus),
            default: OrderStatus.PENDING,
        },

        createdBy: {
            type: Types.ObjectId,
            ref: "User",
        },

        updatedBy: {
            type: Types.ObjectId,
            ref: "User",
        },

        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

/* ---------------- Indexes ---------------- */

OrderSchema.index({ orderNumber: 1 });
OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ orderStatus: 1 });
OrderSchema.index({ "payment.paymentStatus": 1 });

export default model("Order", OrderSchema);

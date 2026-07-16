import { Schema, model, Types } from "mongoose";

export enum OrderType {
    BUY = "buy",
    RENT = "rent",
}

export enum OrderStatus {
    PENDING = "pending",
    CONFIRMED = "confirmed",
    SHIPPED = "shipped",
    DELIVERED = "delivered",
    RETURN_REQUESTED = "return_requested",
    RETURNED = "returned",
    CANCELLED = "cancelled",
}

export enum PaymentStatus {
    PENDING = "pending",
    SUCCESS = "success",
    FAILED = "failed",
    REFUNDED = "refunded",
}

const AddressSnapshotSchema = new Schema(
    {
        name: String,
        type: String,
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String,
        phone: String,
    },
    {
        _id: false,
    }
);

const OrderItemSchema = new Schema(
    {
        bookId: {
            type: Schema.Types.ObjectId,
            ref: "Book",
            required: true,
        },

        sellerId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        orderType: {
            type: String,
            enum: Object.values(OrderType),
            required: true,
        },

        quantity: {
            type: Number,
            default: 1,
            min: 1,
        },

        // Price snapshot at the time of ordering
        purchasePrice: {
            type: Number,
            default: 0,
        },

        rentalPrice: {
            type: Number,
            default: 0,
        },

        rentalDuration: {
            type: Number,
            default: 0,
        },

        securityDeposit: {
            type: Number,
            default: 0,
        },

        rentStartDate: Date,

        expectedReturnDate: Date,

        actualReturnDate: Date,

        lateFee: {
            type: Number,
            default: 0,
        },
    },
    {
        _id: false,
    }
);

const OrderSchema = new Schema(
    {
        orderNumber: {
            type: String,
            required: true,
            unique: true,
        },

        customerId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        items: {
            type: [OrderItemSchema],
            required: true,
        },

        deliveryAddress: {
            type: AddressSnapshotSchema,
            required: true,
        },

        subtotal: {
            type: Number,
            required: true,
        },

        deliveryCharge: {
            type: Number,
            default: 0,
        },

        discount: {
            type: Number,
            default: 0,
        },

        tax: {
            type: Number,
            default: 0,
        },

        totalAmount: {
            type: Number,
            required: true,
        },

        paymentMethod: {
            type: String,
            enum: ["COD", "UPI", "CARD", "NET_BANKING"],
            required: true,
        },

        paymentStatus: {
            type: String,
            enum: Object.values(PaymentStatus),
            default: PaymentStatus.PENDING,
        },

        transactionId: {
            type: String,
            default: null,
        },

        orderStatus: {
            type: String,
            enum: Object.values(OrderStatus),
            default: OrderStatus.PENDING,
        },

        cancellationReason: String,

        notes: String,

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

// Indexes
OrderSchema.index({ customerId: 1, createdAt: -1 });
OrderSchema.index({ orderNumber: 1 });
OrderSchema.index({ orderStatus: 1 });

const Order = model("Order", OrderSchema);

export default Order;

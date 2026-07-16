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

export enum PaymentMethod {
    COD = "COD",
    UPI = "UPI",
    CARD = "CARD",
    NET_BANKING = "NET_BANKING",
}

const AddressSnapshotSchema = new Schema(
    {
        name: {
            type: String,
            trim: true,
        },

        type: {
            type: String,
            enum: ["home", "work", "other"],
            default: "home",
        },

        street: {
            type: String,
            required: true,
        },

        city: {
            type: String,
            required: true,
        },

        state: {
            type: String,
            required: true,
        },

        zipCode: {
            type: String,
            required: true,
        },

        country: {
            type: String,
            required: true,
        },

        phone: {
            type: String,
            required: true,
        },
    },
    {
        _id: false,
    }
);

const OrderItemSchema = new Schema({
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
    },
    rentalPrice: Number,
    securityDeposit: Number,

    itemStatus: {
        type: String,
        enum: Object.values(OrderStatus),
        default: OrderStatus.PENDING,
    },

    rentStartDate: Date,
    expectedReturnDate: Date,
    actualReturnDate: Date,
    lateFee: {
        type: Number,
        default: 0,
    },
});

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

        deliveryAddress: {
            type: AddressSnapshotSchema,
            required: true,
        },

        subtotal: {
            type: Number,
            required: true,
            min: 0,
        },

        securityDepositTotal: {
            type: Number,
            default: 0,
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

        total: {
            type: Number,
            required: true,
            min: 0,
        },

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
            default: null,
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

// Indexes
OrderSchema.index({ orderNumber: 1 });
OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ orderStatus: 1 });
OrderSchema.index({ paymentStatus: 1 });

const Order = model("Order", OrderSchema);

export default Order;

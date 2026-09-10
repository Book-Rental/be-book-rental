import { model, Schema, Types } from "mongoose";
import { addressSchema } from "./User";

/* =========================================================
   ORDER TYPE
========================================================= */

export enum OrderType {
    BUY = "buy",
    RENT = "rent",
    AUCTION = "auction",
}

/* =========================================================
   RENTAL
========================================================= */

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
            required: true,
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

/* =========================================================
   DEPOSIT
========================================================= */

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

/* =========================================================
   PAYMENT
========================================================= */

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
            trim: true,

            required: function (this: any) {
                return (
                    this.paymentMethod !== PaymentMethod.COD &&
                    this.paymentMethod !== PaymentMethod.CASH
                );
            },

            default: null,
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

/* =========================================================
   AMOUNT
========================================================= */

export const AmountSchema = new Schema(
    {
        /**
         * For:
         * BUY      -> normal book price
         * RENT     -> rental price
         * AUCTION  -> winning bid amount
         */
        itemAmount: {
            type: Number,
            required: true,
            min: 0,
        },

        securityDeposit: {
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

/* =========================================================
   ITEM STATUS
========================================================= */

export enum ItemStatus {
    PENDING = "pending",
    CONFIRMED = "confirmed",
    SHIPPED = "shipped",
    OUT_FOR_DELIVERY = "out_for_delivery",
    DELIVERED = "delivered",

    RETURN_REQUESTED = "return_requested",
    RETURN_IN_PROGRESS = "return_in_progress",
    RETURNED = "returned",

    CANCELLED = "cancelled",
    REJECTED = "rejected",
}

/* =========================================================
   SHIPMENT TYPE
========================================================= */

export enum ShipmentType {
    FORWARD = "Forward",
    RETURN = "Return",
    EXCHANGE = "Exchange",
}

/* =========================================================
   SHIPMENT REFERENCE
========================================================= */

export const ShipmentReferenceSchema = new Schema(
    {
        shipmentId: {
            type: String,
            required: true,
            trim: true,
        },

        awbNumber: {
            type: String,
            required: true,
            trim: true,
        },

        shipmentType: {
            type: String,
            enum: Object.values(ShipmentType),
            required: true,
        },

        status: {
            type: String,
            required: true,
            trim: true,
        },
    },
    {
        _id: false,
    }
);

/* =========================================================
   AUCTION ORDER DETAILS
========================================================= */

export const AuctionOrderSchema = new Schema(
    {
        /**
         * Reference to the Auction document
         */
        auctionId: {
            type: Types.ObjectId,
            ref: "Auction",
            required: true,
        },

        /**
         * Reference to the winning Bid document
         */
        winningBidId: {
            type: Types.ObjectId,
            ref: "Bid",
            required: true,
        },

        /**
         * Store the winning amount at the time
         * the order is created.
         *
         * Do NOT depend only on Bid.amount later.
         */
        winningBidAmount: {
            type: Number,
            required: true,
            min: 0,
        },

        /**
         * User who won the auction
         */
        winnerId: {
            type: Types.ObjectId,
            ref: "User",
            required: true,
        },

        /**
         * When the auction was won
         */
        wonAt: {
            type: Date,
            required: true,
        },
    },
    {
        _id: false,
    }
);

/* =========================================================
   ORDER ITEM
========================================================= */

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

        /**
         * Rental is optional now.
         *
         * Required for RENT orders by service/business logic.
         * Not applicable for BUY/AUCTION.
         */
        rental: {
            type: RentalSchema,
            default: null,
        },

        /**
         * Deposit is optional because:
         *
         * BUY      -> normally no deposit
         * AUCTION  -> normally no deposit
         * RENT     -> deposit required
         */
        deposit: {
            type: DepositSchema,
            default: null,
        },

        /**
         * Shipment references
         */
        shipmentDetails: {
            type: [ShipmentReferenceSchema],
            default: [],
        },
    },
    {
        _id: true,
    }
);

/* =========================================================
   ORDER STATUS
========================================================= */

export enum OrderStatus {
    PENDING = "pending",
    CONFIRMED = "confirmed",
    SHIPPED = "shipped",
    DELIVERED = "delivered",
    OUT_FOR_DELIVERY = "out_for_delivery",

    RETURN_REQUESTED = "return_requested",
    RETURN_IN_PROGRESS = "return_in_progress",
    RETURNED = "returned",

    CANCELLED = "cancelled",
}

/* =========================================================
   ORDER SCHEMA
========================================================= */

const OrderSchema = new Schema(
    {
        /* -------------------------------------------------
           ORDER NUMBER
        ------------------------------------------------- */

        orderNumber: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },

        /* -------------------------------------------------
           ORDER TYPE
        ------------------------------------------------- */

        orderType: {
            type: String,
            enum: Object.values(OrderType),
            required: true,
            default: OrderType.BUY,
        },

        /* -------------------------------------------------
           USER
        ------------------------------------------------- */

        userId: {
            type: Types.ObjectId,
            ref: "User",
            required: true,
        },

        /* -------------------------------------------------
           ORDER ITEMS
        ------------------------------------------------- */

        items: {
            type: [OrderItemSchema],

            required: true,

            validate: {
                validator: (items: any[]) => items.length > 0,
                message: "Order should contain at least one book.",
            },
        },

        /* -------------------------------------------------
           AUCTION DETAILS
        ------------------------------------------------- */

        auctionDetails: {
            type: AuctionOrderSchema,
            default: null,
        },

        /* -------------------------------------------------
           SHIPPING ADDRESS
        ------------------------------------------------- */

        shippingAddress: {
            type: addressSchema,
            required: true,
        },

        /* -------------------------------------------------
           BILLING ADDRESS
        ------------------------------------------------- */

        billingAddress: {
            type: addressSchema,
            required: true,
        },

        /* -------------------------------------------------
           PAYMENT
        ------------------------------------------------- */

        payment: {
            type: PaymentSchema,
            required: true,
        },

        /* -------------------------------------------------
           AMOUNT
        ------------------------------------------------- */

        amount: {
            type: AmountSchema,
            required: true,
        },

        /* -------------------------------------------------
           ORDER STATUS
        ------------------------------------------------- */

        orderStatus: {
            type: String,
            enum: Object.values(OrderStatus),
            default: OrderStatus.PENDING,
        },

        /* -------------------------------------------------
           CREATED BY
        ------------------------------------------------- */

        createdBy: {
            type: Types.ObjectId,
            ref: "User",
        },

        /* -------------------------------------------------
           UPDATED BY
        ------------------------------------------------- */

        updatedBy: {
            type: Types.ObjectId,
            ref: "User",
        },

        /* -------------------------------------------------
           ACTIVE
        ------------------------------------------------- */

        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

/* =========================================================
   INDEXES
========================================================= */

OrderSchema.index({ orderNumber: 1 });

OrderSchema.index({
    userId: 1,
    createdAt: -1,
});

OrderSchema.index({
    orderStatus: 1,
});

OrderSchema.index({
    orderType: 1,
});

OrderSchema.index({
    "payment.paymentStatus": 1,
});

/**
 * Useful for finding orders created from an auction.
 */
OrderSchema.index({
    "auctionDetails.auctionId": 1,
});

/**
 * Useful for finding the order generated from a winning bid.
 */
OrderSchema.index({
    "auctionDetails.winningBidId": 1,
});

/* =========================================================
   MODEL
========================================================= */

export default model("Order", OrderSchema);

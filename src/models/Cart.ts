import mongoose, { Schema } from "mongoose";
import { Messages } from "../utils/constants";
export type PricingMode = "rent" | "sale";
export type RentalPeriod = "day" | "week" | "month";

export interface ICartItem {
    bookId: mongoose.Types.ObjectId;
    quantity: number;
    pricingMode: PricingMode;
    rentalPeriod?: RentalPeriod;
    addedAt: Date;
}

export interface ICart extends mongoose.Document {
    userId?: mongoose.Types.ObjectId;
    anonymousId?: string;
    items: ICartItem[];
    createdAt: Date;
    updatedAt: Date;
}

const cartItemSchema = new Schema<ICartItem>(
    {
        bookId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Book",
            required: [true, Messages.BookId_Required],
        },

        quantity: {
            type: Number,
            required: true,
            default: 1,
            min: [1, Messages.Quantity_Must_Be_At_Least_One],
        },
        pricingMode: {
            type: String,
            enum: ["rent", "sale"],
            required: true,
        },
        rentalPeriod: {
            type: String,
            enum: ["day", "week", "month"],
            required: false,
        },
        addedAt: {
            type: Date,
            default: Date.now,
        },
    },

    { _id: false }
);

const cartSchema = new Schema<ICart>(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: false,
            sparse: true,
            unique: true,
        },
        anonymousId: {
            type: String,
            required: false,
            sparse: true,
            unique: true,
        },
        items: [cartItemSchema],
    },
    { timestamps: true }
);

// Helpful when updating quantity/remove
cartSchema.index({ userId: 1 });
cartSchema.index({ anonymousId: 1 });
cartSchema.index({ userId: 1, "items.bookId": 1, "items.pricingMode": 1, "items.rentalPeriod": 1 });
cartSchema.index({
    anonymousId: 1,
    "items.bookId": 1,
    "items.pricingMode": 1,
    "items.rentalPeriod": 1,
});

const Cart = mongoose.model<ICart>("Cart", cartSchema);
export default Cart;

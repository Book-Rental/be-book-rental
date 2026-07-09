import mongoose, { Schema } from "mongoose";


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
  userId: mongoose.Types.ObjectId;
  items: ICartItem[];
  createdAt: Date;
  updatedAt: Date;
}

const cartItemSchema = new Schema<ICartItem>(
  {
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: [true, "Book ID is required"],
    },

    quantity: {
      type: Number,
      required: true,
      default: 1,
      min: [1, "Quantity must be at least 1"],
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
      required: [true, "User ID is required"],
      unique: true,
    },
    items: [cartItemSchema],
  },
  { timestamps: true }
);

// Helpful when updating quantity/remove
cartSchema.index({ userId: 1 });
cartSchema.index({ userId: 1, "items.bookId": 1, "items.pricingMode": 1, "items.rentalPeriod": 1, });

const Cart = mongoose.model<ICart>("Cart", cartSchema);
export default Cart;


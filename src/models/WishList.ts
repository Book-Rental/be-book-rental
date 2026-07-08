import mongoose, { Schema, Document } from "mongoose";

export interface IWishlistItem {
  bookId: mongoose.Types.ObjectId;
  addedAt: Date;
}

export interface IWishlistGroup extends Document {
  userId: mongoose.Types.ObjectId;
  name: string; 
  description?: string;
  items: IWishlistItem[];
  createdAt: Date;
  updatedAt: Date;
}


const wishListItemSchema = new Schema<IWishlistItem>(
  {
    bookId: {
      type: Schema.Types.ObjectId,
      ref: "Book",
      required: [true, "Book ID is required"],
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false } 
);

const wishListSchema = new Schema<IWishlistGroup>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User", 
      required: [true, "User ID is required"],
    },
    name: {
      type: String,
      required: [true, "Wishlist category name is required"],
      trim: true,
      maxlength: [50, "Category name cannot exceed 50 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, "Description cannot exceed 200 characters"],
    },
    items: [wishListItemSchema], 
  },
  {
    timestamps: true, 
  }
);


wishListSchema.index({ userId: 1, name: 1 }, { unique: true });

const Wishlist = mongoose.model<IWishlistGroup>("Wishlist", wishListSchema);

export default Wishlist;

import mongoose from "mongoose";

export const buildWishlistFilter = (
  userId: string,
  wishListID?: string,
) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user id.");
  }

  const filter: any = {
    userId: new mongoose.Types.ObjectId(userId),
  };

  if (wishListID) {
    if (!mongoose.Types.ObjectId.isValid(wishListID)) {
      throw new Error("Invalid wishlist id.");
    }

    filter._id = new mongoose.Types.ObjectId(wishListID);
  }

  return filter;
};
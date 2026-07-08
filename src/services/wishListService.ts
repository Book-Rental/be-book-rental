import mongoose from "mongoose";
import Wishlist, { IWishlistGroup } from "../models/WishList";
import { buildWishlistFilter } from "../utils/buildWishlistFilter";
import { buildWishlistBooksAggregationPipeline } from "../utils/buildWishlistBooksAggregationPipeline";

export const getWishlistsByUserService = async (
  userId: string,
  query: any,
) => {
  try {
    const {
      wishListID,
      page = 1,
      limit = 10,
    } = query;

    const pageNumber = Number(page);
    const limitNumber = Number(limit);

    // Build filter
    const filter = buildWishlistFilter(userId, wishListID);

    // Build aggregation pipeline
    const pipeline = buildWishlistBooksAggregationPipeline(
      filter,
      pageNumber,
      limitNumber,
    );

    // Execute aggregation
    const books = await Wishlist.aggregate(pipeline);

    // Get total count
    const totalResult = await Wishlist.aggregate([
      { $match: filter },
      { $unwind: "$items" },
      { $count: "total" },
    ]);

    const totalRecords =
      totalResult.length > 0 ? totalResult[0].total : 0;

    const totalPages = Math.ceil(totalRecords / limitNumber);
    const hasMore =
      (pageNumber - 1) * limitNumber + books.length < totalRecords;

    return {
      wishlistName: books.length ? books[0].wishlistName : "",
      books: books.map((book: any) => ({
        _id: book._id,
        name: book.name,
        description: book.description,
        price: book.price,
        coverImage: book.coverImage,
      })),
      meta: {
        totalRecords,
        totalPages,
        currentPage: pageNumber,
        limit: limitNumber,
        hasMore,
      },
    };
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const createWishlistGroupService = async (
  userId: string,
  name: string,
  description?: string,
): Promise<IWishlistGroup> => {
  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid user id.");
    }

    const existingWishlist = await Wishlist.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      name: name.trim(),
    });

    if (existingWishlist) {
      throw new Error("Wishlist with this name already exists.");
    }

    const wishlist = await Wishlist.create({
      userId: new mongoose.Types.ObjectId(userId),
      name: name.trim(),
      description,
    });

    return wishlist;
  } catch (error) {
    console.error("Error creating wishlist:", error);

    throw error instanceof Error
      ? error
      : new Error("Failed to create wishlist.");
  }
};

export const addBookToWishlistService = async (
  
  wishlistId: string,
  bookId: string,
): Promise<IWishlistGroup | null> => {
  try {
   

    if (!mongoose.Types.ObjectId.isValid(wishlistId)) {
      throw new Error("Invalid wishlist id.");
    }

    if (!mongoose.Types.ObjectId.isValid(bookId)) {
      throw new Error("Invalid book id.");
    }


    const wId = new mongoose.Types.ObjectId(wishlistId);
    const bId = new mongoose.Types.ObjectId(bookId);

    // Check whether wishlist exists
    const wishlist = await Wishlist.findOne({
      _id: wId,
     
    });

    if (!wishlist) {
      throw new Error("Wishlist not found.");
    }

    const alreadyExists = wishlist.items.some(
      (item) => item.bookId.toString() === bId.toString(),
    );

    if (alreadyExists) {
      throw new Error("This book is already in your selected wishlist.");
    }

    wishlist.items.push({
      bookId: bId,
      addedAt: new Date(),
    });

    await wishlist.save();

    await wishlist.populate("items.bookId");

    return wishlist;
  } catch (error) {
    console.error("Error adding book to wishlist:", error);

    throw error instanceof Error
      ? error
      : new Error("Failed to add book to wishlist.");
  }
};

export const removeBookFromWishlistService = async (
  
  wishlistId: string,
  bookId: string,
): Promise<IWishlistGroup | null> => {
  try {
 
    if (!mongoose.Types.ObjectId.isValid(wishlistId)) {
      throw new Error("Invalid wishlist id.");
    }

    if (!mongoose.Types.ObjectId.isValid(bookId)) {
      throw new Error("Invalid book id.");
    }

  
    const wId = new mongoose.Types.ObjectId(wishlistId);
    const bId = new mongoose.Types.ObjectId(bookId);

    // Check if wishlist exists
    const wishlist = await Wishlist.findOne({
      _id: wId
    });

    if (!wishlist) {
      throw new Error("Wishlist not found.");
    }

    // Check if book exists in wishlist
    const bookExists = wishlist.items.some(
      (item) => item.bookId.toString() === bId.toString(),
    );

    if (!bookExists) {
      throw new Error("Book not found in wishlist.");
    }

    // Remove the book
    wishlist.items = wishlist.items.filter(
      (item) => item.bookId.toString() !== bId.toString(),
    );

    await wishlist.save();

    await wishlist.populate("items.bookId");

    return wishlist;
  } catch (error) {
    console.error("Error removing book from wishlist:", error);

    throw error instanceof Error
      ? error
      : new Error("Failed to remove book from wishlist.");
  }
};


export const getUserWishlistNamesService = async (
  userId: string,
) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid user id.");
    }

    const wishlists = await Wishlist.find({
      userId: new mongoose.Types.ObjectId(userId),
    })
      .select("_id name")
      .sort({ name: 1 })
      .lean();

    return wishlists.map((wishlist: any) => ({
      _id: wishlist._id,
      name: wishlist.name,
    }));
  } catch (error) {
    console.error("Error fetching wishlist names:", error);

    throw error instanceof Error
      ? error
      : new Error("Failed to fetch wishlist names.");
  }
};
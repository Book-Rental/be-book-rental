import mongoose from "mongoose";
import Auction from "../models/Auction";
import Book, { IBook } from "../models/Book";
import Category from "../models/Category";
import { buildPaginationQuery } from "../utils/appFunctions";
import { IAuction } from "../models/interfaces";
import { calculateAuctionStatus } from "../helper/auctionStatus";
import AuctionBid from "../models/AuctionBid";

export const createBookService = async (data: Partial<IBook>) => {
    try {
        const parsedData: Partial<IBook> = { ...data };

        const newBook = await Book.create({
            ...parsedData,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        return newBook;
    } catch (err) {
        throw err;
    }
};

export const deleteBookByIdService = async (id: string) => {
    try {
        const deletedBook = await Book.findByIdAndDelete(id);
        return deletedBook;
    } catch (err) {
        throw err;
    }
};

export const getBookByIdService = async (id: string) => {
    try {
        const book = await Book.findById(id)
            .populate({
                path: "auctionId",
                select: `
                    bookId
                    bidPrice
                    buyNowPrice
                    duration
                    status
                    startDate
                    createdAt
                `,
            })
            .lean();

        if (!book) {
            return null;
        }

        const auction = book.auctionId as any;

        if (auction && auction._id) {
            const highestBid = await AuctionBid.findOne({
                auctionId: auction._id,
            })
                .sort({ bidPrice: -1 })
                .populate({
                    path: "userId",
                    select: "_id firstName lastName",
                })
                .select("bidPrice userId")
                .lean();

            return {
                ...book,

                auctionId: {
                    ...auction,

                    currentBidPrice:
                        highestBid?.bidPrice ??
                        auction.bidPrice,

                    highestBidder: highestBid?.userId
                        ? {
                              userId: (highestBid.userId as any)._id,
                              name: `${(highestBid.userId as any).firstName} ${(highestBid.userId as any).lastName}`,
                          }
                        : null,
                },
            };
        }

        return book;
    } catch (err) {
        throw err;
    }
};

export const updateBookByIdService = async (id: string, data: Partial<IBook>) => {
    try {
        const updatedBook = await Book.findByIdAndUpdate(id, data, { new: true });
        return updatedBook;
    } catch (err) {
        throw err;
    }
};

export const getBooksBySellerIdService = async (
    sellerId: string,
    query: any
) => {
    try {
        const { skip, limit, page } =
            buildPaginationQuery(query);

        const filter: Record<string, any> = {
            sellerId,
        };

        if (query.categoryId) {
            filter.categoryId = query.categoryId;
        }

        if (query.categoryName) {
            const category = await Category.findOne({
                name: {
                    $regex: `^${query.categoryName}$`,
                    $options: "i",
                },
                isActive: true,
            }).select("_id");

            if (category) {
                filter.categoryId = category._id;
            } else {
                return {
                    books: [],
                    meta: {
                        totalRecords: 0,
                        totalPages: 0,
                        currentPage: page,
                        limit,
                        hasMore: false,
                    },
                };
            }
        }

        const totalRecords =
            await Book.countDocuments(filter);

        const totalPages = Math.ceil(
            totalRecords / limit
        );

        const hasMore = page < totalPages;

        const books = await Book.find(filter)
            .populate("categoryId", "name")
            .populate({
                path: "auctionId",
                select: `
                    bookId
                    bidPrice
                    buyNowPrice
                    duration
                    startDate
                    createdAt
                `,
            })
            .skip(skip)
            .limit(limit)
            .lean();

        const booksWithCurrentBidPrice =
            await Promise.all(
                books.map(async (book) => {
                    const auction = book.auctionId as any;

                    if (!auction || !auction._id) {
                        return book;
                    }

                    const highestBid =
                        await AuctionBid.findOne({
                            auctionId: auction._id,
                        })
                            .sort({
                                bidPrice: -1,
                            })
                            .select("bidPrice")
                            .lean();

                    return {
                        ...book,
                        auctionId: {
                            ...auction,
                            currentBidPrice:
                                highestBid?.bidPrice ??
                                auction.bidPrice,
                        },
                    };
                })
            );

        return {
            books: booksWithCurrentBidPrice,
            meta: {
                totalRecords,
                totalPages,
                currentPage: page,
                limit,
                hasMore,
            },
        };
    } catch (err) {
        throw err;
    }
};

export const createAuctionBookService = async (
    data: Partial<IAuction>
) => {
    const session = await mongoose.startSession();
    try {
        session.startTransaction();
        const book = await Book.findById(data.bookId).session(session);
        if (!book) {
            throw new Error("Book not found");
        }
        if (book.isAuction) {
            throw new Error(
                "This book is already available for auction"
            );
        }

         const status = calculateAuctionStatus(
            data.startDate!,
            data.duration!
        );

        const auction = await Auction.create(
            [
                {
                    bookId: data.bookId,
                    bidPrice: data.bidPrice,
                    buyNowPrice: data.buyNowPrice,
                    duration: data.duration,
                    startDate: data.startDate,
                    status
                },
            ],
            { session }
        );

        const createdAuction = auction[0];
        // Update Book with auction information
        await Book.findByIdAndUpdate(
            data.bookId,
            {
                isAuction: true,
                auctionId: createdAuction._id,
            },
            {
                session,
                new: true,
            }
        );

        await session.commitTransaction();

        return createdAuction;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        await session.endSession();
    }
};

export const updateAuctionBookService = async (
  auctionId: string,
  data: Partial<IAuction>
) => {
  const auction = await Auction.findById(auctionId);

  if (!auction) {
    throw new Error("Auction not found");
  }

  const startDate = data.startDate ?? auction.startDate;
  const duration = data.duration ?? auction.duration;

  const status = calculateAuctionStatus(
    startDate,
    duration
  );

  const updatedAuction = await Auction.findByIdAndUpdate(
    auctionId,
    {
      $set: {
        ...data,
        status,
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  return updatedAuction;
};
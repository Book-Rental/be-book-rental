
import mongoose from "mongoose";
import Auction from "../models/Auction";
import Book, { IBook } from "../models/Book";
import Category from "../models/Category";
import { buildPaginationQuery } from "../utils/appFunctions";
import { IAuction } from "../models/interfaces";
import { calculateAuctionStatus } from "../helper/auctionStatus";
import AuctionBid from "../models/AuctionBid";

export const createBookService = async (
    data: Partial<IBook>
) => {
    try {
        const parsedData: Partial<IBook> = {
            ...data,
        };

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

/**
 * DELETE BOOK
 */
export const deleteBookByIdService = async (
    id: string
) => {
    try {
        const deletedBook =
            await Book.findByIdAndDelete(id);

        return deletedBook;
    } catch (err) {
        throw err;
    }
};

export const getBookByIdService = async (
    id: string
) => {
    try {
        const book = await Book.findById(id)
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
            .lean();

        if (!book) {
            return null;
        }

        const auction =
            book.auctionId as any;

        if (!auction || !auction._id) {
            return book;
        }

        const status =
            calculateAuctionStatus(
                auction.startDate,
                auction.duration
            );

        const highestBid =
            await AuctionBid.findOne({
                auctionId: auction._id,
            })
                .sort({
                    bidPrice: -1,
                })
                .populate({
                    path: "userId",
                    select:
                        "_id firstName lastName email",
                })
                .select(
                    "bidPrice userId"
                )
                .lean();

        return {
            ...book,

            auctionId: {
                ...auction,

                status,

                currentBidPrice:
                    highestBid?.bidPrice ??
                    auction.bidPrice,

                highestBidder:
                    highestBid?.userId
                        ? {
                              userId:
                                  (
                                      highestBid.userId as any
                                  )._id,

                              name:
                                  `${(
                                      highestBid.userId as any
                                  ).firstName} ` +
                                  `${(
                                      highestBid.userId as any
                                  ).lastName}`,

                              email:
                                  (
                                      highestBid.userId as any
                                  ).email,
                          }
                        : null,
            },
        };
    } catch (err) {
        throw err;
    }
};

/**
 * UPDATE BOOK
 */
export const updateBookByIdService = async (
    id: string,
    data: Partial<IBook>
) => {
    try {
        const updatedBook =
            await Book.findByIdAndUpdate(
                id,
                data,
                {
                    new: true,
                }
            );

        return updatedBook;
    } catch (err) {
        throw err;
    }
};

export const getBooksBySellerIdService =
    async (
        sellerId: string,
        query: any
    ) => {
        try {
            const {
                skip,
                limit,
                page,
            } = buildPaginationQuery(
                query
            );

            const filter: Record<
                string,
                any
            > = {
                sellerId,
            };

            if (query.categoryId) {
                filter.categoryId =
                    query.categoryId;
            }

            if (query.categoryName) {
                const category =
                    await Category.findOne({
                        name: {
                            $regex: `^${query.categoryName}$`,
                            $options: "i",
                        },
                        isActive: true,
                    }).select("_id");

                if (category) {
                    filter.categoryId =
                        category._id;
                } else {
                    return {
                        books: [],

                        meta: {
                            totalRecords: 0,
                            totalPages: 0,
                            currentPage:
                                page,
                            limit,
                            hasMore: false,
                        },
                    };
                }
            }

            const totalRecords =
                await Book.countDocuments(
                    filter
                );

            const totalPages =
                Math.ceil(
                    totalRecords / limit
                );

            const hasMore =
                page < totalPages;

            const books =
                await Book.find(filter)
                    .populate(
                        "categoryId",
                        "name"
                    )
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

            const booksWithAuctionDetails =
                await Promise.all(
                    books.map(
                        async (book) => {
                            const auction =
                                book.auctionId as any;

                            if (
                                !auction ||
                                !auction._id
                            ) {
                                return book;
                            }

                            const status =
                                calculateAuctionStatus(
                                    auction.startDate,
                                    auction.duration
                                );

                            const highestBid =
                                await AuctionBid.findOne(
                                    {
                                        auctionId:
                                            auction._id,
                                    }
                                )
                                    .sort({
                                        bidPrice:
                                            -1,
                                    })
                                    .select(
                                        "bidPrice"
                                    )
                                    .lean();

                            return {
                                ...book,

                                auctionId: {
                                    ...auction,

                                    status,

                                    currentBidPrice:
                                        highestBid?.bidPrice ??
                                        auction.bidPrice,
                                },
                            };
                        }
                    )
                );

            return {
                books:
                    booksWithAuctionDetails,

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

export const createAuctionBookService =
    async (
        data: Partial<IAuction>
    ) => {
        const session =
            await mongoose.startSession();

        try {
            session.startTransaction();
            const book =
                await Book.findById(
                    data.bookId
                ).session(session);

            if (!book) {
                throw new Error(
                    "Book not found"
                );
            }

            if (book.isAuction) {
                throw new Error(
                    "This book is already available for auction"
                );
            }

            const auction =
                await Auction.create(
                    [
                        {
                            bookId:
                                data.bookId,

                            bidPrice:
                                data.bidPrice,

                            buyNowPrice:
                                data.buyNowPrice,

                            duration:
                                data.duration,

                            startDate:
                                data.startDate,
                        },
                    ],
                    {
                        session,
                    }
                );

            const createdAuction =
                auction[0];

            await Book.findByIdAndUpdate(
                data.bookId,
                {
                    isAuction: true,

                    auctionId:
                        createdAuction._id,
                },
                {
                    session,
                    new: true,
                }
            );

            await session.commitTransaction();

            const status =
                calculateAuctionStatus(
                    createdAuction.startDate,
                    createdAuction.duration
                );

            return {
                ...createdAuction.toObject(),

                status,
            };
        } catch (error) {
            await session.abortTransaction();

            throw error;
        } finally {
            await session.endSession();
        }
    };

export const updateAuctionBookService =
    async (
        auctionId: string,
        data: Partial<IAuction>
    ) => {
        const auction =
            await Auction.findById(
                auctionId
            );

        if (!auction) {
            throw new Error(
                "Auction not found"
            );
        }
        const updatedAuction =
            await Auction.findByIdAndUpdate(
                auctionId,
                {
                    $set: {
                        ...data,
                    },
                },
                {
                    new: true,
                    runValidators: true,
                }
            );

        if (!updatedAuction) {
            throw new Error(
                "Auction update failed"
            );
        }

        const status =
            calculateAuctionStatus(
                updatedAuction.startDate,
                updatedAuction.duration
            );

        return {
            ...updatedAuction.toObject(),

            status,
        };
    };

/**
 * GET AUCTION BID DETAILS
 *
 * Status is calculated dynamically.
 */
export const getBookAuctionBidDetailsService =
    async (
        bookId: string,
        userId: string
    ) => {

        const book =
            await Book.findById(
                bookId
            ).lean();

        if (!book) {
            return null;
        }
        const auction =
            await Auction.findOne({
                bookId,
            }).lean();

        if (!auction) {
            throw new Error(
                "Auction not found for this book"
            );
        }

        const status =
            calculateAuctionStatus(
                auction.startDate,
                auction.duration
            );
        const highestBid =
            await AuctionBid.findOne({
                auctionId:
                    auction._id,
            })
                .sort({
                    bidPrice: -1,
                })
                .lean();

        const userBid =
            await AuctionBid.findOne({
                auctionId:
                    auction._id,

                userId,
            })
                .sort({
                    bidPrice: -1,
                })
                .lean();


        const currentBid =
            highestBid?.bidPrice ??
            auction.bidPrice;

        const isHighestBidder =
            highestBid?.userId?.toString() ===
            userId;

        return {
            book,
            auction: {
                ...auction,

                status,
            },

            currentBid,

            userBid,

            isHighestBidder,
        };
    };


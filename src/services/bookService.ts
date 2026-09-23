import mongoose from "mongoose";
import Auction from "../models/Auction";
import Book, { IBook } from "../models/Book";
import Category from "../models/Category";
import { buildPaginationQuery } from "../utils/appFunctions";
import { IAuction } from "../models/interfaces";
import {
    AuctionStatus,
    calculateAuctionStatus,
    getAuctionStatus,
} from "../helper/auctionStatus";
import AuctionBid from "../models/AuctionBid";
import Order from "../models/Order";

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
                    startDate
                    isActive
                    status
                    createdAt
                `,
            })
            .lean();

        if (!book) {
            return null;
        }

        /*
         * Book is not currently an auction.
         *
         * auctionId may still contain the previous
         * cancelled auction ID. We keep it because
         * auction history must not be deleted.
         */
        if (!book.isAuction) {
            return book;
        }

        const auction = book.auctionId as unknown as {
            _id: any;
            bookId: any;
            bidPrice: number;
            buyNowPrice?: number;
            duration: number;
            startDate: Date;
            isActive: boolean;
            status?: string;
            createdAt?: Date;
        };

        if (!auction || !auction._id) {
            return book;
        }

        /*
         * Calculate the current auction status.
         *
         * getAuctionStatus() handles:
         * upcoming
         * live
         * completed
         * cancelled
         */
        const auctionStatus = getAuctionStatus(
            auction.isActive,
            auction.startDate,
            auction.duration
        );

        /*
         * Get highest bid for this auction.
         */
        const highestBid = await AuctionBid.findOne({
            auctionId: auction._id,
        })
            .sort({
                bidPrice: -1,
            })
            .populate({
                path: "userId",
                select: `
                    _id
                    firstName
                    lastName
                    email
                    phone
                    profileImage
                `,
            })
            .select(
                "bidPrice userId createdAt"
            )
            .lean();

        /*
         * Find order created for this auction.
         */
        const order = await Order.findOne({
            orderType: "auction",
            "items.bookId": book._id,
            "auctionDetails.auctionId":
                auction._id,
        })
            .sort({
                createdAt: -1,
            })
            .lean();

        const isOrder = !!order;

        const orderStatus =
            order?.orderStatus ?? null;

        /*
         * Highest bidder details.
         */
        const bidder =
            highestBid?.userId as any;

        const highestBidder = bidder
            ? {
                  userId: bidder._id,

                  name: `${bidder.firstName ?? ""} ${
                      bidder.lastName ?? ""
                  }`.trim(),

                  email:
                      bidder.email ?? null,

                  phone:
                      bidder.phone ?? null,

                  profileImage:
                      bidder.profileImage ??
                      null,
              }
            : null;

        /*
         * Auction is considered sold only when:
         *
         * 1. Auction has completed
         * 2. An order was created
         */
        const isAuctionSold =
            auctionStatus ===
                AuctionStatus.COMPLETED &&
            isOrder;

        /*
         * Cancellation is based on the persisted
         * auction state.
         */
        const isAuctionCancelled =
            auctionStatus ===
            AuctionStatus.CANCELLED;

        return {
            ...book,

            /*
             * Book state after auction is sold.
             */
            status: isAuctionSold
                ? "inactive"
                : book.status,

            isActive: isAuctionSold
                ? false
                : book.isActive,

            isAvailable: isAuctionSold
                ? false
                : book.isAvailable,

            /*
             * Do not modify the original book's
             * rent/sale flags just because the
             * auction was cancelled.
             *
             * Preserve the actual Book values.
             */
            availableForRent:
                isAuctionSold
                    ? false
                    : book.availableForRent,

            availableForSale:
                isAuctionSold
                    ? false
                    : book.availableForSale,

            /*
             * auctionId contains the CURRENT auction
             * because Book.auctionId stores only one ID.
             */
            auctionId: {
                ...auction,

                /*
                 * Always return the calculated status.
                 *
                 * Cancelled auction:
                 * status = "cancelled"
                 */
                status: auctionStatus,

                /*
                 * Highest/current bid.
                 */
                currentBidPrice:
                    highestBid?.bidPrice ??
                    auction.bidPrice,

                highestBidder,

                highestBid: highestBid
                    ? {
                          _id:
                              highestBid._id,

                          bidPrice:
                              highestBid.bidPrice,

                          userId:
                              bidder?._id ??
                              null,

                          createdAt:
                              highestBid.createdAt,
                      }
                    : null,

                isOrder,

                orderStatus,
            },
        };
    } catch (err) {
        throw err;
    }
};

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

export const getBooksBySellerIdService = async (
    sellerId: string,
    query: any
) => {
    const {
        page = 1,
        limit = 10,
        categoryId,
        categoryName,
    } = query;

    const pageNumber = Math.max(
        Number(page),
        1
    );

    const limitNumber = Math.max(
        Number(limit),
        1
    );

    const skip =
        (pageNumber - 1) *
        limitNumber;

    const filter: any = {
        sellerId,
    };

    /*
     * Category filter
     */
    if (categoryId) {
        filter.categoryId = categoryId;
    }

    const books = await Book.find(filter)
        .populate({
            path: "categoryId",
        })
        .skip(skip)
        .limit(limitNumber)
        .lean();

    const total = await Book.countDocuments(
        filter
    );

    const booksWithAuctionDetails =
        await Promise.all(
            books.map(async (book) => {
                /*
                 * Get ALL auctions for this book.
                 *
                 * This is the important change.
                 *
                 * We don't use findOne().
                 * We don't use only book.auctionId.
                 */
                const auctions =
                    await Auction.find({
                        bookId: book._id,
                    })
                        .sort({
                            createdAt: 1,
                        })
                        .lean();

                /*
                 * No auction history.
                 */
                if (auctions.length === 0) {
                    return {
                        ...book,

                        category:
                            book.categoryId,

                        auction: [],
                    };
                }

                /*
                 * Process every auction.
                 */
                const auctionDetails =
                    await Promise.all(
                        auctions.map(
                            async (
                                auction
                            ) => {
                                /*
                                 * Calculate current
                                 * auction status.
                                 */
                                const auctionStatus =
                                    getAuctionStatus(
                                        auction.isActive,
                                        auction.startDate,
                                        auction.duration
                                    );

                                /*
                                 * Get all bids for
                                 * this particular auction.
                                 */
                                const bids =
                                    await AuctionBid.find(
                                        {
                                            auctionId:
                                                auction._id,
                                        }
                                    )
                                        .sort({
                                            bidPrice:
                                                -1,
                                        })
                                        .populate({
                                            path: "userId",
                                            select: `
                                                _id
                                                firstName
                                                lastName
                                                email
                                                phone
                                                profileImage
                                                addresses
                                            `,
                                        })
                                        .select(
                                            "bidPrice userId createdAt"
                                        )
                                        .lean();

                                /*
                                 * Highest bid.
                                 */
                                const highestBid =
                                    bids[0] ??
                                    null;

                                const bidder =
                                    highestBid?.userId as any;

                                /*
                                 * Get default address.
                                 */
                                const defaultAddress =
                                    bidder?.addresses?.find(
                                        (
                                            address: any
                                        ) =>
                                            address.isDefault
                                    ) ??
                                    bidder?.addresses?.[0] ??
                                    null;

                                /*
                                 * Highest bidder details.
                                 */
                                const highestBidder =
                                    bidder
                                        ? {
                                              userId:
                                                  bidder._id,

                                              name: `${bidder.firstName ?? ""} ${
                                                  bidder.lastName ?? ""
                                              }`.trim(),

                                              email:
                                                  bidder.email ??
                                                  null,

                                              phone:
                                                  defaultAddress?.phone ??
                                                  null,

                                              profileImage:
                                                  bidder.profileImage ??
                                                  null,

                                              address:
                                                  defaultAddress
                                                      ? {
                                                            _id:
                                                                defaultAddress._id,

                                                            name:
                                                                defaultAddress.name,

                                                            type:
                                                                defaultAddress.type,

                                                            street:
                                                                defaultAddress.street,

                                                            city:
                                                                defaultAddress.city,

                                                            state:
                                                                defaultAddress.state,

                                                            zipCode:
                                                                defaultAddress.zipCode,

                                                            country:
                                                                defaultAddress.country,

                                                            phone:
                                                                defaultAddress.phone,

                                                            location:
                                                                defaultAddress.location,

                                                            isDefault:
                                                                defaultAddress.isDefault,
                                                        }
                                                      : null,
                                          }
                                        : null;

                                /*
                                 * Find order for this
                                 * particular auction.
                                 */
                                const order =
                                    await Order.findOne(
                                        {
                                            orderType:
                                                "auction",

                                            "items.bookId":
                                                book._id,

                                            "auctionDetails.auctionId":
                                                auction._id,
                                        }
                                    )
                                        .sort({
                                            createdAt:
                                                -1,
                                        })
                                        .lean();

                                /*
                                 * Return complete auction
                                 * history item.
                                 */
                                return {
                                    _id:
                                        auction._id,

                                    bookId:
                                        auction.bookId,

                                    bidPrice:
                                        auction.bidPrice,

                                    buyNowPrice:
                                        auction.buyNowPrice,

                                    duration:
                                        auction.duration,

                                    startDate:
                                        auction.startDate,

                                    isActive:
                                        auction.isActive,

                                    status:
                                        auctionStatus,

                                    currentBidPrice:
                                        highestBid?.bidPrice ??
                                        auction.bidPrice,

                                    highestBid:
                                        highestBid
                                            ? {
                                                  _id:
                                                      highestBid._id,

                                                  auctionId:
                                                      auction._id,

                                                  userId:
                                                      bidder?._id ??
                                                      null,

                                                  bidPrice:
                                                      highestBid.bidPrice,

                                                  createdAt:
                                                      highestBid.createdAt,

                                                  bidder:
                                                      bidder
                                                          ? {
                                                                _id:
                                                                    bidder._id,

                                                                email:
                                                                    bidder.email ??
                                                                    null,
                                                            }
                                                          : null,
                                              }
                                            : null,

                                    highestBidder,

                                    bidCount:
                                        bids.length,

                                    order:
                                        order ??
                                        null,
                                };
                            }
                        )
                    );

                /*
                 * Return book with complete auction history.
                 */
                return {
                    ...book,

                    category:
                        book.categoryId,

                    auction:
                        auctionDetails,

                    availableForRent:
                        book.availableForRent,

                    availableForSale:
                        book.availableForSale,
                };
            })
        );

    return {
        books:
            booksWithAuctionDetails,

        pagination: {
            page: pageNumber,

            limit: limitNumber,

            total,

            totalPages:
                Math.ceil(
                    total /
                        limitNumber
                ),

            hasNextPage:
                pageNumber <
                Math.ceil(
                    total /
                        limitNumber
                ),

            hasPreviousPage:
                pageNumber > 1,
        },
    };
};

export const createAuctionBookService = async (
    payload: {
        bookId: string;
        bidPrice: number;
        buyNowPrice?: number;
        duration: number;
        startDate: string;
    }
) => {
    const {
        bookId,
        bidPrice,
        buyNowPrice,
        duration,
        startDate,
    } = payload;

    const book = await Book.findById(bookId);

    if (!book) {
        throw new Error("Book not found");
    }

    /*
     * Check the current auction attached to the book.
     */
    if (book.auctionId) {
        const existingAuction =
            await Auction.findById(
                book.auctionId
            );

        /*
         * Do not allow another auction if
         * the current auction is still active.
         */
        if (
            existingAuction &&
            existingAuction.isActive === true
        ) {
            throw new Error(
                "An active auction already exists for this book"
            );
        }
    }

    /*
     * IMPORTANT:
     *
     * Always create a NEW auction document.
     *
     * If the previous auction was cancelled,
     * its document will remain in MongoDB.
     */
    const auction = await Auction.create({
        bookId: book._id,

        bidPrice,

        buyNowPrice,

        duration,

        startDate: new Date(startDate),

        isActive: true,

        status: AuctionStatus.UPCOMING,
    });

    /*
     * Update book with the NEW auction ID.
     *
     * The old cancelled auction is NOT deleted.
     */
    const updatedBook =
        await Book.findByIdAndUpdate(
            book._id,
            {
                $set: {
                    isAuction: true,

                    auctionId:
                        auction._id,

                    availableForRent: false,

                    isAvailable: true,

                    isActive: true,

                    availabilityStatus:
                        "available",

                    status: "active",
                },
            },
            {
                new: true,
            }
        );

    if (!updatedBook) {
        /*
         * Remove only the newly-created auction
         * if updating the book failed.
         */
        await Auction.findByIdAndDelete(
            auction._id
        );

        throw new Error(
            "Failed to update book"
        );
    }

    return auction;
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
            getAuctionStatus(
                updatedAuction.isActive,
                updatedAuction.startDate,
                updatedAuction.duration
            );

        return {
            ...updatedAuction.toObject(),

            status,
        };
    };


export const cancelAuctionService = async (
    auctionId: string
) => {
    const auction =
        await Auction.findById(auctionId);

    if (!auction) {
        throw new Error(
            "Auction not found"
        );
    }

    const currentStatus =
        getAuctionStatus(
            auction.isActive,
            auction.startDate,
            auction.duration
        );

    if (
        currentStatus ===
        AuctionStatus.CANCELLED
    ) {
        throw new Error(
            "Auction is already cancelled"
        );
    }

    /*
     * IMPORTANT:
     *
     * Keep the auction document.
     * Keep all its bids.
     *
     * Only change its status.
     */
    auction.isActive = false;

    auction.status =
        AuctionStatus.CANCELLED;

    await auction.save();

    /*
     * Make the book available again.
     *
     * DO NOT set auctionId to null.
     */
    const book =
        await Book.findByIdAndUpdate(
            auction.bookId,
            {
                $set: {
                    isAuction: false,

                    availableForRent: true,

                    isAvailable: true,

                    availabilityStatus:
                        "available",

                    isActive: true,

                    status: "active",
                },
            },
            {
                new: true,
            }
        );

    if (!book) {
        throw new Error(
            "Related book not found"
        );
    }

    return auction;
};

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

        if (!book.auctionId) {
    throw new Error(
        "No auction is associated with this book"
    );
}

const auction = await Auction.findById(
    book.auctionId
).lean();

if (!auction) {
    throw new Error(
        "Current auction not found"
    );
}

        if (!auction) {
            throw new Error(
                "Auction not found for this book"
            );
        }

        const status =
            getAuctionStatus(
                auction.isActive,
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
                    select: `
                        _id
                        firstName
                        lastName
                        email
                        phone
                        profileImage
                    `,
                })
                .lean();

        const userBid =
            await AuctionBid.findOne({
                auctionId: auction._id,
                userId,
            })
                .sort({
                    bidPrice: -1,
                })
                .lean();

        const order =
            await Order.findOne({
                orderType: "auction",
                "items.bookId":
                    book._id,
                "auctionDetails.auctionId":
                    auction._id,
            })
                .sort({
                    createdAt: -1,
                })
                .lean();

        const isOrder = !!order;

        const orderStatus =
            order?.orderStatus ??
            null;

        const bidder =
            highestBid?.userId as any;

        const highestBidder =
            bidder
                ? {
                      userId:
                          bidder._id,

                      name: `${bidder.firstName ?? ""} ${
                          bidder.lastName ?? ""
                      }`.trim(),

                      email:
                          bidder.email,

                      phone:
                          bidder.phone,

                      profileImage:
                          bidder.profileImage,
                  }
                : null;

        const currentBid =
            highestBid?.bidPrice ??
            auction.bidPrice;

        const highestBidUserId =
            bidder?._id?.toString() ??
            highestBid?.userId?.toString();

        const isHighestBidder =
            highestBidUserId === userId;

        const isAuctionSold =
            status ===
                AuctionStatus.COMPLETED &&
            isOrder;

        const isAuctionCancelled =
            auction.isActive === false &&
            status ===
                AuctionStatus.CANCELLED;

        return {
            book: {
                ...book,

                status:
                    isAuctionSold
                        ? "inactive"
                        : book.status,

                isActive:
                    isAuctionSold
                        ? false
                        : book.isActive,

                isAvailable:
                    isAuctionSold
                        ? false
                        : book.isAvailable,

                availableForRent:
                    isAuctionCancelled
                        ? true
                        : isAuctionSold
                            ? false
                            : book.availableForRent,

                availableForSale:
                    isAuctionCancelled
                        ? true
                        : isAuctionSold
                            ? false
                            : book.availableForSale,
            },

            auction: {
                ...auction,

                status,

                currentBidPrice:
                    currentBid,

                highestBidder,

                highestBid:
                    highestBid
                        ? {
                              _id:
                                  highestBid._id,

                              bidPrice:
                                  highestBid.bidPrice,

                              userId:
                                  bidder?._id,

                              createdAt:
                                  highestBid.createdAt,
                          }
                        : null,

                isOrder,

                orderStatus,
            },

            currentBid,

            userBid,

            isHighestBidder,
        };
    };

import mongoose from "mongoose";
import Auction from "../models/Auction";
import Book, { IBook } from "../models/Book";
import Category from "../models/Category";
import { buildPaginationQuery } from "../utils/appFunctions";
import { IAuction } from "../models/interfaces";
import { calculateAuctionStatus } from "../helper/auctionStatus";
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
                    createdAt
                `,
            })
            .lean();

        if (!book) {
            return null;
        }

        if (!book.isAuction) {
            return book;
        }

        const auction = book.auctionId as any;

        if (!auction || !auction._id) {
            return book;
        }
        const auctionStatus = calculateAuctionStatus(
            auction.startDate,
            auction.duration
        );
        const highestBid = await AuctionBid.findOne({
            auctionId: auction._id,
        })
            .sort({
                bidPrice: -1,
            })
            .populate({
                path: "userId",
                select: "_id firstName lastName email phone profileImage",
            })
            .select("bidPrice userId createdAt")
            .lean();
        const order = await Order.findOne({
    orderType: "auction",
    "items.bookId": book._id,
    "auctionDetails.auctionId": auction._id,
})
    .sort({
        createdAt: -1,
    })
    .lean();

const isOrder = !!order;

const orderStatus = order?.orderStatus ?? null;


        const bidder = highestBid?.userId as any;

        const highestBidder = bidder
            ? {
                  userId: bidder._id,
                  name: `${bidder.firstName ?? ""} ${
                      bidder.lastName ?? ""
                  }`.trim(),
                  email: bidder.email,
                  phone: bidder.phone,
                  profileImage: bidder.profileImage,
              }
            : null;
        const isAuctionSold =
            auctionStatus === "completed" && isOrder;
        return {
            ...book,

            status: isAuctionSold
                ? "inactive"
                : book.status,

            isActive: isAuctionSold
                ? false
                : book.isActive,

            isAvailable: isAuctionSold
                ? false
                : book.isAvailable,

            availableForRent: isAuctionSold
        ? false
        : book.availableForRent,
            auctionId: {
                ...auction,

                status: auctionStatus,

                currentBidPrice:
                    highestBid?.bidPrice ??
                    auction.bidPrice,

                highestBidder,

                highestBid: highestBid
                    ? {
                          _id: highestBid._id,
                          bidPrice: highestBid.bidPrice,
                          userId: bidder?._id,
                          createdAt: highestBid.createdAt,
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
    try {
        const {
            skip,
            limit,
            page,
        } = buildPaginationQuery(query);

        const filter: Record<string, any> = {
            sellerId,
        };

        // Category ID
        if (query.categoryId) {
            filter.categoryId = query.categoryId;
        }

        // Category name
        if (query.categoryName) {
            const category = await Category.findOne({
                name: {
                    $regex: `^${query.categoryName}$`,
                    $options: "i",
                },
                isActive: true,
            }).select("_id");

            if (!category) {
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

            filter.categoryId = category._id;
        }

        const totalRecords =
            await Book.countDocuments(filter);

        const totalPages = Math.ceil(
            totalRecords / limit
        );

        const hasMore = page < totalPages;
        const books = await Book.find(filter)
            .populate(
                "categoryId",
                "name description isActive isPopular"
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
                books.map(async (book) => {

                    if (!book.isAuction) {
                        return {
                            ...book,
                            category: book.categoryId,
                            availableForRent: book.availableForRent,
                        };
                    }

                    const auction =
                        book.auctionId as any;

                    // Auction does not exist
                    if (
                        !auction ||
                        !auction._id
                    ) {
                        return {
                            ...book,
                            category: book.categoryId,
                            auction: null,
                        };
                    }

                    const auctionStatus =
                        calculateAuctionStatus(
                            auction.startDate,
                            auction.duration
                        );

                    const bids =
                        await AuctionBid.find({
                            auctionId:
                                auction._id,
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


                    const highestBid =
                        bids[0] ?? null;


const bidder = highestBid?.userId as any;

const defaultAddress =
    bidder?.addresses?.find(
        (address: any) => address.isDefault
    ) ??
    bidder?.addresses?.[0] ??
    null;
                    const highestBidder = bidder
    ? {
          userId: bidder._id,
          name: `${bidder.firstName ?? ""} ${
              bidder.lastName ?? ""
          }`.trim(),
          email: bidder.email,
          phone: defaultAddress?.phone ?? null,
          profileImage: bidder.profilePic ?? null,
          address: defaultAddress
              ? {
                    _id: defaultAddress._id,
                    name: defaultAddress.name,
                    type: defaultAddress.type,
                    street: defaultAddress.street,
                    city: defaultAddress.city,
                    state: defaultAddress.state,
                    zipCode: defaultAddress.zipCode,
                    country: defaultAddress.country,
                    phone: defaultAddress.phone,
                    location: defaultAddress.location,
                    isDefault: defaultAddress.isDefault,
                }
              : null,
      }
    : null;

                    const order =
                        await Order.findOne({
                            orderType:
                                "auction",

                            "items.bookId":
                                book._id,

                            "auctionDetails.auctionId":
                                auction._id,
                        })
                            .sort({
                                createdAt: -1,
                            })
                            .lean();

                    const isOrder =
                        !!order;

                    const orderStatus =
                        order?.orderStatus ??
                        null;

                    const isAuctionSold =
                        auctionStatus ===
                            "completed" &&
                        isOrder;


                    const availabilityStatus =
                        isAuctionSold
                            ? "unavailable"
                            : book.availabilityStatus;

                    const auctionResponse = {
                        _id: auction._id,

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
                            order ?? null,
                    };

                    return {
                        ...book,

                        auctionId:
                            auction._id,

                        category:
                            book.categoryId,

                        availabilityStatus,

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

                         availableForRent: false,

                        availableForSale:
                            isAuctionSold
                                ? false
                                : book.availableForSale,

                        auction:
                            auctionResponse,
                    };
                })
            );


        return {
            books: booksWithAuctionDetails,

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

export const getBookAuctionBidDetailsService = async (
    bookId: string,
    userId: string
) => {
    const book = await Book.findById(bookId).lean();

    if (!book) {
        return null;
    }

    const auction = await Auction.findOne({
        bookId,
    }).lean();

    if (!auction) {
        throw new Error(
            "Auction not found for this book"
        );
    }

    const status = calculateAuctionStatus(
        auction.startDate,
        auction.duration
    );

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
        .lean();

    const userBid = await AuctionBid.findOne({
        auctionId: auction._id,
        userId,
    })
        .sort({
            bidPrice: -1,
        })
        .lean();

    const order = await Order.findOne({
        orderType: "auction",
        "items.bookId": book._id,
        "auctionDetails.auctionId": auction._id,
    })
        .sort({
            createdAt: -1,
        })
        .lean();

    const isOrder = !!order;

    const orderStatus =
        order?.orderStatus ?? null;

    const bidder =
        highestBid?.userId as any;

    const highestBidder = bidder
        ? {
              userId: bidder._id,

              name: `${bidder.firstName ?? ""} ${
                  bidder.lastName ?? ""
              }`.trim(),

              email: bidder.email,

              phone: bidder.phone,

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
        status === "completed" && isOrder;

    return {
        book: {
            ...book,

            status: isAuctionSold
                ? "inactive"
                : book.status,

            isActive: isAuctionSold
                ? false
                : book.isActive,

            isAvailable: isAuctionSold
                ? false
                : book.isAvailable,

            availableForRent:
                isAuctionSold
                    ? false
                    : book.availableForRent,

            availableForSale:
                isAuctionSold
                    ? false
                    : book.availableForSale,
        },

        auction: {
            ...auction,

            status,

            currentBidPrice:
                currentBid,

            highestBidder,

            highestBid: highestBid
                ? {
                      _id: highestBid._id,

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

            // order: order ?? null,
        },

        currentBid,

        userBid,

        isHighestBidder,
    };
};
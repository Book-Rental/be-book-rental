import mongoose from "mongoose";
import Auction, { AuctionStatus } from "../models/Auction";
import AuctionBid from "../models/AuctionBid";
import { calculateAuctionStatus } from "../helper/auctionStatus";

export const createAuctionBidService = async (data: {
    auctionId: string;
    bookId: string;
    userId: string;
    bidPrice: number;
}) => {
    const {
        auctionId,
        bookId,
        userId,
        bidPrice,
    } = data;

    const auction = await Auction.findById(auctionId);

    if (!auction) {
        throw new Error("Auction not found");
    }

    // Validate auction belongs to book
    if (
        auction.bookId.toString() !==
        bookId?.toString().trim()
    ) {
        throw new Error(
            "Auction does not belong to this book"
        );
    }

    // Calculate auction status dynamically
    const status = calculateAuctionStatus(
        auction.startDate,
        auction.duration
    );

    // Only LIVE auctions can accept bids
    if (status === AuctionStatus.UPCOMING) {
        throw new Error(
            "Auction has not started yet"
        );
    }

    if (status === AuctionStatus.COMPLETED) {
        throw new Error("Auction has ended");
    }

    if (status === AuctionStatus.CANCELLED) {
        throw new Error(
            "Auction has been cancelled"
        );
    }

    // Check if user has already placed a bid
    const existingBid = await AuctionBid.findOne({
        auctionId: auction._id,
        userId,
    });

    if (existingBid) {
        throw new Error(
            "You have already placed a bid. Please use the update bid API to change your bid."
        );
    }

    // Get current highest bid
    const highestBid = await AuctionBid.findOne({
        auctionId: auction._id,
    })
        .sort({ bidPrice: -1 })
        .lean();

    const currentBidPrice =
        highestBid?.bidPrice ?? auction.bidPrice;

    // Bid must be higher than current bid
    if (bidPrice <= currentBidPrice) {
        throw new Error(
            `Your bid must be higher than the current highest bid of ₹${currentBidPrice}`
        );
    }

    // Create first bid
    const bid = await AuctionBid.create({
        auctionId: auction._id,
        bookId: auction.bookId,
        userId,
        bidPrice,
    });

    return bid;
};

export const getAllAuctionBidsService = async (
    auctionId: string,
    page = 1,
    limit = 10
) => {
    const auction = await Auction.findById(auctionId)
        .populate(
            "bookId",
            "name description imageUrl author price category"
        )
        .lean();

    if (!auction) {
        throw new Error("Auction not found");
    }

    const pageNumber = Math.max(Number(page), 1);
    const limitNumber = Math.max(Number(limit), 1);
    const skip = (pageNumber - 1) * limitNumber;

    const [bids, total] = await Promise.all([
        AuctionBid.find({
            auctionId,
        })
            .populate(
                "userId",
                "firstName lastName email addresses"
            )
            .sort({
                bidPrice: -1,
                createdAt: 1,
            })
            .skip(skip)
            .limit(limitNumber)
            .lean(),

        AuctionBid.countDocuments({
            auctionId,
        }),
    ]);

    const currentBidPrice =
        bids.length > 0
            ? bids[0].bidPrice
            : auction.bidPrice;
const book = auction.bookId as any;
   return {
    auction: {
        _id: auction._id,
        bookId: book._id,
        bidPrice: auction.bidPrice,
        buyNowPrice: auction.buyNowPrice,
        duration: auction.duration,
        startDate: auction.startDate,
        currentBidPrice,
    },

    book: book,

    bids: bids.map((bid, index) => {
        const user = bid.userId as any;

        const defaultAddress =
            user?.addresses?.find(
                (address: any) => address.isDefault
            );

        const address =
            defaultAddress ??
            user?.addresses?.[0];

        return {
            _id: bid._id,

            rank: skip + index + 1,

            user: {
                userId: user?._id,
                name: `${user?.firstName ?? ""} ${
                    user?.lastName ?? ""
                }`.trim(),
                email: user?.email ?? "",
                phone: address?.phone ?? "",
            },

            bidPrice: bid.bidPrice,
        };
    }),

    pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.ceil(
            total / limitNumber
        ),
        hasNextPage:
            pageNumber <
            Math.ceil(total / limitNumber),
        hasPreviousPage: pageNumber > 1,
    },
};
};

export const updateAuctionBidService = async (
    bidId: string,
    data: {
        auctionId: string;
        userId: string;
        bidPrice: number;
    }
) => {
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        const auction = await Auction.findById(
            data.auctionId
        ).session(session);

        if (!auction) {
            throw new Error("Auction not found");
        }

        // Calculate auction status dynamically
        const auctionStatus = calculateAuctionStatus(
            auction.startDate,
            auction.duration
        );

        if (auctionStatus !== AuctionStatus.LIVE) {
            throw new Error(
                "Bidding is available only for live auctions"
            );
        }

        const bid = await AuctionBid.findOne({
            _id: bidId,
            auctionId: data.auctionId,
            userId: data.userId,
        }).session(session);

        if (!bid) {
            throw new Error(
                "Bid not found for this user"
            );
        }

        if (data.bidPrice <= bid.bidPrice) {
            throw new Error(
                `New bid must be greater than your previous bid of ${bid.bidPrice}`
            );
        }

        const highestBid = await AuctionBid.findOne({
            auctionId: data.auctionId,
        })
            .sort({ bidPrice: -1 })
            .session(session);

        if (
            highestBid &&
            data.bidPrice <= highestBid.bidPrice
        ) {
            throw new Error(
                `Bid price must be greater than the current highest bid of ${highestBid.bidPrice}`
            );
        }

        bid.bidPrice = data.bidPrice;

        const updatedBid = await bid.save({
            session,
        });

        await session.commitTransaction();

        return updatedBid;

    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        await session.endSession();
    }
};


export const getAllUserBidsService = async (
    userId: string,
    page = 1,
    limit = 10,
    bidStatus?: string
) => {
    const pageNumber = Math.max(Number(page), 1);
    const limitNumber = Math.max(Number(limit), 1);
    const skip = (pageNumber - 1) * limitNumber;

    const bids = await AuctionBid.find({
        userId,
    })
        .populate("auctionId")
        .populate("bookId")
        .sort({ createdAt: -1 })
        .lean();

    const results = await Promise.all(
        bids.map(async (bid) => {
            const auction = bid.auctionId as any;
            const book = bid.bookId as any;

            const highestBid = await AuctionBid.findOne({
                auctionId: auction._id,
            })
                .sort({ bidPrice: -1 })
                .select("bidPrice userId")
                .lean();

            const status = calculateAuctionStatus(
                auction.startDate,
                auction.duration
            );

            const isHighestBidder =
                highestBid?.userId?.toString() === userId;

            let calculatedBidStatus: string;

            switch (status) {
                case AuctionStatus.UPCOMING:
                    calculatedBidStatus = "upcoming";
                    break;

                case AuctionStatus.LIVE:
                    calculatedBidStatus = isHighestBidder
                        ? "winning"
                        : "outbid";
                    break;

                case AuctionStatus.COMPLETED:
                    calculatedBidStatus = isHighestBidder
                        ? "won"
                        : "lost";
                    break;

                case AuctionStatus.CANCELLED:
                    calculatedBidStatus = "cancelled";
                    break;

                default:
                    calculatedBidStatus = "unknown";
            }

            return {
                auction: {
                    ...auction,
                    status,
                    currentBidPrice:
                        highestBid?.bidPrice ??
                        auction.bidPrice,
                },

                book: {
                    _id: book._id,
                    name: book.name,
                    coverImage: book.coverImage,
                },

                bid: {
                    bidId: bid._id,
                    bidPrice: bid.bidPrice,
                    bidStatus: calculatedBidStatus,
                },
            };
        })
    );

    // Filter by bid status
    const filteredResults = bidStatus
        ? results.filter(
              (item) =>
                  item.bid.bidStatus === bidStatus
          )
        : results;

    // Total after filtering
    const total = filteredResults.length;

    // Pagination
    const paginatedResults = filteredResults.slice(
        skip,
        skip + limitNumber
    );

    return {
        data: paginatedResults,

        pagination: {
            page: pageNumber,
            limit: limitNumber,
            total,
            totalPages: Math.ceil(
                total / limitNumber
            ),
            hasNextPage:
                pageNumber <
                Math.ceil(total / limitNumber),
            hasPreviousPage: pageNumber > 1,
        },
    };
};
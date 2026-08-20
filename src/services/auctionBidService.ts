import mongoose from "mongoose";
import Auction, { AuctionStatus } from "../models/Auction";
import AuctionBid from "../models/AuctionBid";


export const createAuctionBidService = async (data: {
    auctionId: string;
    bookId: string;
    userId: string;
    bidPrice: number;
}) => {
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        const auction = await Auction.findById(
            data.auctionId
        ).session(session);

        if (!auction) {
            throw new Error("Auction not found");
        }

        if (auction.status !== AuctionStatus.LIVE) {
            throw new Error(
                "Bidding is available only for live auctions"
            );
        }

        if (
            auction.bookId.toString() !==
            data.bookId.toString()
        ) {
            throw new Error(
                "Book does not belong to this auction"
            );
        }

        const existingBid = await AuctionBid.findOne({
            auctionId: data.auctionId,
            userId: data.userId,
        }).session(session);

        if (existingBid) {
            throw new Error(
                "You have already placed a bid for this auction. Please update your existing bid."
            );
        }

        const highestBid = await AuctionBid.findOne({
            auctionId: data.auctionId,
        })
            .sort({ bidPrice: -1 })
            .session(session);

        if (!highestBid) {
            if (data.bidPrice <= auction.bidPrice) {
                throw new Error(
                    `Bid price must be greater than the starting bid price of ${auction.bidPrice}`
                );
            }
        }

        if (
            highestBid &&
            data.bidPrice <= highestBid.bidPrice
        ) {
            throw new Error(
                `Bid price must be greater than the current highest bid of ${highestBid.bidPrice}`
            );
        }

        const bid = await AuctionBid.create(
            [
                {
                    auctionId: data.auctionId,
                    bookId: data.bookId,
                    userId: data.userId,
                    bidPrice: data.bidPrice,
                },
            ],
            { session }
        );

        await session.commitTransaction();

        return bid[0];
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        await session.endSession();
    }
};

export const getAllAuctionBidsService = async (
    auctionId: string
) => {
    const auction = await Auction.findById(auctionId);

    if (!auction) {
        throw new Error("Auction not found");
    }

    const bids = await AuctionBid.find({
        auctionId,
    })
        .populate("userId", "firstName lastName")
        .sort({ bidPrice: -1 })
        .lean();

    return {
        auctionId,
        bids: bids.map((bid) => {
            const user = bid.userId as any;

            return {
                _id: bid._id,
                user: {
                    userId: user?._id,
                    name: `${user?.firstName ?? ""} ${
                        user?.lastName ?? ""
                    }`.trim(),
                },
                bidPrice: bid.bidPrice,
            };
        }),
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

        // Check auction status
        if (auction.status !== AuctionStatus.LIVE) {
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
    userId: string
) => {
    const bids = await AuctionBid.find({
        userId,
    })
        .populate("auctionId")
        .populate("bookId")
        .sort({ createdAt: -1 })
        .lean();

    return Promise.all(
        bids.map(async (bid) => {
            const auction = bid.auctionId as any;
            const book = bid.bookId as any;

            const highestBid = await AuctionBid.findOne({
                auctionId: auction._id,
            })
                .sort({ bidPrice: -1 })
                .select("bidPrice")
                .lean();

            return {
                auction: {
                    ...auction,
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
                },
            };
        })
    );
};
import { Request, Response } from "express";
import {
    createAuctionBidService,
    getAllAuctionBidsService,
    getAllUserBidsService,
} from "../services/auctionBidService";
import mongoose from "mongoose";

export const createAuctionBid = async (
    req: Request,
    res: Response
) => {
    try {
        const {
            auctionId,
            bookId,
            bidPrice,
            userId,
        } = req.body;

        if (!auctionId) {
            return res.status(400).json({
                status: "Error",
                message: "Auction ID is required",
            });
        }

        if (!bookId) {
            return res.status(400).json({
                status: "Error",
                message: "Book ID is required",
            });
        }

        if (!userId) {
            return res.status(400).json({
                status: "Error",
                message: "User ID is required",
            });
        }

        if (
            bidPrice === undefined ||
            bidPrice === null ||
            typeof bidPrice !== "number" ||
            bidPrice <= 0
        ) {
            return res.status(400).json({
                status: "Error",
                message: "Bid price must be a valid positive number",
            });
        }

        const bid = await createAuctionBidService({
            auctionId,
            bookId,
            userId,
            bidPrice,
        });

        return res.status(201).json({
            status: "Success",
            message: "Bid placed successfully",
            data: bid,
        });
    } catch (error: any) {
        console.error("Create Auction Bid Error:", error);

        return res.status(400).json({
            status: "Error",
            message: error.message,
        });
    }
};

export const getAllAuctionBids = async (
    req: Request,
    res: Response
) => {
    try {
        const { auctionId } = req.params;

        if (
            typeof auctionId !== "string" ||
            !mongoose.Types.ObjectId.isValid(auctionId)
        ) {
            return res.status(400).json({
                status: "Error",
                message: "Invalid auction ID",
            });
        }

        const bids = await getAllAuctionBidsService(
            auctionId
        );

        return res.status(200).json({
            status: "Success",
            message: "Auction bids fetched successfully",
            data: bids,
        });
    } catch (error: any) {
        console.error(
            "Get All Auction Bids Error:",
            error
        );

        return res.status(400).json({
            status: "Error",
            message: error.message,
        });
    }
};

export const getAllUserBids = async (
    req: Request,
    res: Response
) => {
    try {
        const { userId } = req.params;

        if (
            typeof userId !== "string" ||
            !mongoose.Types.ObjectId.isValid(userId)
        ) {
            return res.status(400).json({
                status: "Error",
                message: "Invalid user ID",
            });
        }

        const bids = await getAllUserBidsService(userId);

        return res.status(200).json({
            status: "Success",
            message: "User bids fetched successfully",
            data: bids,
        });
    } catch (error: any) {
        console.error(
            "Get All User Bids Error:",
            error
        );

        return res.status(400).json({
            status: "Error",
            message: error.message,
        });
    }
};
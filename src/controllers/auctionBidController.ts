import { Request, Response } from "express";
import {
    createAuctionBidService,
    getAllAuctionBidsService,
    getAllUserBidsService,
    updateAuctionBidService,
} from "../services/auctionBidService";
import mongoose from "mongoose";
import { failResponse, successResponse } from "../utils/response";
import { StatusCode } from "../utils/StatusCodes";
import { Messages } from "../utils/constants";

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
            Number.isNaN(bidPrice) ||
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
            message: error.message || "Failed to place bid",
        });
    }
};

export const getAllAuctionBids = async (
    req: Request,
    res: Response
) => {
    try {
        const { auctionId } = req.params;

        const {
            page = "1",
            limit = "10",
        } = req.query;

        if (
            typeof auctionId !== "string" ||
            !mongoose.Types.ObjectId.isValid(auctionId)
        ) {
            return res.status(400).json({
                status: "Error",
                message: "Invalid auction ID",
            });
        }

        const pageNumber = Number(page);
        const limitNumber = Number(limit);

        if (
            !Number.isInteger(pageNumber) ||
            pageNumber < 1
        ) {
            return res.status(400).json({
                status: "Error",
                message: "Invalid page number",
            });
        }

        if (
            !Number.isInteger(limitNumber) ||
            limitNumber < 1
        ) {
            return res.status(400).json({
                status: "Error",
                message: "Invalid limit",
            });
        }

        const result = await getAllAuctionBidsService(
            auctionId,
            pageNumber,
            limitNumber
        );

        return res.status(200).json({
            status: "Success",
            message: "Auction bids fetched successfully",
            data: result,
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

        const {
            page = "1",
            limit = "10",
            status,
        } = req.query;

        if (
            typeof userId !== "string" ||
            !mongoose.Types.ObjectId.isValid(userId)
        ) {
            return res.status(400).json({
                status: "Error",
                message: "Invalid user ID",
            });
        }

        const pageNumber = Number(page);
        const limitNumber = Number(limit);

        if (
            !Number.isInteger(pageNumber) ||
            pageNumber < 1
        ) {
            return res.status(400).json({
                status: "Error",
                message: "Invalid page number",
            });
        }

        if (
            !Number.isInteger(limitNumber) ||
            limitNumber < 1
        ) {
            return res.status(400).json({
                status: "Error",
                message: "Invalid limit",
            });
        }

        const bidStatus =
            typeof status === "string"
                ? status
                : undefined;

        const result =
            await getAllUserBidsService(
                userId,
                pageNumber,
                limitNumber,
                bidStatus
            );

        return res.status(200).json({
            status: "Success",
            message: "User bids fetched successfully",
            data: result.data,
            pagination: result.pagination,
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

export const updateAuctionBid = async (
    req: Request,
    res: Response
) => {
    try {
        const { bidId } = req.params;

        if (typeof bidId !== "string") {
            return failResponse(
                res,
                "Invalid bid ID",
                StatusCode.Bad_Request
            );
        }

        const {
            auctionId,
            userId,
            bidPrice,
        } = req.body;

        if (!auctionId || !userId || bidPrice === undefined) {
            return failResponse(
                res,
                "auctionId, userId and bidPrice are required",
                StatusCode.Bad_Request
            );
        }

        const updatedBid     = await updateAuctionBidService(
            bidId,
            {
                auctionId,
                userId,
                bidPrice: Number(bidPrice),
            }
        );

        return successResponse(
            res,
            updatedBid,
            "Auction bid updated successfully",
            StatusCode.OK
        );
    } catch (err: any) {
        return failResponse(
            res,
            err.message || Messages.Internal_Server_Error,
            StatusCode.Bad_Request
        );
    }
};
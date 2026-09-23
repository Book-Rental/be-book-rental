import { Request, Response } from "express";
import {
    createSellerPayout,
    createTransaction,
    getCustomerSummary,
    getCustomerTransactionDetails,
    getProfitSummary,
    getSellerPayoutDetails,
    getSellerPayouts,
    getTransactionsByOrderId,
} from "../services/transaction.service";

import {
    successResponse,
    failResponse,
    errorResponse,
} from "../utils/response";
import { StatusCode } from "../utils/StatusCodes";
import mongoose from "mongoose";


export const createTransactionController = async (
    req: Request,
    res: Response
) => {
    try {
        const transaction = await createTransaction(req.body);

        return successResponse(
            res,
            transaction,
            "Transaction created successfully",
            StatusCode.Created
        );
    } catch (error: any) {
        console.error(
            "Create transaction error:",
            error
        );

        return errorResponse(
            res,
            error.message ||
            "Failed to create transaction",
            error.statusCode ||
            StatusCode.Internal_Server_Error
        );
    }
};

export const createSellerPayoutController = async (
    req: Request,
    res: Response
) => {
    try {
        const orderItemId =
            req.params.orderItemId as string;

        if (!orderItemId) {
            return failResponse(
                res,
                "Order item ID is required",
                StatusCode.Bad_Request
            );
        }

        const payout =
            await createSellerPayout(orderItemId);

        return successResponse(
            res,
            payout,
            "Seller payout created successfully",
            StatusCode.Created
        );
    } catch (error: any) {
        console.error(
            "Create seller payout error:",
            error
        );

        return errorResponse(
            res,
            error.message ||
            "Failed to create seller payout",
            error.statusCode ||
            StatusCode.Internal_Server_Error
        );
    }
};

export const getTransactionsByOrderIdController = async (
    req: Request,
    res: Response
) => {
    try {
        const orderId =
            req.params.orderId as string;

        if (!orderId) {
            return failResponse(
                res,
                "Order ID is required",
                StatusCode.Bad_Request
            );
        }

        const transactions =
            await getTransactionsByOrderId(orderId);

        return successResponse(
            res,
            transactions,
            "Transactions fetched successfully",
            StatusCode.OK
        );
    } catch (error: any) {
        console.error(
            "Get transactions error:",
            error
        );

        return errorResponse(
            res,
            error.message ||
            "Failed to fetch transactions",
            error.statusCode ||
            StatusCode.Internal_Server_Error
        );
    }
};

export const getProfitSummaryController = async (
    req: Request,
    res: Response
) => {
    try {
        const profitSummary = await getProfitSummary();

        return successResponse(
            res,
            profitSummary,
            "Profit summary fetched successfully",
            StatusCode.OK
        );
    } catch (error: any) {
        console.error("Get profit summary error:", error);

        return errorResponse(
            res,
            error.message || "Failed to fetch profit summary",
            error.statusCode ||
            StatusCode.Internal_Server_Error
        );
    }
};

export const getSellerPayoutsController = async (
    req: Request,
    res: Response
) => {
    try {
        const sellerPayouts = await getSellerPayouts();

        return successResponse(
            res,
            sellerPayouts,
            "Seller payouts fetched successfully",
            StatusCode.OK
        );
    } catch (error: any) {
        console.error(
            "Get seller payouts error:",
            error
        );

        return errorResponse(
            res,
            error.message ||
            "Failed to fetch seller payouts",
            error.statusCode ||
            StatusCode.Internal_Server_Error
        );
    }
};

export const getSellerPayoutDetailsController = async (
    req: Request,
    res: Response
) => {
    try {
        const sellerId = req.params.sellerId as string;

        if (!sellerId) {
            return failResponse(
                res,
                "Seller ID is required",
                StatusCode.Bad_Request
            );
        }

        if (!mongoose.Types.ObjectId.isValid(sellerId)) {
            return failResponse(
                res,
                "Invalid seller ID",
                StatusCode.Bad_Request
            );
        }

        const payoutDetails =
            await getSellerPayoutDetails(sellerId);

        return successResponse(
            res,
            payoutDetails,
            "Seller payout details fetched successfully",
            StatusCode.OK
        );
    } catch (error: any) {
        console.error(
            "Get seller payout details error:",
            error
        );

        return errorResponse(
            res,
            error.message ||
            "Failed to fetch seller payout details",
            error.statusCode ||
            StatusCode.Internal_Server_Error
        );
    }
};

export const getCustomerSummaryController = async (
    req: Request,
    res: Response
) => {
    try {
        const customerSummary =
            await getCustomerSummary();

        return successResponse(
            res,
            customerSummary,
            "Customer summary fetched successfully",
            StatusCode.OK
        );
    } catch (error: any) {
        console.error(
            "Get customer summary error:",
            error
        );

        return errorResponse(
            res,
            error.message ||
            "Failed to fetch customer summary",
            error.statusCode ||
            StatusCode.Internal_Server_Error
        );
    }
};

export const getCustomerTransactionDetailsController =
    async (
        req: Request,
        res: Response
    ) => {
        try {
            const customerId =
                req.params.customerId as string;

            if (!customerId) {
                return failResponse(
                    res,
                    "Customer ID is required",
                    StatusCode.Bad_Request
                );
            }

            if (
                !mongoose.Types.ObjectId.isValid(
                    customerId
                )
            ) {
                return failResponse(
                    res,
                    "Invalid customer ID",
                    StatusCode.Bad_Request
                );
            }

            const customerTransactions =
                await getCustomerTransactionDetails(
                    customerId
                );

            return successResponse(
                res,
                customerTransactions,
                "Customer transaction details fetched successfully",
                StatusCode.OK
            );
        } catch (error: any) {
            console.error(
                "Get customer transaction details error:",
                error
            );

            return errorResponse(
                res,
                error.message ||
                "Failed to fetch customer transaction details",
                error.statusCode ||
                StatusCode.Internal_Server_Error
            );
        }
    };
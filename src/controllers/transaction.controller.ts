import { Request, Response } from "express";
import {
    createSellerPayout,
    createTransaction,
    getTransactionsByOrderId,
} from "../services/transaction.service";

import {
    successResponse,
    failResponse,
    errorResponse,
} from "../utils/response";
import { StatusCode } from "../utils/StatusCodes";


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
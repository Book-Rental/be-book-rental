import { Request, Response } from "express";
import { processRefund } from "../services/refund.service";
import {
    successResponse,
    failResponse,
    errorResponse,
} from "../utils/response";
import { StatusCode } from "../utils/StatusCodes";


export const refundController = async (
    req: Request,
    res: Response
) => {
    try {
        const { orderItemId } = req.params as {
            orderItemId: string;
        };

        const { condition } = req.body;

        if (!condition) {
            return failResponse(
                res,
                "Inspection condition is required",
                StatusCode.Bad_Request
            );
        }

        const result = await processRefund(
            orderItemId,
            condition
        );

        return successResponse(
            res,
            result,
            "Deposit refunded successfully",
            StatusCode.OK
        );
    } catch (error: any) {
        console.error("Refund error:", error);

        return errorResponse(
            res,
            error.message || "Refund failed",
            error.statusCode || StatusCode.Internal_Server_Error
        );
    }
};
import mongoose from "mongoose";
import {
    createOrderService,
    deleteOrderByIdService,
    getAllOrdersService,
    getOrderBookDetailsService,
    getOrderByOrderIdService,
    getOrderByUserIdService,
    getSellerOrdersService,
} from "../services/orderService";
import { Messages } from "../utils/constants";
import { failResponse, successResponse } from "../utils/response";
import { StatusCode } from "../utils/StatusCodes";
import { Request, Response } from "express";
import { OrderType } from "../models/Order";

//get all orders
export const getAllOrders = async (req: Request, res: Response): Promise<void> => {
    try {
        const orders = await getAllOrdersService(req.query as any);
        successResponse(res, orders, Messages.Order_Fetch_success, StatusCode.OK);
    } catch (error) {
        console.error("Get All Orders Error:", error);
        failResponse(res, Messages.Internal_Server_Error, StatusCode.Internal_Server_Error);
    }
};

//get order by id
export const getOrderById = async (req: Request, res: Response): Promise<void> => {
    try {
        const orderId = (req.params as { orderId?: string }).orderId;
        if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
            failResponse(res, Messages.OrderID_Is_Invalid, StatusCode.Not_Found);
            return;
        }
        const order = await getOrderByOrderIdService(orderId);
        successResponse(res, order, Messages.Order_Fetch_success, StatusCode.OK);
    } catch (error) {
        console.error("Get All Orders Error:", error);
        failResponse(res, Messages.Internal_Server_Error, StatusCode.Internal_Server_Error);
    }
};

//create Order
export const createOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        const orderData = req.body;

        const {
            userId,
            items,
            deliveryAddress,
            paymentMethod,
            subtotal,
            securityDepositTotal,
            deliveryFee,
            tax,
            discount,
            total,
        } = orderData;

        // ================= User Validation =================
        if (!userId) {
            failResponse(res, "User Id is required.", StatusCode.Bad_Request);
            return;
        }

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            failResponse(res, "Invalid User Id.", StatusCode.Bad_Request);
            return;
        }

        // ================= Items Validation =================
        if (!Array.isArray(items) || items.length === 0) {
            failResponse(res, "At least one book is required.", StatusCode.Bad_Request);
            return;
        }

        for (const item of items) {
            if (!item.bookId) {
                failResponse(res, "Book Id is required.", StatusCode.Bad_Request);
                return;
            }

            if (!mongoose.Types.ObjectId.isValid(item.bookId)) {
                failResponse(res, "Invalid Book Id.", StatusCode.Bad_Request);
                return;
            }

            if (!["buy", "rent"].includes(item.orderType)) {
                failResponse(res, "Invalid Order Type.", StatusCode.Bad_Request);
                return;
            }

            if (!item.quantity || item.quantity <= 0) {
                failResponse(res, "Quantity should be greater than zero.", StatusCode.Bad_Request);
                return;
            }

            // if (item.orderType === "rent") {
            //     if (!item.rentalDuration) {
            //         failResponse(res, "Rental Duration is required.", StatusCode.Bad_Request);
            //         return;
            //     }

            //     if (!item.rentStartDate || !item.expectedReturnDate) {
            //         failResponse(res, "Rent dates are required.", StatusCode.Bad_Request);
            //         return;
            //     }
            // }
        }

        // ================= Address Validation =================
        if (!deliveryAddress) {
            failResponse(res, "Delivery address is required.", StatusCode.Bad_Request);
            return;
        }

        // ================= Payment Validation =================
        const paymentMethods = ["COD", "UPI", "CARD", "NET_BANKING"];

        if (!paymentMethods.includes(paymentMethod)) {
            failResponse(res, "Invalid Payment Method.", StatusCode.Bad_Request);
            return;
        }

        // ================= Amount Validation =================
        if (subtotal < 0 || total <= 0) {
            failResponse(res, "Invalid order amount.", StatusCode.Bad_Request);
            return;
        }

        const order = await createOrderService(orderData);

        successResponse(res, order, Messages.OrderCreated, StatusCode.Created);
    } catch (error: any) {
        console.error(error);

        failResponse(
            res,
            error.message || Messages.Internal_Server_Error,
            StatusCode.Internal_Server_Error
        );
    }
};
//Get Order By User Id
export const getOrderByUserId = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.params as { userId?: string };
        if (!userId) {
            failResponse(res, "User Id is required.", StatusCode.Bad_Request);
            return;
        }

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            failResponse(res, "Invalid User Id.", StatusCode.Bad_Request);
            return;
        }

        const orders = await getOrderByUserIdService(userId, req.query);
        successResponse(res, orders, Messages.Order_Fetch_success, StatusCode.OK);
    } catch (error: any) {
        failResponse(
            res,
            error.message || Messages.Internal_Server_Error,
            StatusCode.Internal_Server_Error
        );
    }
};

//Delete Order
export const deleteOrderById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { orderId } = req.params as { orderId?: string };
        if (!orderId) {
            failResponse(res, "Order Id is required.", StatusCode.Bad_Request);
            return;
        }

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            failResponse(res, "Invalid Order Id.", StatusCode.Bad_Request);
            return;
        }
        const order = await deleteOrderByIdService(orderId);
        if (!order) {
            failResponse(res, Messages.Order_Not_Found, StatusCode.Bad_Request);
        }
        successResponse(res, null, Messages.Order_Deleted, StatusCode.No_Content);
    } catch (error: any) {
        failResponse(
            res,
            error.message || Messages.Internal_Server_Error,
            StatusCode.Internal_Server_Error
        );
    }
};

export const getOrderBookDetails = async (req: Request, res: Response): Promise<void> => {
    try {
        const { orderId, bookId } = req.params as { orderId: string; bookId: string };

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            failResponse(res, "Invalid Order Id", StatusCode.Bad_Request);
            return;
        }

        if (!mongoose.Types.ObjectId.isValid(bookId)) {
            failResponse(res, "Invalid Book Id", StatusCode.Bad_Request);
            return;
        }

        const orderItem = await getOrderBookDetailsService(orderId, bookId);

        successResponse(res, orderItem, "Order book details fetched successfully", StatusCode.OK);
    } catch (error: any) {
        failResponse(
            res,
            error.message || "Internal Server Error",
            StatusCode.Internal_Server_Error
        );
    }
};

// Seller dashboard orders: returns only orders/items for the authenticated seller.
export const getSellerOrders = async (req: Request, res: Response): Promise<void> => {
    try {
        const authUser: any = (req as any).user;
        const sellerUserId: string | undefined = authUser?.id || authUser?._id || authUser?.userId;

        if (!sellerUserId) {
            failResponse(res, "Unauthorized", StatusCode.Unauthorized);
            return;
        }

        if (!mongoose.Types.ObjectId.isValid(sellerUserId)) {
            failResponse(res, "Invalid User Id.", StatusCode.Bad_Request);
            return;
        }

        const orders = await getSellerOrdersService(sellerUserId, req.query);
        successResponse(res, orders, Messages.Order_Fetch_success, StatusCode.OK);
    } catch (error: any) {
        failResponse(
            res,
            error.message || Messages.Internal_Server_Error,
            StatusCode.Internal_Server_Error
        );
    }
};


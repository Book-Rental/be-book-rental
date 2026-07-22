import mongoose from "mongoose";
import {
    createOrderService,
    deleteOrderByIdService,
    getAllOrdersService,
    getOrderBookDetailsService,
    getOrderByOrderIdService,
    getOrderByUserIdService,
    getSellerAllOrdersService,
    getSellerDashboardService,
    getSellerOrderItemDetailService,
    getSellerRecentOrdersService,
    updateSellerOrderItemStatusService,
} from "../services/orderService";
import { Messages } from "../utils/constants";
import { failResponse, successResponse } from "../utils/response";
import { StatusCode } from "../utils/StatusCodes";
import { Request, Response } from "express";

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
        const { userId, items, shippingAddress, billingAddress, payment, amount } = req.body;

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

            if (!item.quantity || item.quantity <= 0) {
                failResponse(res, "Quantity should be greater than zero.", StatusCode.Bad_Request);
                return;
            }

            if (!item.rentalType) {
                failResponse(res, "Rental Type is required.", StatusCode.Bad_Request);
                return;
            }

            if (!["day", "week", "month"].includes(item.rentalType)) {
                failResponse(
                    res,
                    "Rental Type should be day, week or month.",
                    StatusCode.Bad_Request
                );
                return;
            }
        }

        // ================= Shipping Address =================

        if (!shippingAddress) {
            failResponse(res, "Shipping Address is required.", StatusCode.Bad_Request);
            return;
        }

        // ================= Billing Address =================

        if (!billingAddress) {
            failResponse(res, "Billing Address is required.", StatusCode.Bad_Request);
            return;
        }

        // ================= Payment Validation =================

        if (!payment) {
            failResponse(res, "Payment details are required.", StatusCode.Bad_Request);
            return;
        }

        const paymentMethods = ["COD", "UPI", "CARD", "NET_BANKING"];

        if (!payment.paymentMethod) {
            failResponse(res, "Payment Method is required.", StatusCode.Bad_Request);
            return;
        }

        if (!paymentMethods.includes(payment.paymentMethod)) {
            failResponse(res, "Invalid Payment Method.", StatusCode.Bad_Request);
            return;
        }

        if (!payment.transactionId) {
            failResponse(res, "Transaction Id is required.", StatusCode.Bad_Request);
            return;
        }

        // ================= Amount Validation =================

        if (!amount) {
            failResponse(res, "Amount details are required.", StatusCode.Bad_Request);
            return;
        }

        if (amount.totalAmount <= 0) {
            failResponse(res, "Invalid Total Amount.", StatusCode.Bad_Request);
            return;
        }

        // ================= Create Order =================

        const order = await createOrderService(req.body);

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

// Seller dashboard: returns aggregate statistics for the authenticated seller.
export const getSellerDashboard = async (req: Request, res: Response): Promise<void> => {
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

        const dashboard = await getSellerDashboardService(sellerUserId);
        successResponse(res, dashboard, Messages.Seller_Dashboard_Fetched, StatusCode.OK);
    } catch (error: any) {
        failResponse(
            res,
            error.message || Messages.Internal_Server_Error,
            StatusCode.Internal_Server_Error
        );
    }
};

// Seller orders (item-level with buyer name + status filter, paginated)
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

        const orders = await getSellerAllOrdersService(sellerUserId, req.query);
        successResponse(res, orders, Messages.Seller_All_Orders_Fetched, StatusCode.OK);
    } catch (error: any) {
        failResponse(
            res,
            error.message || Messages.Internal_Server_Error,
            StatusCode.Internal_Server_Error
        );
    }
};

// Seller recent orders (item-level, default limit 5)
export const getSellerRecentOrders = async (req: Request, res: Response): Promise<void> => {
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

        const orders = await getSellerRecentOrdersService(sellerUserId, req.query);
        successResponse(res, orders, Messages.Seller_Recent_Orders_Fetched, StatusCode.OK);
    } catch (error: any) {
        failResponse(
            res,
            error.message || Messages.Internal_Server_Error,
            StatusCode.Internal_Server_Error
        );
    }
};

// Seller approve/reject order item
export const updateSellerOrderItemStatus = async (req: Request, res: Response): Promise<void> => {
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

        const { orderItemId } = req.params as { orderItemId: string };
        if (!orderItemId || !mongoose.Types.ObjectId.isValid(orderItemId)) {
            failResponse(res, "Invalid Order Item Id.", StatusCode.Bad_Request);
            return;
        }

        const { action } = req.body;
        if (!action || !["approve", "reject"].includes(action)) {
            failResponse(res, Messages.Invalid_Action_Approve_Reject, StatusCode.Bad_Request);
            return;
        }

        const result = await updateSellerOrderItemStatusService(sellerUserId, orderItemId, action);
        
        const message = action === "approve" 
            ? Messages.Seller_Order_Item_Approved 
            : Messages.Seller_Order_Item_Rejected;
        
        successResponse(res, result, message, StatusCode.OK);
    } catch (error: any) {
        failResponse(
            res,
            error.message || Messages.Seller_Order_Item_Status_Update_Failed,
            StatusCode.Bad_Request
        );
    }
};

// Seller order item detail (full info for a specific order item)
export const getSellerOrderItemDetail = async (req: Request, res: Response): Promise<void> => {
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

        const { orderItemId } = req.params as { orderItemId: string };
        if (!orderItemId || !mongoose.Types.ObjectId.isValid(orderItemId)) {
            failResponse(res, "Invalid Order Item Id.", StatusCode.Bad_Request);
            return;
        }

        const detail = await getSellerOrderItemDetailService(sellerUserId, orderItemId);
        successResponse(res, detail, Messages.Seller_Order_Item_Fetched, StatusCode.OK);
    } catch (error: any) {
        failResponse(
            res,
            error.message || Messages.Internal_Server_Error,
            StatusCode.Internal_Server_Error
        );
    }
};

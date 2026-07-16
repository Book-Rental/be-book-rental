import mongoose from "mongoose";
import {
    createOrderService,
    getAllOrdersService,
    getOrderByOrderIdService,
} from "../services/orderService";
import { Messages } from "../utils/constants";
import { failResponse, successResponse } from "../utils/response";
import { StatusCode } from "../utils/StatusCodes";
import { Request, Response } from "express";
import { OrderType } from "../models/Order";

//get all orders
export const getAllOrders = async (req: Request, res: Response): Promise<void> => {
    try {
        const orders = await getAllOrdersService();
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
        const {
            customerId,
            items,
            deliveryAddress,
            paymentMethod,
            discount,
            deliveryCharge,
            tax,
            createdBy,
        } = req.body;

        // ===========================
        // Customer Validation
        // ===========================
        if (!customerId) {
            failResponse(res, "Customer Id is required.", StatusCode.Bad_Request);
            return;
        }

        if (!mongoose.Types.ObjectId.isValid(customerId)) {
            failResponse(res, "Invalid Customer Id.", StatusCode.Bad_Request);
            return;
        }

        // ===========================
        // Items Validation
        // ===========================
        if (!items || !Array.isArray(items) || items.length === 0) {
            failResponse(res, "At least one book is required.", StatusCode.Bad_Request);
            return;
        }

        for (const item of items) {
            if (!item.bookId) {
                failResponse(res, "Book Id is required.", StatusCode.Bad_Request);
                return;
            }

            if (!mongoose.Types.ObjectId.isValid(item.bookId)) {
                failResponse(res, `Invalid Book Id : ${item.bookId}`, StatusCode.Bad_Request);
                return;
            }

            if (!item.orderType) {
                failResponse(res, "Order Type is required.", StatusCode.Bad_Request);
                return;
            }

            if (item.orderType !== OrderType.BUY && item.orderType !== OrderType.RENT) {
                failResponse(res, "Invalid Order Type.", StatusCode.Bad_Request);
                return;
            }

            if (!item.quantity || item.quantity < 1) {
                failResponse(res, "Quantity should be greater than zero.", StatusCode.Bad_Request);
                return;
            }

            if (item.orderType === OrderType.RENT) {
                if (!item.rentalDuration) {
                    failResponse(res, "Rental duration is required.", StatusCode.Bad_Request);
                    return;
                }

                if (!item.rentStartDate) {
                    failResponse(res, "Rent Start Date is required.", StatusCode.Bad_Request);
                    return;
                }

                if (!item.expectedReturnDate) {
                    failResponse(res, "Expected Return Date is required.", StatusCode.Bad_Request);
                    return;
                }

                const rentDate = new Date(item.rentStartDate);
                const returnDate = new Date(item.expectedReturnDate);

                if (returnDate <= rentDate) {
                    failResponse(
                        res,
                        "Expected Return Date should be greater than Rent Start Date.",
                        StatusCode.Bad_Request
                    );
                    return;
                }
            }
        }

        // ===========================
        // Address Validation
        // ===========================
        if (!deliveryAddress) {
            failResponse(res, "Delivery address is required.", StatusCode.Bad_Request);
            return;
        }

        const { street, city, state, zipCode, country, phone } = deliveryAddress;

        if (!street || !city || !state || !zipCode || !country || !phone) {
            failResponse(res, "Complete delivery address is required.", StatusCode.Bad_Request);
            return;
        }

        // ===========================
        // Payment Validation
        // ===========================
        if (!paymentMethod) {
            failResponse(res, "Payment Method is required.", StatusCode.Bad_Request);
            return;
        }

        const paymentMethods = ["COD", "UPI", "CARD", "NET_BANKING"];

        if (!paymentMethods.includes(paymentMethod)) {
            failResponse(res, "Invalid Payment Method.", StatusCode.Bad_Request);
            return;
        }

        // ===========================
        // Create Order
        // ===========================
        const order = await createOrderService({
            customerId,
            items,
            deliveryAddress,
            paymentMethod,
            discount: discount || 0,
            deliveryCharge: deliveryCharge || 0,
            tax: tax || 0,
            createdBy,
        } as any);

        successResponse(res, order, Messages.OrderCreated, StatusCode.Created);
    } catch (error: any) {
        console.error("Create Order Error:", error);

        failResponse(
            res,
            error.message || Messages.Internal_Server_Error,
            StatusCode.Internal_Server_Error
        );
    }
};

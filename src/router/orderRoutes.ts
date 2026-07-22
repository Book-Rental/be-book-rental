import { Router } from "express";
import {
    createOrder,
    deleteOrderById,
    getAllOrders,
    getOrderBookDetails,
    getOrderById,
    getOrderByUserId,
    getSellerDashboard,
    getSellerOrderItemDetail,
    getSellerOrders,
    getSellerRecentOrders,
    updateSellerOrderItemStatus,
} from "../controllers/orderController";
import { auth } from "../middlewares/authMiddleware";

const route = Router();

route.get("/", getAllOrders);
route.get("/:orderId", getOrderById);
route.get("/getByUserId/:userId", getOrderByUserId);
route.get("/:orderId/book/:bookId", getOrderBookDetails);
route.post("/craete", createOrder);
route.delete("/:orderId", deleteOrderById);
route.get("/seller/dashboard", auth as any, getSellerDashboard);
route.get("/seller/orders", auth as any, getSellerOrders);
route.get("/seller/recent-orders", auth as any, getSellerRecentOrders);
route.get("/seller/order-item/:orderItemId", auth as any, getSellerOrderItemDetail);
route.patch("/seller/order-item/:orderItemId/status", auth as any, updateSellerOrderItemStatus);

export default route;

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

route.get("/",auth as any, getAllOrders);
route.get("/:orderId", auth as any,getOrderById);
route.get("/getByUserId/:userId",auth as any, getOrderByUserId);
route.get("/:orderId/book/:bookId",auth as any, getOrderBookDetails);
route.post("/craete", auth as any,createOrder);
route.delete("/:orderId",auth as any, deleteOrderById);
route.get("/seller/dashboard", auth as any, getSellerDashboard);
route.get("/seller/orders", auth as any, getSellerOrders);
route.get("/seller/recent-orders", auth as any, getSellerRecentOrders);
route.get("/seller/order-item/:orderItemId", auth as any, getSellerOrderItemDetail);
route.patch("/seller/order-item/:orderItemId/status", auth as any, updateSellerOrderItemStatus);

export default route;

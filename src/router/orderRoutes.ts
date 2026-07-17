import { Router } from "express";
import {
    createOrder,
    deleteOrderById,
    getAllOrders,
    getOrderBookDetails,
    getOrderById,
    getOrderByUserId,
    getSellerOrders,
} from "../controllers/orderController";
import { auth } from "../middlewares/authMiddleware";

const route = Router();

route.get("/", getAllOrders);
route.get("/:orderId", getOrderById);
route.get("/getByUserId/:userId", getOrderByUserId);
route.get("/:orderId/book/:bookId", getOrderBookDetails);
route.post("/craete", createOrder);
route.delete("/:orderId", deleteOrderById);
route.get("/seller/orders", auth as any, getSellerOrders);

export default route;

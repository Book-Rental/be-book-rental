import { Router } from "express";
import {
    createOrder,
    deleteOrderById,
    getAllOrders,
    getOrderById,
    getOrderByUserId,
} from "../controllers/orderController";

const route = Router();

route.get("/", getAllOrders);
route.get("/:orderId", getOrderById);
route.get("/getByUserId/:userId", getOrderByUserId);
route.post("/craete", createOrder);
route.delete("/:orderId", deleteOrderById);

export default route;

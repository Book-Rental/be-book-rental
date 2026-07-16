import { Router } from "express";
import { createOrder, getAllOrders, getOrderById } from "../controllers/orderController";

const route = Router();

route.get("/", getAllOrders);
route.get("/:orderId", getOrderById);
route.post("/craete", createOrder);

export default route;

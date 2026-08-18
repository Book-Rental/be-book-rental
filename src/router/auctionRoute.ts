import { Router } from "express";
import { auth } from "../middlewares/authMiddleware";
import { createAuction } from "../controllers/bookController";

const route = Router();

route.post("/create-auction",auth as any, createAuction);

export default route;
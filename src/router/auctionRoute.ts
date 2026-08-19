import { Router } from "express";
import { auth } from "../middlewares/authMiddleware";
import { createAuction, updateAuctionBook } from "../controllers/bookController";

const route = Router();

route.post("/create-auction",auth as any, createAuction);
route.put("/update-auction/:auctionId",auth as any,updateAuctionBook)
export default route;
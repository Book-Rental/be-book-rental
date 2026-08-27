import { Router } from "express";
import { auth } from "../middlewares/authMiddleware";
import { createAuction, getBookAuctionBidDetails, updateAuctionBook } from "../controllers/bookController";
import { createAuctionBid, getAllAuctionBids, getAllUserBids, updateAuctionBid } from "../controllers/auctionBidController";

const route = Router();

route.post("/create-auction",auth as any, createAuction);
route.put("/update-auction/:auctionId",auth as any,updateAuctionBook)
route.post("/place-a-bid", auth as any, createAuctionBid)
route.get( "/:auctionId/bids", auth as any, getAllAuctionBids)
route.get("/user/:userId/bids",auth as any, getAllUserBids);
route.get("/:bookId/auction/bid/:userId",auth as any, getBookAuctionBidDetails)
route.put('/auction-bids/:bidId', updateAuctionBid)
export default route;
import { Router } from "express";
import { auth } from "../middlewares/authMiddleware";
import { cancelAuction, createAuction, getBookAuctionBidDetails, updateAuctionBook } from "../controllers/bookController";
import { createAuctionBid, getAllAuctionBids, getAllUserBids, updateAuctionBid } from "../controllers/auctionBidController";

const route = Router();

route.post("/create-auction", createAuction);
route.put("/update-auction/:auctionId",auth as any,updateAuctionBook)
route.post("/place-a-bid", createAuctionBid)
route.get( "/:auctionId/bids", getAllAuctionBids)
route.get("/user/:userId/bids", getAllUserBids);
route.get("/:bookId/auction/bid/:userId", getBookAuctionBidDetails)
route.put('/auction-bids/:bidId', updateAuctionBid)
route.patch(
    "/:auctionId/cancel",
    cancelAuction
);
export default route;
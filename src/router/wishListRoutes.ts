import { Router } from "express";
import { addItemToWishlist, createWishlistGroup, getUserWishlistNames, getUserWishlists, removeBookFromWishlist } from "../controllers/wishListController";

const router = Router();

router.get("/:userId", getUserWishlists);
router.get("/wishlistName/:userId", getUserWishlistNames);
router.post("/group", createWishlistGroup);
router.post("/add", addItemToWishlist);
router.delete("/delete/:id", removeBookFromWishlist);


export default router;

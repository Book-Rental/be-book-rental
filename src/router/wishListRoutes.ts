import { Router } from "express";
import {
    addItemToWishlist,
    createWishlistGroup,
    getUserWishlistNames,
    getUserWishlists,
    getUserWishlistsWithBooks,
    removeBookFromWishlist,
} from "../controllers/wishListController";

const router = Router();

router.get("/:userId", getUserWishlists);
router.get("/getAllWishList/:userId", getUserWishlistsWithBooks);
router.get("/wishlistName/:userId", getUserWishlistNames);
router.post("/group", createWishlistGroup);
router.post("/add", addItemToWishlist);
router.delete("/delete/:id", removeBookFromWishlist);

export default router;

import { Router } from "express";
import {
    addItemToWishlist,
    createWishlistGroup,
    getUserWishlistNames,
    getUserWishlists,
    getUserWishlistsWithBooks,
    removeBookFromWishlist,
} from "../controllers/wishListController";
import { auth } from "../middlewares/authMiddleware";

const router = Router();

router.get("/:userId",auth as any, getUserWishlists);
router.get("/getAllWishList/:userId",auth as any, getUserWishlistsWithBooks);
router.get("/wishlistName/:userId",auth as any, getUserWishlistNames);
router.post("/group", auth as any,createWishlistGroup);
router.post("/add",auth as any, addItemToWishlist);
router.delete("/delete/:id",auth as any, removeBookFromWishlist);


export default router;

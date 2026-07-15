import { Router } from "express";
import { auth } from "../middlewares/authMiddleware";
import {
    addItemToCart,
    clearCart,
    getCart,
    patchCartItemQuantity,
    removeItemFromCart,
    validateCart,
} from "../controllers/cartController";

const router = Router();

router.get("/", auth as any, getCart);
router.post("/items", auth as any, addItemToCart);
router.delete("/items/:bookId", auth as any, removeItemFromCart);
router.patch("/items/:bookId", auth as any, patchCartItemQuantity);
router.delete("/clear", auth as any, clearCart);
router.post("/validate", auth as any, validateCart);

export default router;

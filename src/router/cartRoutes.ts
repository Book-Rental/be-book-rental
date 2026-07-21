import { Router } from "express";
import { resolveCartIdentity } from "../middlewares/resolveCartIdentity";
import {
    addItemToCart,
    clearCart,
    getCart,
    patchCartItemQuantity,
    patchCartItemRentalPeriod,
    removeItemFromCart,
    validateCart,
} from "../controllers/cartController";

const router = Router();

router.get("/", resolveCartIdentity as any, getCart);
router.post("/items", resolveCartIdentity as any, addItemToCart);
router.delete("/items/:bookId", resolveCartIdentity as any, removeItemFromCart);
router.patch("/items/:bookId", resolveCartIdentity as any, patchCartItemQuantity);
router.patch("/items/:bookId/rental-period", resolveCartIdentity as any, patchCartItemRentalPeriod);
router.delete("/clear", resolveCartIdentity as any, clearCart);
router.post("/validate", resolveCartIdentity as any, validateCart);

export default router;

import { Router } from "express";
import {
    createBook,
    deleteBookById,
    getAllBooks,
    getBookById,
    getBooksBySellerId,
    updateBookById,
} from "../controllers/bookController";
import upload from "../utils/upload";
import { auth } from "../middlewares/authMiddleware";

const router = Router();
const cpUpload = upload.fields([
    { name: "coverImage", maxCount: 1 },
    { name: "images", maxCount: 5 },
]);

router.get("/", getAllBooks);
router.post("/create",auth as any, cpUpload ,createBook);
router.get("/:id", getBookById);
router.get("/seller/:sellerId",auth as any, getBooksBySellerId);
router.delete("/:id",auth as any, deleteBookById);
router.put("/update/:id",auth as any, cpUpload, updateBookById);

export default router;

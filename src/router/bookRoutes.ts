import { Router } from "express";
import {
    createBook,
    deleteBookById,
    getAllBooks,
    getBookById,
    updateBookById,
} from "../controllers/bookController";
import upload from "../utils/upload";

const router = Router();
const cpUpload = upload.fields([
    { name: "coverImage", maxCount: 1 },
    { name: "images", maxCount: 5 },
]);

router.get("/", getAllBooks);
router.post("/create", cpUpload, createBook);
router.get("/:id", getBookById);
router.delete("/:id", deleteBookById);
router.put("/update/:id", cpUpload, updateBookById);

export default router;

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
/**
 * @swagger
 * /api/book:
 *   get:
 *     summary: Get all books
 *     description: Retrieve books with optional filters
 *     tags:
 *       - Books
 *     operationId: getAllBooks
 *     parameters:
 *       - name: name
 *         in: query
 *         required: false
 *         description: Search books by book name or author
 *         schema:
 *           type: string
 *
 *       - name: language
 *         in: query
 *         required: false
 *         description: Filter books by language
 *         schema:
 *           type: string
 *
 *       - name: search
 *         in: query
 *         required: false
 *         description: Search by book name, author, or category
 *         schema:
 *           type: string
 *
 *       - name: categoryID
 *         in: query
 *         required: false
 *         description: Filter books by category ID
 *         schema:
 *           type: string
 *
 *       - name: categoryName
 *         in: query
 *         required: false
 *         description: Filter books by category name
 *         schema:
 *           type: string
 *
 *       - name: minPrice
 *         in: query
 *         required: false
 *         description: Minimum purchase price
 *         schema:
 *           type: number
 *
 *       - name: maxPrice
 *         in: query
 *         required: false
 *         description: Maximum purchase price
 *         schema:
 *           type: number
 *
 *       - name: isPopular
 *         in: query
 *         required: false
 *         schema:
 *           type: boolean
 *
 *       - name: availableForSale
 *         in: query
 *         required: false
 *         schema:
 *           type: boolean
 *
 *       - name: availableForRent
 *         in: query
 *         required: false
 *         schema:
 *           type: boolean
 *
 *       - name: isAuction
 *         in: query
 *         required: false
 *         schema:
 *           type: boolean
 *
 *       - name: sortBy
 *         in: query
 *         required: false
 *         description: Sorting option
 *         schema:
 *           type: string
 *           enum:
 *             - priceLowToHigh
 *             - priceHighToLow
 *             - nameAToZ
 *             - nameZToA
 *             - latest
 *             - oldest
 *             - popular
 *
 *       - name: page
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *
 *       - name: limit
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           default: 12
 *
 *     responses:
 *       200:
 *         description: Successfully retrieved books
 *       500:
 *         description: Internal server error
 */
router.get("/", getAllBooks);


/**
 * @swagger
 * /api/book/create:
 *   post:
 *     summary: Create a new book
 *     description: Create a new book
 *     tags:
 *       - Books
 *     operationId: createBook
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               author:
 *                 type: string
 *               price:
 *                 type: number
 *               coverImage:
 *                 type: string
 *                 format: binary
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Book created successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
router.post(
    "/create",
    auth as any,
    cpUpload,
    createBook
);


/**
 * @swagger
 * /api/book/{id}:
 *   get:
 *     summary: Get book by ID
 *     description: Retrieve a single book using its ID
 *     tags:
 *       - Books
 *     operationId: getBookById
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Book ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Book retrieved successfully
 *       404:
 *         description: Book not found
 *       500:
 *         description: Internal server error
 */
router.get("/:id", getBookById);


/**
 * @swagger
 * /api/book/seller/{sellerId}:
 *   get:
 *     summary: Get books by seller ID
 *     description: Retrieve all books belonging to a seller
 *     tags:
 *       - Books
 *     operationId: getBooksBySellerId
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: sellerId
 *         in: path
 *         required: true
 *         description: Seller ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Books retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Seller not found
 */
router.get(
    "/seller/:sellerId",
    auth as any,
    getBooksBySellerId
);


/**
 * @swagger
 * /api/book/{id}:
 *   delete:
 *     summary: Delete book by ID
 *     description: Delete a book using its ID
 *     tags:
 *       - Books
 *     operationId: deleteBookById
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Book ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Book deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Book not found
 */
router.delete(
    "/:id",
    auth as any,
    deleteBookById
);


/**
 * @swagger
 * /api/book/update/{id}:
 *   put:
 *     summary: Update book by ID
 *     description: Update an existing book
 *     tags:
 *       - Books
 *     operationId: updateBookById
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Book ID
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               author:
 *                 type: string
 *               price:
 *                 type: number
 *               coverImage:
 *                 type: string
 *                 format: binary
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Book updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Book not found
 */
router.put(
    "/update/:id",
    auth as any,
    cpUpload,
    updateBookById
);

export default router;
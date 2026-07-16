import Book from "../models/Book";
import { buildBookAggregationPipeline, buildFilter } from "../utils/bookFilters";
import { Messages } from "../utils/constants";
import { errorResponse, failResponse, successResponse } from "../utils/response";
import { StatusCode } from "../utils/StatusCodes";
import { Request, Response } from "express";
import { uploadToCloudinary } from "../utils/UploadImage";
import {
    createBookService,
    deleteBookByIdService,
    getBookByIdService,
    getBooksBySellerIdService,
    updateBookByIdService,
} from "../services/bookService";

export const getAllBooks = async (req: Request, res: Response) => {
    try {
        const { sortBy, page = 1, limit = 12, ...filterQuery } = req.query;

        const pipeline = await buildBookAggregationPipeline(
            filterQuery,
            sortBy as string,
            Number(page),
            Number(limit)
        );

        const products = await Book.aggregate(pipeline);
        const totalCount = await Book.countDocuments(await buildFilter(filterQuery));
        const hasMore = (Number(page) - 1) * Number(limit) + products.length < totalCount;

        successResponse(res, {
            products,
            totalCount,
            hasMore,
            currentPage: Number(page),
            totalPages: Math.ceil(totalCount / Number(limit)),
        });
    } catch (error) {
        errorResponse(res, "Error fetching products by filters");
    }
};

export const createBook = async (req: Request, res: Response) => {
    try {
        const body = req.body;
        const files = req.files as { [key: string]: Express.Multer.File[] };

        let coverImageUrl: string | undefined = undefined;

        if (files?.coverImage?.[0]) {
            const coverFile = files.coverImage[0];
            coverImageUrl = await uploadToCloudinary(
                coverFile.buffer,
                "BookImages",
                coverFile.originalname
            );
        }

        let alternativeImages: Array<{ url: string; altText: string }> = [];

        if (files?.images && files.images.length > 0) {
            const uploadPromises = files.images.map(async (file) => {
                const secureUrl = await uploadToCloudinary(
                    file.buffer,
                    "BookImages",
                    file.originalname
                );

                const fallbackAltText =
                    file.originalname.split(".").slice(0, -1).join(".") || "Book Image";

                return {
                    url: secureUrl,
                    altText: fallbackAltText,
                };
            });

            alternativeImages = await Promise.all(uploadPromises);
        }

        const authenticatedUserId = (req as any).user?.id;

        const bookPayload = {
            ...body,
            coverImage: coverImageUrl,
            images: alternativeImages,
            sellerId: body.sellerId || authenticatedUserId,
            createdBy: authenticatedUserId,
        };

        const savedBook = await createBookService(bookPayload);

        return successResponse(
            res,
            savedBook,
            Messages.Book_Created_Successfully,
            StatusCode.Created
        );
    } catch (err: any) {
        console.error("Create Book Controller Error:", err);
        return failResponse(
            res,
            err.message || Messages.Internal_Server_Error,
            StatusCode.Bad_Request
        );
    }
};

export const deleteBookById = async (req: Request, res: Response) => {
    try {
        const bookId = req.params.id as string;
        const deleteBook = await deleteBookByIdService(bookId);

        if (!deleteBook) {
            return failResponse(res, Messages.Book_Not_Found, StatusCode.Not_Found);
        }

        return successResponse(res, deleteBook, Messages.Book_Deleted_Successfully, StatusCode.OK);
    } catch (err: any) {
        console.error("Delete Book Controller Error:", err);
        return failResponse(
            res,
            err.message || Messages.Internal_Server_Error,
            StatusCode.Bad_Request
        );
    }
};

export const getBookById = async (req: Request, res: Response) => {
    try {
        const bookId = req.params.id as string;
        const book = await getBookByIdService(bookId);

        if (!book) {
            return failResponse(res, Messages.Book_Not_Found, StatusCode.Not_Found);
        }

        return successResponse(res, book, Messages.Book_Found_Successfully, StatusCode.OK);
    } catch (err: any) {
        return failResponse(
            res,
            err.message || Messages.Internal_Server_Error,
            StatusCode.Bad_Request
        );
    }
};

export const getBooksBySellerId = async (req: Request, res: Response) => {
    try {
        const sellerId = req.params.sellerId as string;
        const books = await getBooksBySellerIdService(sellerId);

        return successResponse(res, { books }, "Books fetched successfully", StatusCode.OK);
    } catch (err: any) {
        return failResponse(
            res,
            err.message || Messages.Internal_Server_Error,
            StatusCode.Bad_Request
        );
    }
};

export const updateBookById = async (req: Request, res: Response) => {
    try {
        const bookId = req.params.id as string;
        const existingBook = await getBookByIdService(bookId);
        if (!existingBook) {
            return failResponse(res, Messages.Book_Is_Not_Found, StatusCode.Not_Found);
        }

        const updateData: any = { ...req.body };
        const files = req.files as { [key: string]: Express.Multer.File[] } | undefined;

        if (files?.coverImage?.[0]) {
            const coverFile = files.coverImage[0];
            updateData.coverImage = await uploadToCloudinary(
                coverFile.buffer,
                "BookImages",
                coverFile.originalname
            );
        }

        if (files?.images && files.images.length > 0) {
            const uploadPromises = files.images.map(async (file) => {
                const secureUrl = await uploadToCloudinary(
                    file.buffer,
                    "BookImages",
                    file.originalname
                );
                const fallbackAltText =
                    file.originalname.split(".").slice(0, -1).join(".") || "Book Image";
                return { url: secureUrl, altText: fallbackAltText };
            });

            const newUploadedImages = await Promise.all(uploadPromises);

            const currentImages = existingBook.images || [];
            updateData.images = [...currentImages, ...newUploadedImages];
        }

        if (updateData.availableForSale)
            updateData.availableForSale = updateData.availableForSale === "true";
        if (updateData.availableForRent)
            updateData.availableForRent = updateData.availableForRent === "true";
        if (updateData.isPopular) updateData.isPopular = updateData.isPopular === "true";
        if (updateData.purchasePrice)
            updateData.purchasePrice = parseFloat(updateData.purchasePrice);
        if (updateData.rentalPricePerDay)
            updateData.rentalPricePerDay = parseFloat(updateData.rentalPricePerDay);

        const authenticatedUserId = (req as any).user?.id;
        updateData.updatedBy = authenticatedUserId;
        updateData.updatedAt = new Date();
        const updatedBook = await updateBookByIdService(bookId, updateData);

        return successResponse(
            res,
            updatedBook,
            "Book listing updated successfully",
            StatusCode.OK
        );
    } catch (err: any) {
        console.error("Update Book Controller Error:", err);
        return failResponse(
            res,
            err.message || Messages.Internal_Server_Error,
            StatusCode.Bad_Request
        );
    }
};

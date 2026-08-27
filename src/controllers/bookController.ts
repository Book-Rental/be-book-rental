import Book from "../models/Book";
import { buildBookAggregationPipeline, buildBookCountAggregationPipeline, buildFilter } from "../utils/bookFilters";
import { Messages } from "../utils/constants";
import { errorResponse, failResponse, successResponse } from "../utils/response";
import { StatusCode } from "../utils/StatusCodes";
import { Request, Response } from "express";
import { uploadToCloudinary } from "../utils/UploadImage";
import {
    createAuctionBookService,
    createBookService,
    deleteBookByIdService,
    getBookAuctionBidDetailsService,
    getBookByIdService,
    getBooksBySellerIdService,
    updateAuctionBookService,
    updateBookByIdService,
} from "../services/bookService";
import mongoose from "mongoose";

export const getAllBooks = async (
    req: Request,
    res: Response
) => {
    try {
        const {
            sortBy,
            page = 1,
            limit = 12,
            ...filterQuery
        } = req.query;

        const pageNumber = Number(page);
        const limitNumber = Number(limit);

        // Product pipeline
        const pipeline =
            await buildBookAggregationPipeline(
                filterQuery,
                sortBy as string,
                pageNumber,
                limitNumber
            );

        const products = await Book.aggregate(pipeline);

        // Count pipeline
        const countPipeline =
            await buildBookCountAggregationPipeline(
                filterQuery
            );

        const countResult =
            await Book.aggregate(countPipeline);

        const totalCount =
            countResult[0]?.totalCount || 0;

        const totalPages = Math.ceil(
            totalCount / limitNumber
        );

        const hasMore =
            pageNumber < totalPages;

        return successResponse(res, {
            products,
            totalCount,
            hasMore,
            currentPage: pageNumber,
            totalPages,
        });

    } catch (error) {
        console.error(error);

        return errorResponse(
            res,
            "Error fetching products by filters"
        );
    }
};
export const createBook = async (req: Request, res: Response) => {
    try {
        const body = req.body;
        const files = req.files as { [key: string]: Express.Multer.File[] };

        let coverImageUrl: string | undefined = undefined;

        // 1. Process Single Cover Image in controller
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

                // Extract clean file name without extension to use as altText
                const fallbackAltText =
                    file.originalname.split(".").slice(0, -1).join(".") || "Book Image";

                return {
                    url: secureUrl,
                    altText: fallbackAltText, // Satisfies Mongoose schema required: true rule
                };
            });

            // Resolve all uploads concurrently
            alternativeImages = await Promise.all(uploadPromises);
        }

        // 3. Assemble clean payload for service layer
        const authenticatedUserId = (req as any).user?.id;
        const bookPayload = {
            ...body,
            coverImage: coverImageUrl,
            images: alternativeImages, // Now successfully satisfies your subdocument constraint!
            sellerId: body.sellerId || authenticatedUserId,
            createdBy: authenticatedUserId,
            isAuction: body.isAuction ?? false,
        };

        // 4. Delegate database insertion to service layer
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
        failResponse(res, err.message || Messages.Internal_Server_Error, StatusCode.Bad_Request);
    }
};

export const getBooksBySellerId = async (req: Request, res: Response) => {
    try {
        const sellerId = req.params.sellerId as string;
        const books = await getBooksBySellerIdService(sellerId, req.query);

        return successResponse(res, { books }, Messages.Book_Fetched_Successfully, StatusCode.OK);
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

        // 1. Verify target book exists
        const existingBook = await getBookByIdService(bookId);
        if (!existingBook) {
            return failResponse(res, Messages.Book_Is_Not_Found, StatusCode.Not_Found);
        }

        const updateData = { ...req.body };
        const files = req.files as { [key: string]: Express.Multer.File[] } | undefined;

        // 2. Handle Optional Single Cover Image Replacement
        if (files?.coverImage?.[0]) {
            const coverFile = files.coverImage[0];
            updateData.coverImage = await uploadToCloudinary(
                coverFile.buffer,
                "BookImages",
                coverFile.originalname
            );
        }

        // 3. Handle Optional Multi Gallery Images Addition
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

            // Append new image items to the existing subdocument collection
            const currentImages = existingBook.images || [];
            updateData.images = [...currentImages, ...newUploadedImages];
        }

        // 4. Sanitize explicit data types from multipart string inputs
        if (updateData.availableForSale)
            updateData.availableForSale = updateData.availableForSale === "true";
        if (updateData.availableForRent)
            updateData.availableForRent = updateData.availableForRent === "true";
        if (updateData.isPopular) updateData.isPopular = updateData.isPopular === "true";
        if (updateData.purchasePrice)
            updateData.purchasePrice = parseFloat(updateData.purchasePrice);
        if (updateData.rentalPricePerDay)
            updateData.rentalPricePerDay = parseFloat(updateData.rentalPricePerDay);

        // Track who initialized this content change
        const authenticatedUserId = (req as any).user?.id;
        updateData.updatedBy = authenticatedUserId;
        updateData.updatedAt = new Date();

        // 5. Submit update operation to service layer
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

export const createAuction = async (req: Request, res: Response) => {
    try {
        const auction = await createAuctionBookService(req.body);
        return successResponse(
            res,
            auction,
            "Book auction created successfully",
            StatusCode.Created
        );
    } catch (err: unknown) {
        console.error("Auction Book Controller Error:", err);
        if (err instanceof Error) {
            return failResponse(
                res,
                err.message,
                StatusCode.Bad_Request
            );
        }
        return failResponse(
            res,
            Messages.Internal_Server_Error,
            StatusCode.Internal_Server_Error
        );
    }
};

export const updateAuctionBook = async (
  req: Request,
  res: Response
) => {
  try {
    const { auctionId } = req.params;
 if (
      typeof auctionId !== "string" ||
      !mongoose.Types.ObjectId.isValid(auctionId)
    ) {
      return res.status(400).json({
        status: "Error",
        message: "Invalid auction ID",
      });
    }
    const updatedAuction =
      await updateAuctionBookService(
        auctionId,
        req.body
      );

    return res.status(200).json({
      status: "Success",
      message: "Auction updated successfully",
      data: updatedAuction,
    });
  } catch (error: any) {
    return res.status(400).json({
      status: "Error",
      message: error.message,
    });
  }
};

export const getBookAuctionBidDetails = async (
  req: Request,
  res: Response
) => {
  try {
    const { bookId, userId } = req.params;

    if (
      typeof bookId !== "string" ||
      typeof userId !== "string"
    ) {
      return failResponse(
        res,
        "Invalid book ID or user ID",
        StatusCode.Bad_Request
      );
    }

    const data =
      await getBookAuctionBidDetailsService(
        bookId,
        userId
      );

    if (!data) {
      return failResponse(
        res,
        Messages.Book_Not_Found,
        StatusCode.Not_Found
      );
    }

    return successResponse(
      res,
      data,
      "Auction bid details fetched successfully",
      StatusCode.OK
    );
  } catch (err: any) {
    return failResponse(
      res,
      err.message || Messages.Internal_Server_Error,
      StatusCode.Bad_Request
    );
  }
};
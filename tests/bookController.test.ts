import { beforeEach, describe, expect, it, vi } from "vitest";

import { Messages } from "../src/utils/constants";
import { StatusCode } from "../src/utils/StatusCodes";

// ----------------------
// Mock Book Model
// ----------------------
vi.mock("../src/models/Book", () => ({
    default: {
        aggregate: vi.fn(),
        countDocuments: vi.fn(),
    },
}));

// ----------------------
// Mock Filters
// ----------------------
vi.mock("../src/utils/bookFilters", () => ({
    buildBookAggregationPipeline: vi.fn(),
    buildFilter: vi.fn(),
}));

// ----------------------
// Mock Upload Utility
// ----------------------
vi.mock("../src/utils/UploadImage", () => ({
    uploadToCloudinary: vi.fn(),
}));

// ----------------------
// Mock Book Services
// ----------------------
vi.mock("../src/services/bookService", () => ({
    createBookService: vi.fn(),
    deleteBookByIdService: vi.fn(),
    getBookByIdService: vi.fn(),
    updateBookByIdService: vi.fn(),
}));
vi.mock("../src/utils/UploadImage", () => ({
    uploadToCloudinary: vi.fn(),
}));

vi.mock("../src/services/bookService", () => ({
    createBookService: vi.fn(),
    deleteBookByIdService: vi.fn(),
    getBookByIdService: vi.fn(),
    updateBookByIdService: vi.fn(),
}));
import Book from "../src/models/Book";

import {
    buildBookAggregationPipeline,
    buildFilter,
} from "../src/utils/bookFilters";

import {
    createBook,
    deleteBookById,
    getAllBooks,
    getBookById,
    updateBookById,
} from "../src/controllers/bookController";
import { uploadToCloudinary } from "../src/utils/UploadImage";
import { createBookService, deleteBookByIdService, getBookByIdService, updateBookByIdService } from "../src/services/bookService";

// Helper to create a mocked response object
function mockResponse() {
    const res: any = {};
    res.status = vi.fn().mockReturnThis();
    res.json = vi.fn().mockReturnThis();
    return res;
}

describe("Book Controller - Part 1", () => {
    let req: any;
    let res: any;

    beforeEach(() => {
        vi.clearAllMocks();

        req = {
            query: {},
            body: {},
            params: {},
            files: {},
            user: {
                id: "user123",
            },
        };

        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        };
    });

    describe("getAllBooks()", () => {
        it("should return books successfully", async () => {
            req.query = {
                page: "1",
                limit: "2",
                sortBy: "price",
                language: "English",
            };

            (buildBookAggregationPipeline as any).mockResolvedValue([
                { $match: {} },
            ]);

            (buildFilter as any).mockResolvedValue({});

            (Book.aggregate as any).mockResolvedValue([
                {
                    _id: "book1",
                    name: "Atomic Habits",
                },
                {
                    _id: "book2",
                    name: "Clean Code",
                },
            ]);

            (Book.countDocuments as any).mockResolvedValue(2);

            await getAllBooks(req, res);

            expect(buildBookAggregationPipeline).toHaveBeenCalledWith(
                {
                    language: "English",
                },
                "price",
                1,
                2
            );

            expect(buildFilter).toHaveBeenCalledWith({
                language: "English",
            });

            expect(Book.aggregate).toHaveBeenCalled();

            expect(Book.countDocuments).toHaveBeenCalledWith({});

            expect(res.status).toHaveBeenCalledWith(200);

            expect(res.json).toHaveBeenCalledWith({
                status: Messages.Success,
                message: Messages.Success,
                data: {
                    products: [
                        {
                            _id: "book1",
                            name: "Atomic Habits",
                        },
                        {
                            _id: "book2",
                            name: "Clean Code",
                        },
                    ],
                    totalCount: 2,
                    hasMore: false,
                    currentPage: 1,
                    totalPages: 1,
                },
            });
        });

        it("should return error when aggregate throws", async () => {
            req.query = {};

            (buildBookAggregationPipeline as any).mockRejectedValue(
                new Error("DB Error")
            );

            await getAllBooks(req, res);

            expect(res.status).toHaveBeenCalledWith(
                StatusCode.Internal_Server_Error
            );

            expect(res.json).toHaveBeenCalledWith({
                status: Messages.Internal_Server_Error,
                message: "Error fetching products by filters",
                error: null,
            });
        });
    });

    describe("createBook()", () => {
        beforeEach(() => {
            vi.clearAllMocks();
        });

        it("should create book successfully", async () => {
            const req: any = {
                body: {
                    name: "Atomic Habits",
                    sellerId: "seller1",
                },
                files: {
                    coverImage: [
                        {
                            buffer: Buffer.from("cover"),
                            originalname: "cover.png",
                        },
                    ],
                    images: [],
                },
                user: {
                    id: "user123",
                },
            };

            const res: any = mockResponse();

            (uploadToCloudinary as any).mockResolvedValue(
                "https://cloudinary.com/cover.png"
            );

            (createBookService as any).mockResolvedValue({
                _id: "book123",
                name: "Atomic Habits",
            });

            await createBook(req, res);

            expect(uploadToCloudinary).toHaveBeenCalledTimes(1);

            expect(createBookService).toHaveBeenCalledWith({
                ...req.body,
                coverImage: "https://cloudinary.com/cover.png",
                images: [],
                sellerId: "seller1",
                createdBy: "user123",
            });

            expect(res.status).toHaveBeenCalledWith(201);


        });

        it("should upload gallery images", async () => {
            const req: any = {
                body: {
                    name: "Book",
                },
                files: {
                    images: [
                        {
                            buffer: Buffer.from("1"),
                            originalname: "one.png",
                        },
                        {
                            buffer: Buffer.from("2"),
                            originalname: "two.png",
                        },
                    ],
                },
                user: {
                    id: "user123",
                },
            };

            const res: any = mockResponse();

            (uploadToCloudinary as any)
                .mockResolvedValueOnce("url1")
                .mockResolvedValueOnce("url2");

            (createBookService as any).mockResolvedValue({
                _id: "1",
            });

            await createBook(req, res);

            expect(uploadToCloudinary).toHaveBeenCalledTimes(2);

            expect(createBookService).toHaveBeenCalledWith({
                ...req.body,
                coverImage: undefined,
                sellerId: "user123",
                createdBy: "user123",
                images: [
                    {
                        url: "url1",
                        altText: "one",
                    },
                    {
                        url: "url2",
                        altText: "two",
                    },
                ],
            });

            expect(res.status).toHaveBeenCalledWith(201);
        });
        it("should upload cover image and gallery images", async () => {
            const req: any = {
                body: {
                    name: "Book",
                },
                files: {
                    coverImage: [
                        {
                            buffer: Buffer.from("cover"),
                            originalname: "cover.png",
                        },
                    ],
                    images: [
                        {
                            buffer: Buffer.from("img"),
                            originalname: "page1.png",
                        },
                    ],
                },
                user: {
                    id: "user123",
                },
            };

            const res: any = mockResponse();

            (uploadToCloudinary as any)
                .mockResolvedValueOnce("cover-url")
                .mockResolvedValueOnce("gallery-url");

            (createBookService as any).mockResolvedValue({});

            await createBook(req, res);

            expect(uploadToCloudinary).toHaveBeenCalledTimes(2);

            expect(createBookService).toHaveBeenCalledWith({
                ...req.body,
                coverImage: "cover-url",
                sellerId: "user123",
                createdBy: "user123",
                images: [
                    {
                        url: "gallery-url",
                        altText: "page1",
                    },
                ],
            });

            expect(res.status).toHaveBeenCalledWith(201);
        });
        it("should use authenticated user as sellerId", async () => {
            const req: any = {
                body: {
                    name: "Book",
                },
                files: {},
                user: {
                    id: "logged-user",
                },
            };

            const res: any = mockResponse();

            (createBookService as any).mockResolvedValue({});

            await createBook(req, res);

            expect(createBookService).toHaveBeenCalledWith({
                ...req.body,
                coverImage: undefined,
                images: [],
                sellerId: "logged-user",
                createdBy: "logged-user",
            });
        });

        it("should return bad request when service throws", async () => {
            const req: any = {
                body: {},
                files: {},
                user: {
                    id: "1",
                },
            };

            const res: any = mockResponse();

            (createBookService as any).mockRejectedValue(
                new Error("Create Failed")
            );

            await createBook(req, res);

            expect(res.status).toHaveBeenCalledWith(400);

            expect(res.json).toHaveBeenCalled();
        });
    });

    describe("getBookById()", () => {
        beforeEach(() => {
            vi.clearAllMocks();
        });

        it("should return book successfully", async () => {
            const req: any = {
                params: {
                    id: "book123",
                },
            };

            const res: any = mockResponse();

            (getBookByIdService as any).mockResolvedValue({
                _id: "book123",
                name: "Atomic Habits",
                author: "James Clear",
            });

            await getBookById(req, res);

            expect(getBookByIdService).toHaveBeenCalledWith("book123");

            expect(res.status).toHaveBeenCalledWith(200);

            expect(res.json).toHaveBeenCalledWith({
                status: Messages.Success,
                message: Messages.Book_Found_Successfully,
                data: {
                    _id: "book123",
                    name: "Atomic Habits",
                    author: "James Clear",
                },
            });
        });

        it("should return not found when book does not exist", async () => {
            const req: any = {
                params: {
                    id: "book123",
                },
            };

            const res: any = mockResponse();

            (getBookByIdService as any).mockResolvedValue(null);

            await getBookById(req, res);

            expect(getBookByIdService).toHaveBeenCalledWith("book123");

            expect(res.status).toHaveBeenCalledWith(404);

            expect(res.json).toHaveBeenCalledWith({
                status: Messages.Fail,
                message: Messages.Book_Not_Found,
            });
        });

        it("should return bad request when service throws", async () => {
            const req: any = {
                params: {
                    id: "book123",
                },
            };

            const res: any = mockResponse();

            (getBookByIdService as any).mockRejectedValue(
                new Error("Database Error")
            );

            await getBookById(req, res);

            expect(getBookByIdService).toHaveBeenCalledWith("book123");

            expect(res.status).toHaveBeenCalledWith(400);

            expect(res.json).toHaveBeenCalledWith({
                status: Messages.Fail,
                message: "Database Error",
            });
        });
    });

    describe("deleteBookById()", () => {
        beforeEach(() => {
            vi.clearAllMocks();
        });

        it("should delete book successfully", async () => {
            const req: any = {
                params: {
                    id: "book123",
                },
            };

            const res: any = mockResponse();

            (deleteBookByIdService as any).mockResolvedValue({
                _id: "book123",
                name: "Atomic Habits",
            });

            await deleteBookById(req, res);

            expect(deleteBookByIdService).toHaveBeenCalledWith("book123");

            expect(res.status).toHaveBeenCalledWith(200);

            expect(res.json).toHaveBeenCalledWith({
                status: Messages.Success,
                message: Messages.Book_Deleted_Successfully,
                data: {
                    _id: "book123",
                    name: "Atomic Habits",
                },
            });
        });

        it("should return not found when book does not exist", async () => {
            const req: any = {
                params: {
                    id: "book123",
                },
            };

            const res: any = mockResponse();

            (deleteBookByIdService as any).mockResolvedValue(null);

            await deleteBookById(req, res);

            expect(deleteBookByIdService).toHaveBeenCalledWith("book123");

            expect(res.status).toHaveBeenCalledWith(404);

            expect(res.json).toHaveBeenCalledWith({
                status: Messages.Fail,
                message: Messages.Book_Not_Found,
            });
        });

        it("should return bad request when delete service throws", async () => {
            const req: any = {
                params: {
                    id: "book123",
                },
            };

            const res: any = mockResponse();

            (deleteBookByIdService as any).mockRejectedValue(
                new Error("Delete Failed")
            );

            await deleteBookById(req, res);

            expect(deleteBookByIdService).toHaveBeenCalledWith("book123");

            expect(res.status).toHaveBeenCalledWith(400);

            expect(res.json).toHaveBeenCalledWith({
                status: Messages.Fail,
                message: "Delete Failed",
            });
        });
    });

    describe("updateBookById()", () => {
        beforeEach(() => {
            vi.clearAllMocks();
        });

        it("should return not found when book does not exist", async () => {
            const req: any = {
                params: {
                    id: "book123",
                },
                body: {},
                files: {},
                user: {
                    id: "user123",
                },
            };

            const res: any = mockResponse();

            (getBookByIdService as any).mockResolvedValue(null);

            await updateBookById(req, res);

            expect(getBookByIdService).toHaveBeenCalledWith("book123");

            expect(updateBookByIdService).not.toHaveBeenCalled();

            expect(uploadToCloudinary).not.toHaveBeenCalled();

            expect(res.status).toHaveBeenCalledWith(404);

            expect(res.json).toHaveBeenCalledWith({
                status: Messages.Fail,
                message: Messages.Book_Is_Not_Found,
            });
        });

        it("should update book successfully without images", async () => {
            const req: any = {
                params: {
                    id: "book123",
                },
                body: {
                    name: "Updated Book",
                    purchasePrice: "500",
                    rentalPricePerDay: "20",
                    availableForSale: "true",
                    availableForRent: "false",
                    isPopular: "true",
                },
                files: {},
                user: {
                    id: "user123",
                },
            };

            const res: any = mockResponse();

            const existingBook = {
                _id: "book123",
                name: "Old Book",
                images: [],
            };

            const updatedBook = {
                _id: "book123",
                name: "Updated Book",
            };

            (getBookByIdService as any).mockResolvedValue(existingBook);

            (updateBookByIdService as any).mockResolvedValue(updatedBook);

            await updateBookById(req, res);

            expect(getBookByIdService).toHaveBeenCalledWith("book123");

            expect(uploadToCloudinary).not.toHaveBeenCalled();

            expect(updateBookByIdService).toHaveBeenCalledWith(
                "book123",
                expect.objectContaining({
                    name: "Updated Book",
                    purchasePrice: 500,
                    rentalPricePerDay: 20,
                    availableForSale: true,
                    availableForRent: false,
                    isPopular: true,
                    updatedBy: "user123",
                    updatedAt: expect.any(Date),
                })
            );

            expect(res.status).toHaveBeenCalledWith(200);

            expect(res.json).toHaveBeenCalledWith({
                status: Messages.Success,
                message: "Book listing updated successfully",
                data: updatedBook,
            });
        });

        it("should update book with a new cover image", async () => {
            const req: any = {
                params: {
                    id: "book123",
                },
                body: {
                    name: "Updated Book",
                },
                files: {
                    coverImage: [
                        {
                            buffer: Buffer.from("cover-image"),
                            originalname: "cover.png",
                        },
                    ],
                },
                user: {
                    id: "user123",
                },
            };

            const res: any = mockResponse();

            const existingBook = {
                _id: "book123",
                name: "Old Book",
                images: [],
            };

            const updatedBook = {
                _id: "book123",
                name: "Updated Book",
                coverImage: "https://cloudinary.com/cover.png",
            };

            (getBookByIdService as any).mockResolvedValue(existingBook);

            (uploadToCloudinary as any).mockResolvedValue(
                "https://cloudinary.com/cover.png"
            );

            (updateBookByIdService as any).mockResolvedValue(updatedBook);

            await updateBookById(req, res);

            expect(getBookByIdService).toHaveBeenCalledWith("book123");

            expect(uploadToCloudinary).toHaveBeenCalledTimes(1);

            expect(uploadToCloudinary).toHaveBeenCalledWith(
                Buffer.from("cover-image"),
                "BookImages",
                "cover.png"
            );

            expect(updateBookByIdService).toHaveBeenCalledWith(
                "book123",
                expect.objectContaining({
                    name: "Updated Book",
                    coverImage: "https://cloudinary.com/cover.png",
                    updatedBy: "user123",
                    updatedAt: expect.any(Date),
                })
            );

            expect(res.status).toHaveBeenCalledWith(200);

            expect(res.json).toHaveBeenCalledWith({
                status: Messages.Success,
                message: "Book listing updated successfully",
                data: updatedBook,
            });
        });

        it("should upload gallery images and append them to existing images", async () => {
            const req: any = {
                params: {
                    id: "book123",
                },
                body: {
                    name: "Updated Book",
                },
                files: {
                    images: [
                        {
                            buffer: Buffer.from("image1"),
                            originalname: "page1.png",
                        },
                        {
                            buffer: Buffer.from("image2"),
                            originalname: "page2.jpg",
                        },
                    ],
                },
                user: {
                    id: "user123",
                },
            };

            const res: any = mockResponse();

            const existingBook = {
                _id: "book123",
                name: "Old Book",
                images: [
                    {
                        url: "existing-url",
                        altText: "Existing Image",
                    },
                ],
            };

            (getBookByIdService as any).mockResolvedValue(existingBook);

            (uploadToCloudinary as any)
                .mockResolvedValueOnce("cloudinary-url-1")
                .mockResolvedValueOnce("cloudinary-url-2");

            (updateBookByIdService as any).mockResolvedValue({
                _id: "book123",
                name: "Updated Book",
            });

            await updateBookById(req, res);

            expect(uploadToCloudinary).toHaveBeenCalledTimes(2);

            expect(uploadToCloudinary).toHaveBeenNthCalledWith(
                1,
                Buffer.from("image1"),
                "BookImages",
                "page1.png"
            );

            expect(uploadToCloudinary).toHaveBeenNthCalledWith(
                2,
                Buffer.from("image2"),
                "BookImages",
                "page2.jpg"
            );

            expect(updateBookByIdService).toHaveBeenCalledWith(
                "book123",
                expect.objectContaining({
                    images: [
                        {
                            url: "existing-url",
                            altText: "Existing Image",
                        },
                        {
                            url: "cloudinary-url-1",
                            altText: "page1",
                        },
                        {
                            url: "cloudinary-url-2",
                            altText: "page2",
                        },
                    ],
                    updatedBy: "user123",
                    updatedAt: expect.any(Date),
                })
            );

            expect(res.status).toHaveBeenCalledWith(200);

            expect(res.json).toHaveBeenCalledWith({
                status: Messages.Success,
                message: "Book listing updated successfully",
                data: {
                    _id: "book123",
                    name: "Updated Book",
                },
            });
        });

        it("should return bad request when cover image upload fails", async () => {
            const req: any = {
                params: {
                    id: "book123",
                },
                body: {
                    name: "Updated Book",
                },
                files: {
                    coverImage: [
                        {
                            buffer: Buffer.from("cover"),
                            originalname: "cover.png",
                        },
                    ],
                },
                user: {
                    id: "user123",
                },
            };

            const res: any = mockResponse();

            (getBookByIdService as any).mockResolvedValue({
                _id: "book123",
                images: [],
            });

            (uploadToCloudinary as any).mockRejectedValue(
                new Error("Cloudinary Error")
            );

            await updateBookById(req, res);

            expect(uploadToCloudinary).toHaveBeenCalled();

            expect(updateBookByIdService).not.toHaveBeenCalled();

            expect(res.status).toHaveBeenCalledWith(400);

            expect(res.json).toHaveBeenCalledWith({
                status: Messages.Fail,
                message: "Cloudinary Error",
            });
        });

        it("should return bad request when update service throws", async () => {
            const req: any = {
                params: {
                    id: "book123",
                },
                body: {
                    name: "Updated Book",
                },
                files: {},
                user: {
                    id: "user123",
                },
            };

            const res: any = mockResponse();

            (getBookByIdService as any).mockResolvedValue({
                _id: "book123",
                images: [],
            });

            (updateBookByIdService as any).mockRejectedValue(
                new Error("Update Failed")
            );

            await updateBookById(req, res);

            expect(updateBookByIdService).toHaveBeenCalled();

            expect(res.status).toHaveBeenCalledWith(400);

            expect(res.json).toHaveBeenCalledWith({
                status: Messages.Fail,
                message: "Update Failed",
            });
        });

        it("should return internal server error when error has no message", async () => {
            const req: any = {
                params: {
                    id: "book123",
                },
                body: {},
                files: {},
                user: {
                    id: "user123",
                },
            };

            const res: any = mockResponse();

            (getBookByIdService as any).mockResolvedValue({
                _id: "book123",
                images: [],
            });

            (updateBookByIdService as any).mockRejectedValue({});

            await updateBookById(req, res);

            expect(res.status).toHaveBeenCalledWith(400);

            expect(res.json).toHaveBeenCalledWith({
                status: Messages.Fail,
                message: Messages.Internal_Server_Error,
            });
        });
    });
});
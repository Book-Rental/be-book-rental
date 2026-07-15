import { beforeEach, describe, expect, it, vi } from "vitest";
import { Request, Response } from "express";

import * as categoryService from "../src/services/categoryService";
import * as responseUtils from "../src/utils/response";

import {
    createCategory,
    deleteAllCategories,
    deleteCategory,
    getAllCategories,
    getCategoryById,
    updateCategory,
} from "../src/controllers/categoryController";

import { Messages } from "../src/utils/constants";
import { StatusCode } from "../src/utils/StatusCodes";

vi.mock("../src/services/categoryService", () => ({
    createCategoryService: vi.fn(),
    getAllCategoriesService: vi.fn(),
    getCategoryByIdService: vi.fn(),
    updateCategoryService: vi.fn(),
    deleteCategoryService: vi.fn(),
    deleteAllCategoriesService: vi.fn(),
}));

vi.mock("../src/utils/response", () => ({
    successResponse: vi.fn(),
    failResponse: vi.fn(),
}));

describe("Category Controller - Part 1", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;

    beforeEach(() => {
        vi.clearAllMocks();

        req = {
            body: {},
            params: {},
            query: {},
        };

        res = {};
    });

    describe("createCategory()", () => {
        it("should create category successfully", async () => {
            const category = {
                _id: "1",
                name: "Novel",
            };

            req.body = category;

            vi.spyOn(categoryService, "createCategoryService")
                .mockResolvedValue(category as any);

            await createCategory(req as Request, res as Response);

            expect(categoryService.createCategoryService)
                .toHaveBeenCalledWith(category);

            expect(responseUtils.successResponse)
                .toHaveBeenCalledWith(
                    res,
                    category,
                    Messages.Category_Created,
                    StatusCode.Created
                );
        });

        it("should handle createCategory exception", async () => {
            vi.spyOn(categoryService, "createCategoryService")
                .mockRejectedValue(new Error("Create Error"));

            await createCategory(req as Request, res as Response);

            expect(responseUtils.failResponse)
                .toHaveBeenCalledWith(
                    res,
                    "Create Error",
                    StatusCode.Bad_Request
                );
        });
    });

    describe("getAllCategories()", () => {
        it("should fetch all categories", async () => {
            const categories = [
                {
                    _id: "1",
                    name: "Novel",
                },
            ];

            req.query = {};

            vi.spyOn(categoryService, "getAllCategoriesService")
                .mockResolvedValue(categories as any);

            await getAllCategories(req as Request, res as Response);

            expect(categoryService.getAllCategoriesService)
                .toHaveBeenCalledWith(undefined);

            expect(responseUtils.successResponse)
                .toHaveBeenCalledWith(
                    res,
                    categories,
                    Messages.Categories_Fetched,
                    StatusCode.OK
                );
        });

        it("should fetch only popular categories", async () => {
            req.query = {
                isPopular: "true",
            };

            vi.spyOn(categoryService, "getAllCategoriesService")
                .mockResolvedValue([]);

            await getAllCategories(req as Request, res as Response);

            expect(categoryService.getAllCategoriesService)
                .toHaveBeenCalledWith("true");

            expect(responseUtils.successResponse)
                .toHaveBeenCalled();
        });

        it("should handle getAllCategories exception", async () => {
            vi.spyOn(categoryService, "getAllCategoriesService")
                .mockRejectedValue(new Error("Fetch Error"));

            await getAllCategories(req as Request, res as Response);

            expect(responseUtils.failResponse)
                .toHaveBeenCalledWith(
                    res,
                    "Fetch Error",
                    StatusCode.Bad_Request
                );
        });
    });

    describe("getCategoryById()", () => {
        beforeEach(() => {
            vi.clearAllMocks();

            req = {
                params: {},
            };

            res = {};
        });

        it("should return category successfully", async () => {
            const category = {
                _id: "1",
                name: "Novel",
            };

            req.params = {
                id: "1",
            };

            vi.spyOn(categoryService, "getCategoryByIdService")
                .mockResolvedValue(category as any);

            await getCategoryById(req as Request, res as Response);

            expect(categoryService.getCategoryByIdService)
                .toHaveBeenCalledWith("1");

            expect(responseUtils.successResponse)
                .toHaveBeenCalledWith(
                    res,
                    category,
                    Messages.Category_Fetched,
                    StatusCode.OK
                );
        });

        it("should return Category Not Found when service returns null", async () => {
            req.params = {
                id: "100",
            };

            vi.spyOn(categoryService, "getCategoryByIdService")
                .mockResolvedValue(null);

            await getCategoryById(req as Request, res as Response);

            expect(responseUtils.failResponse)
                .toHaveBeenCalledWith(
                    res,
                    Messages.Category_Not_Found,
                    StatusCode.Not_Found
                );

            expect(responseUtils.successResponse)
                .not.toHaveBeenCalled();
        });

        it("should return Category Not Found when service returns undefined", async () => {
            req.params = {
                id: "100",
            };

            vi.spyOn(categoryService, "getCategoryByIdService")
                .mockResolvedValue(undefined as any);

            await getCategoryById(req as Request, res as Response);

            expect(responseUtils.failResponse)
                .toHaveBeenCalledWith(
                    res,
                    Messages.Category_Not_Found,
                    StatusCode.Not_Found
                );
        });

        it("should handle service exception", async () => {
            req.params = {
                id: "1",
            };

            vi.spyOn(categoryService, "getCategoryByIdService")
                .mockRejectedValue(new Error("Database Error"));

            await getCategoryById(req as Request, res as Response);

            expect(responseUtils.failResponse)
                .toHaveBeenCalledWith(
                    res,
                    "Database Error",
                    StatusCode.Bad_Request
                );
        });

        it("should handle unknown error object", async () => {
            req.params = {
                id: "1",
            };

            vi.spyOn(categoryService, "getCategoryByIdService")
                .mockRejectedValue("Unknown Error");

            await getCategoryById(req as Request, res as Response);

            expect(responseUtils.failResponse)
                .toHaveBeenCalledWith(
                    res,
                    "Unknown Error",
                    StatusCode.Bad_Request
                );
        });
    });

    describe("updateCategory()", () => {
        beforeEach(() => {
            vi.clearAllMocks();

            req = {
                params: {},
                body: {},
            };

            res = {};
        });

        it("should update category successfully", async () => {
            req.params = {
                id: "1",
            };

            req.body = {
                name: "Updated Category",
                isPopular: true,
            };

            const updatedCategory = {
                _id: "1",
                name: "Updated Category",
                isPopular: true,
            };

            vi.spyOn(categoryService, "updateCategoryService")
                .mockResolvedValue(updatedCategory as any);

            await updateCategory(req as Request, res as Response);

            expect(categoryService.updateCategoryService)
                .toHaveBeenCalledWith("1", req.body);

            expect(responseUtils.successResponse)
                .toHaveBeenCalledWith(
                    res,
                    updatedCategory,
                    Messages.Category_Updated,
                    StatusCode.OK
                );
        });

        it("should return Category Not Found when service returns null", async () => {
            req.params = {
                id: "1",
            };

            req.body = {
                name: "Updated Category",
            };

            vi.spyOn(categoryService, "updateCategoryService")
                .mockResolvedValue(null);

            await updateCategory(req as Request, res as Response);

            expect(responseUtils.failResponse)
                .toHaveBeenCalledWith(
                    res,
                    Messages.Category_Not_Found,
                    StatusCode.Not_Found
                );

            expect(responseUtils.successResponse)
                .not.toHaveBeenCalled();
        });

        it("should return Category Not Found when service returns undefined", async () => {
            req.params = {
                id: "1",
            };

            req.body = {
                name: "Updated Category",
            };

            vi.spyOn(categoryService, "updateCategoryService")
                .mockResolvedValue(undefined as any);

            await updateCategory(req as Request, res as Response);

            expect(responseUtils.failResponse)
                .toHaveBeenCalledWith(
                    res,
                    Messages.Category_Not_Found,
                    StatusCode.Not_Found
                );
        });

        it("should handle service exception", async () => {
            req.params = {
                id: "1",
            };

            req.body = {
                name: "Updated Category",
            };

            vi.spyOn(categoryService, "updateCategoryService")
                .mockRejectedValue(new Error("Update Error"));

            await updateCategory(req as Request, res as Response);

            expect(responseUtils.failResponse)
                .toHaveBeenCalledWith(
                    res,
                    "Update Error",
                    StatusCode.Bad_Request
                );
        });

        it("should handle unknown error object", async () => {
            req.params = {
                id: "1",
            };

            req.body = {
                name: "Updated Category",
            };

            vi.spyOn(categoryService, "updateCategoryService")
                .mockRejectedValue("Unknown Error");

            await updateCategory(req as Request, res as Response);

            expect(responseUtils.failResponse)
                .toHaveBeenCalledWith(
                    res,
                    "Unknown Error",
                    StatusCode.Bad_Request
                );
        });
    });

    describe("deleteCategory()", () => {
        beforeEach(() => {
            vi.clearAllMocks();

            req = {
                params: {},
            };

            res = {};
        });

        it("should delete category successfully", async () => {
            req.params = {
                id: "1",
            };

            vi.spyOn(categoryService, "deleteCategoryService")
                .mockResolvedValue({
                    _id: "1",
                } as any);

            await deleteCategory(req as Request, res as Response);

            expect(categoryService.deleteCategoryService)
                .toHaveBeenCalledWith("1");

            expect(responseUtils.successResponse)
                .toHaveBeenCalledWith(
                    res,
                    "",
                    Messages.Category_Deleted,
                    StatusCode.OK
                );
        });

        it("should return Category Not Found when service returns null", async () => {
            req.params = {
                id: "100",
            };

            vi.spyOn(categoryService, "deleteCategoryService")
                .mockResolvedValue(null);

            await deleteCategory(req as Request, res as Response);

            expect(responseUtils.failResponse)
                .toHaveBeenCalledWith(
                    res,
                    Messages.Category_Not_Found,
                    StatusCode.Not_Found
                );

            expect(responseUtils.successResponse)
                .not.toHaveBeenCalled();
        });

        it("should return Category Not Found when service returns undefined", async () => {
            req.params = {
                id: "100",
            };

            vi.spyOn(categoryService, "deleteCategoryService")
                .mockResolvedValue(undefined as any);

            await deleteCategory(req as Request, res as Response);

            expect(responseUtils.failResponse)
                .toHaveBeenCalledWith(
                    res,
                    Messages.Category_Not_Found,
                    StatusCode.Not_Found
                );
        });

        it("should handle service exception", async () => {
            req.params = {
                id: "1",
            };

            vi.spyOn(categoryService, "deleteCategoryService")
                .mockRejectedValue(new Error("Delete Error"));

            await deleteCategory(req as Request, res as Response);

            expect(responseUtils.failResponse)
                .toHaveBeenCalledWith(
                    res,
                    "Delete Error",
                    StatusCode.Bad_Request
                );
        });

        it("should handle unknown error object", async () => {
            req.params = {
                id: "1",
            };

            vi.spyOn(categoryService, "deleteCategoryService")
                .mockRejectedValue("Unknown Error");

            await deleteCategory(req as Request, res as Response);

            expect(responseUtils.failResponse)
                .toHaveBeenCalledWith(
                    res,
                    "Unknown Error",
                    StatusCode.Bad_Request
                );
        });
    });

    describe("deleteAllCategories()", () => {
        beforeEach(() => {
            vi.clearAllMocks();

            req = {};
            res = {};
        });

        it("should delete all categories successfully", async () => {
            const result = {
                acknowledged: true,
                deletedCount: 10,
            };

            vi.spyOn(categoryService, "deleteAllCategoriesService")
                .mockResolvedValue(result as any);

            await deleteAllCategories(req as Request, res as Response);

            expect(categoryService.deleteAllCategoriesService)
                .toHaveBeenCalledTimes(1);

            expect(responseUtils.successResponse)
                .toHaveBeenCalledWith(
                    res,
                    result,
                    Messages.Category_ALL_Deleted,
                    StatusCode.OK
                );
        });

        it("should handle deleteAllCategories exception", async () => {
            vi.spyOn(categoryService, "deleteAllCategoriesService")
                .mockRejectedValue(new Error("Delete All Error"));

            await deleteAllCategories(req as Request, res as Response);

            expect(responseUtils.failResponse)
                .toHaveBeenCalledWith(
                    res,
                    "Delete All Error",
                    StatusCode.Bad_Request
                );
        });

        it("should handle unknown deleteAllCategories error", async () => {
            vi.spyOn(categoryService, "deleteAllCategoriesService")
                .mockRejectedValue("Unknown Error");

            await deleteAllCategories(req as Request, res as Response);

            expect(responseUtils.failResponse)
                .toHaveBeenCalledWith(
                    res,
                    "Unknown Error",
                    StatusCode.Bad_Request
                );
        });
    });
});
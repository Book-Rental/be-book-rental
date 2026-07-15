import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/models/Category", () => ({
    default: {
        create: vi.fn(),
        find: vi.fn(),
        findById: vi.fn(),
        findByIdAndUpdate: vi.fn(),
        findByIdAndDelete: vi.fn(),
        deleteMany: vi.fn(),
    },
}));

import Category from "../src/models/Category";

import {
    createCategoryService,
    getAllCategoriesService,
    getCategoryByIdService,
    updateCategoryService,
    deleteCategoryService,
    deleteAllCategoriesService,
} from "../src/services/categoryService";

describe("Category Service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ==========================================================
    // createCategoryService
    // ==========================================================

    describe("createCategoryService()", () => {
        it("should create category", async () => {
            const category = {
                _id: "1",
                name: "Novel",
            };

            (Category.create as any).mockResolvedValue(category);

            const result = await createCategoryService({
                name: "Novel",
            } as any);

            expect(Category.create).toHaveBeenCalledWith({
                name: "Novel",
            });

            expect(result).toEqual(category);
        });

        it("should throw create error", async () => {
            (Category.create as any).mockRejectedValue(
                new Error("Create Error")
            );

            await expect(
                createCategoryService({} as any)
            ).rejects.toThrow("Create Error");
        });
    });

    // ==========================================================
    // getAllCategoriesService
    // ==========================================================

    describe("getAllCategoriesService()", () => {
        it("should return all categories", async () => {
            const categories = [
                {
                    _id: "1",
                    name: "Novel",
                },
            ];

            (Category.find as any).mockResolvedValue(categories);

            const result = await getAllCategoriesService();

            expect(Category.find).toHaveBeenCalledWith({});

            expect(result).toEqual(categories);
        });

        it("should return only popular categories", async () => {
            const categories = [
                {
                    _id: "1",
                    name: "Novel",
                    isPopular: true,
                },
            ];

            (Category.find as any).mockResolvedValue(categories);

            const result = await getAllCategoriesService(true);

            expect(Category.find).toHaveBeenCalledWith({
                isPopular: true,
            });

            expect(result).toEqual(categories);
        });

        it("should accept string true", async () => {
            (Category.find as any).mockResolvedValue([]);

            await getAllCategoriesService("true");

            expect(Category.find).toHaveBeenCalledWith({
                isPopular: true,
            });
        });

        it("should throw find error", async () => {
            (Category.find as any).mockRejectedValue(
                new Error("Find Error")
            );

            await expect(
                getAllCategoriesService()
            ).rejects.toThrow("Find Error");
        });
    });

    // ==========================================================
    // getCategoryByIdService
    // ==========================================================

    describe("getCategoryByIdService()", () => {
        it("should return category", async () => {
            const category = {
                _id: "1",
                name: "Novel",
            };

            (Category.findById as any).mockResolvedValue(
                category
            );

            const result = await getCategoryByIdService("1");

            expect(Category.findById).toHaveBeenCalledWith(
                "1"
            );

            expect(result).toEqual(category);
        });

        it("should return null", async () => {
            (Category.findById as any).mockResolvedValue(
                null
            );

            const result = await getCategoryByIdService("1");

            expect(result).toBeNull();
        });

        it("should throw findById error", async () => {
            (Category.findById as any).mockRejectedValue(
                new Error("FindById Error")
            );

            await expect(
                getCategoryByIdService("1")
            ).rejects.toThrow("FindById Error");
        });
    });

    // ==========================================================
    // updateCategoryService
    // ==========================================================

    describe("updateCategoryService()", () => {
        it("should update category", async () => {
            const updated = {
                _id: "1",
                name: "Updated",
            };

            (Category.findByIdAndUpdate as any).mockResolvedValue(
                updated
            );

            const result = await updateCategoryService(
                "1",
                {
                    name: "Updated",
                }
            );

            expect(
                Category.findByIdAndUpdate
            ).toHaveBeenCalledWith(
                "1",
                {
                    name: "Updated",
                },
                {
                    new: true,
                }
            );

            expect(result).toEqual(updated);
        });

        it("should return null", async () => {
            (Category.findByIdAndUpdate as any).mockResolvedValue(
                null
            );

            const result = await updateCategoryService(
                "1",
                {}
            );

            expect(result).toBeNull();
        });

        it("should throw update error", async () => {
            (Category.findByIdAndUpdate as any).mockRejectedValue(
                new Error("Update Error")
            );

            await expect(
                updateCategoryService("1", {})
            ).rejects.toThrow("Update Error");
        });
    });

    // ==========================================================
    // deleteCategoryService
    // ==========================================================

    describe("deleteCategoryService()", () => {
        it("should delete category", async () => {
            const deleted = {
                _id: "1",
            };

            (Category.findByIdAndDelete as any).mockResolvedValue(
                deleted
            );

            const result = await deleteCategoryService("1");

            expect(
                Category.findByIdAndDelete
            ).toHaveBeenCalledWith("1");

            expect(result).toEqual(deleted);
        });

        it("should return null", async () => {
            (Category.findByIdAndDelete as any).mockResolvedValue(
                null
            );

            const result = await deleteCategoryService("1");

            expect(result).toBeNull();
        });

        it("should throw delete error", async () => {
            (Category.findByIdAndDelete as any).mockRejectedValue(
                new Error("Delete Error")
            );

            await expect(
                deleteCategoryService("1")
            ).rejects.toThrow("Delete Error");
        });
    });

    // ==========================================================
    // deleteAllCategoriesService
    // ==========================================================

    describe("deleteAllCategoriesService()", () => {
        it("should delete all categories", async () => {
            const response = {
                acknowledged: true,
                deletedCount: 10,
            };

            (Category.deleteMany as any).mockResolvedValue(
                response
            );

            const result =
                await deleteAllCategoriesService();

            expect(Category.deleteMany).toHaveBeenCalledWith(
                {}
            );

            expect(result).toEqual(response);
        });

        it("should throw deleteAll error", async () => {
            (Category.deleteMany as any).mockRejectedValue(
                new Error("DeleteAll Error")
            );

            await expect(
                deleteAllCategoriesService()
            ).rejects.toThrow("DeleteAll Error");
        });
    });
});
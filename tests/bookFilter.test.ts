import { describe, it, expect, vi, beforeEach } from "vitest";
import { Types } from "mongoose";

// 1. Setup a control variable for Category.find returns
let mockCategoryFindResult: any[] = [];

vi.mock("../src/models/Category", () => {
  return {
    default: {
      find: vi.fn(() => ({
        select: vi.fn().mockImplementation(() => mockCategoryFindResult),
      })),
    },
  };
});

import Category from "../src/models/Category";
import {
  buildFilter,
  getSortOption,
  getPagination,
  buildBookAggregationPipeline,
} from "../src/utils/bookFilters"; // Adjust path to match your file location

describe("Book Filter and Pipeline Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCategoryFindResult = [];
  });

  describe("buildFilter", () => {
    it("should build empty filter when query properties are missing", async () => {
      const res = await buildFilter({});
      expect(res).toEqual({});
    });

    it("should filter by valid categoryID string", async () => {
      const validId = new Types.ObjectId().toString();
      const res = await buildFilter({ categoryID: validId });
      expect(res.categoryId).toBeInstanceOf(Types.ObjectId);
      expect(res.categoryId.toString()).toBe(validId);
    });

    it("should ignore invalid categoryID strings", async () => {
      const res = await buildFilter({ categoryID: "invalid-id" });
      expect(res.categoryId).toBeUndefined();
    });

    it("should filter by categoryName when matches exist in database", async () => {
      const catId = new Types.ObjectId();
      mockCategoryFindResult = [{ _id: catId }];

      const res = await buildFilter({ categoryName: "Sci-Fi , Fantasy" });

      expect(Category.find).toHaveBeenCalledWith({
        $or: [
          { name: { $regex: "Sci-Fi", $options: "i" } },
          { name: { $regex: "Fantasy", $options: "i" } },
        ],
      });
      expect(res.categoryId).toEqual({ $in: [catId] });
    });

    it("should return empty array $in matching filter when categoryName results are empty", async () => {
      mockCategoryFindResult = [];
      const res = await buildFilter({ categoryName: "UnknownCat" });
      expect(res.categoryId).toEqual({ $in: [] });
    });

    it("should build global search query conditions on name parameter string match", async () => {
      const catId = new Types.ObjectId();
      mockCategoryFindResult = [{ _id: catId }];

      const res = await buildFilter({ name: "Harry%20Potter" });

      expect(res.$or).toEqual([
        { name: { $regex: "Harry Potter", $options: "i" } },
        { author: { $regex: "Harry Potter", $options: "i" } },
        { categoryId: { $in: [catId] } },
      ]);
    });

    it("should skip adding category conditions to $or global block when no name category matches are found", async () => {
      mockCategoryFindResult = [];
      const res = await buildFilter({ name: "UnmatchedBookName" });

      expect(res.$or).toHaveLength(2); // Only matches title and author properties
    });

    it("should process comma-separated language strings and bypass filter when value evaluates to all", async () => {
      const normalRes = await buildFilter({ language: "en, fr" });
      expect(normalRes.language).toBeDefined();

      const allRes = await buildFilter({ language: "all" });
      expect(allRes.language).toBeUndefined();
    });

    it("should compute range filters using minPrice and maxPrice parameters", async () => {
      const minOnly = await buildFilter({ minPrice: "50" });
      expect(minOnly.purchasePrice).toEqual({ $gte: 50 });

      const maxOnly = await buildFilter({ maxPrice: "150" });
      expect(maxOnly.purchasePrice).toEqual({ $lte: 150 });

      const both = await buildFilter({ minPrice: "50", maxPrice: "150" });
      expect(both.purchasePrice).toEqual({ $gte: 50, $lte: 150 });
    });

    it("should map truthy string expressions to standard boolean filters", async () => {
      const query = {
        isPopular: "true",
        isAvailable: "false",
        availableForSale: "true",
        availableForRent: "false",
      };
      const res = await buildFilter(query);

      expect(res.isPopular).toBe(true);
      expect(res.isAvailable).toBe(false);
      expect(res.availableForSale).toBe(true);
      expect(res.availableForRent).toBe(false);
    });

    it("should catch unexpected query properties errors gracefully and return fallback criteria", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      // Pass an object designed to throw error during destructuring/processing
      const res = await buildFilter(Object.create(null, { name: { get() { throw new Error("Simulated Error"); } } }));
      
      expect(consoleSpy).toHaveBeenCalled();
      expect(res).toEqual({});
      consoleSpy.mockRestore();
    });
  });

  describe("getSortOption", () => {
    it("should verify switch statement paths for sort strings mappings", () => {
      expect(getSortOption("priceLowToHigh")).toEqual({ purchasePrice: 1 });
      expect(getSortOption("priceHighToLow")).toEqual({ purchasePrice: -1 });
      expect(getSortOption("nameAToZ")).toEqual({ name: 1 });
      expect(getSortOption("nameZToA")).toEqual({ name: -1 });
      expect(getSortOption(undefined)).toEqual({ createdAt: -1 });
    });
  });

  describe("getPagination", () => {
    it("should parse variations of structural numbers or return defaults", () => {
      expect(getPagination(2, 5)).toEqual({ pageNum: 2, limitNum: 5, skip: 5 });
      expect(getPagination("abc" as any, "xyz" as any)).toEqual({ pageNum: 1, limitNum: 10, skip: 0 });
    });
  });

  describe("buildBookAggregationPipeline", () => {
    it("should combine build steps together to assemble a complete operational Mongo aggregation pipeline framework", async () => {
      const pipeline = await buildBookAggregationPipeline({ isPopular: "true" }, "nameAToZ", 2, 10);

      // Fix: The pipeline contains exactly 7 operational aggregation blocks
      expect(pipeline).toHaveLength(7);
      expect(pipeline[0]).toEqual({ $match: { isPopular: true } });
      expect(pipeline[1].$lookup).toBeDefined();
      expect(pipeline[2].$unwind).toBeDefined();
      expect(pipeline[3].$project).toBeDefined();
      expect(pipeline[4]).toEqual({ $sort: { name: 1 } });
      expect(pipeline[5]).toEqual({ $skip: 10 });
      expect(pipeline[6]).toEqual({ $limit: 10 });
    });
  });
});

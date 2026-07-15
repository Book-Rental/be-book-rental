import { describe, it, expect } from "vitest";
import mongoose, { Types } from "mongoose";
import { buildWishlistBooksAggregationPipeline } from "../src/utils/buildWishlistBooksAggregationPipeline"; // Adjust path to match your source file location
import { buildWishlistFilter } from "../src/utils/buildWishlistFilter";

describe("Wishlist Books Aggregation Pipeline Builder", () => {
  it("should correctly compile all pipeline stages and process accurate offset parameters", () => {
    // Setup standard mock filter parameters
    const mockFilter = { userId: new Types.ObjectId().toString() };
    const page = 3;
    const limit = 5;
    
    // Expected skip parameter arithmetic: (3 - 1) * 5 = 10
    const expectedSkip = 10;

    const pipeline = buildWishlistBooksAggregationPipeline(mockFilter, page, limit);

    // Assert that the pipeline contains exactly 8 query blocks
    expect(pipeline).toHaveLength(8);

    // Stage 1: Validate filter parameters bind properly
    expect(pipeline[0]).toEqual({ $match: mockFilter });

    // Stage 2: Initial projection mapping configuration
    expect(pipeline[1]).toEqual({
      $project: {
        name: 1,
        items: 1,
      },
    });

    // Stage 3: Unwinding items array list context
    expect(pipeline[2]).toEqual({ $unwind: "$items" });

    // Stage 4: Books collection document join query lookups
    expect(pipeline[3]).toEqual({
      $lookup: {
        from: "books",
        localField: "items.bookId",
        foreignField: "_id",
        as: "book",
      },
    });

    // Stage 5: Unwinding target book relational mapping structures
    expect(pipeline[4]).toEqual({ $unwind: "$book" });

    // Stage 6: Final fields structural mapping projection matrix
    expect(pipeline[5]).toEqual({
      $project: {
        wishlistName: "$name",
        _id: "$book._id",
        name: "$book.name",
        description: "$book.description",
        price: "$book.purchasePrice",
        coverImage: "$book.coverImage",
        author: "$book.author",
        rentalPricePerDay: "$book.rentalPricePerDay",
        rentalPricePerWeek: "$book.rentalPricePerWeek",
        rentalPricePerMonth: "$book.rentalPricePerMonth",
      },
    });

    // Stage 7: Offset pagination computation assertions
    expect(pipeline[6]).toEqual({ $skip: expectedSkip });

    // Stage 8: Range ceiling configuration assertions
    expect(pipeline[7]).toEqual({ $limit: limit });
  });
});
describe("Build Wishlist Filter Utility", () => {
  
  it("should successfully build a filter with a valid userId and no wishListID", () => {
    const validUserId = new mongoose.Types.ObjectId().toString();
    
    const filter = buildWishlistFilter(validUserId);

    expect(filter.userId).toBeInstanceOf(mongoose.Types.ObjectId);
    expect(filter.userId.toString()).toBe(validUserId);
    expect(filter._id).toBeUndefined(); // Should not include _id if wishListID is missing
  });

  it("should successfully build a filter containing both valid userId and valid wishListID parameters", () => {
    const validUserId = new mongoose.Types.ObjectId().toString();
    const validWishlistId = new mongoose.Types.ObjectId().toString();

    const filter = buildWishlistFilter(validUserId, validWishlistId);

    expect(filter.userId).toBeInstanceOf(mongoose.Types.ObjectId);
    expect(filter.userId.toString()).toBe(validUserId);
    
    expect(filter._id).toBeInstanceOf(mongoose.Types.ObjectId);
    expect(filter._id.toString()).toBe(validWishlistId);
  });

  it("should throw an validation Error immediately if the passed userId is malformed", () => {
    const invalidUserId = "not-a-valid-object-id";

    expect(() => {
      buildWishlistFilter(invalidUserId);
    }).toThrowError("Invalid user id.");
  });

  it("should throw an validation Error if userId is valid but the optional wishListID parameter is malformed", () => {
    const validUserId = new mongoose.Types.ObjectId().toString();
    const invalidWishlistId = "malformed-wishlist-string-id";

    expect(() => {
      buildWishlistFilter(validUserId, invalidWishlistId);
    }).toThrowError("Invalid wishlist id.");
  });
});

import mongoose, { FilterQuery, Types } from "mongoose";
import { IBook } from "../models/Book";
import Category from "../models/Category";

// Function to build the filter object

export const buildFilter = async (query: any): Promise<FilterQuery<IBook>> => {
  const filter: FilterQuery<IBook> = {};

  try {
    const {
      categoryID,
      name,
      language,
      minPrice,
      maxPrice,
      isPopular,
      isAvailable,
      availableForSale,
      availableForRent,
      categoryName,
      search
    } = query;

    // Filter by Category ID
    if (categoryID && Types.ObjectId.isValid(categoryID)) {
      filter.categoryId = new Types.ObjectId(categoryID);
    }

    //Filter by Category Name
    if (categoryName?.trim()) {
      const categoryNames = categoryName
        .split(",")
        .map((name: string) => name.trim())
        .filter(Boolean);

      const categories = await Category.find({
        $or: categoryNames.map((name: string) => ({
          name: {
            $regex: name,
            $options: "i",
          },
        })),
      }).select("_id");

      filter.categoryId =
        categories.length > 0
          ? {
            $in: categories.map((category) => category._id),
          }
          : {
            $in: [],
          };
    }
    // Global Search (Book Name + Author + Category)
   
    if (search?.trim()) {
      let keyword = search.replace(/%(?![0-9A-Fa-f]{2})/g, "%25");
      keyword = decodeURIComponent(keyword);

      const categories = await Category.find({
        name: {
          $regex: keyword,
          $options: "i",
        },
      }).select("_id");

      const searchConditions: FilterQuery<IBook>[] = [
        {
          name: {
            $regex: keyword,
            $options: "i",
          },
        },
        {
          author: {
            $regex: keyword,
            $options: "i",
          },
        },
      ];

      if (categories.length > 0) {
        searchConditions.push({
          categoryId: {
            $in: categories.map((category) => category._id),
          },
        });
      }

      filter.$and = filter.$and || [];

      filter.$and.push({
        $or: searchConditions,
      });
    }

    // Name Filter (Book Name + Author only)
    if (name?.trim()) {
      let keyword = name.replace(/%(?![0-9A-Fa-f]{2})/g, "%25");
      keyword = decodeURIComponent(keyword);

      filter.$and = filter.$and || [];

      filter.$and.push({
        $or: [
          {
            name: {
              $regex: keyword,
              $options: "i",
            },
          },
          {
            author: {
              $regex: keyword,
              $options: "i",
            },
          },
        ],
      });
    }

    // Language Filter
    if (language?.trim()) {
      // If the user passes "all", do not apply any language filter (returns all data)
      if (language.trim().toLowerCase() !== "all") {
        filter.language = {
          $in: language
            .split(",")
            .map((lang: string) => new RegExp(`^${lang.trim()}$`, "i")),
        };
      }
    }

    // Purchase Price
    if (minPrice || maxPrice) {
      filter.purchasePrice = {};

      if (minPrice) {
        filter.purchasePrice.$gte = Number(minPrice);
      }

      if (maxPrice) {
        filter.purchasePrice.$lte = Number(maxPrice);
      }
    }

    // Boolean Filters
    if (isPopular !== undefined) {
      filter.isPopular = isPopular === "true";
    }

    if (isAvailable !== undefined) {
      filter.isAvailable = isAvailable === "true";
    }

    if (availableForSale !== undefined) {
      filter.availableForSale = availableForSale === "true";
    }

    if (availableForRent !== undefined) {
      filter.availableForRent = availableForRent === "true";
    }

    return filter;
  } catch (err) {
    console.error("Filter Query Error:", err);
    return filter;
  }
};

// Function to get sort option
export const getSortOption = (sortBy: string | undefined): { [key: string]: 1 | -1 } => {
  switch (sortBy) {
    case "priceLowToHigh":
      return { purchasePrice: 1 };
    case "priceHighToLow":
      return { purchasePrice: -1 };
    case "nameAToZ":
      return { name: 1 };
    case "nameZToA":
      return { name: -1 };
    default:
      return { createdAt: -1 };
  }
};

// Function for pagination
export const getPagination = (page: number, limit: number) => {
  const pageNum = parseInt(page as unknown as string, 10) || 1;
  const limitNum = parseInt(limit as unknown as string, 10) || 10;
  const skip = (pageNum - 1) * limitNum;
  return { pageNum, limitNum, skip };
};

// Aggregation pipeline builder for Books
export const buildBookAggregationPipeline = async (
  filterQuery: any,
  sortBy: string | undefined,
  page: number,
  limit: number
) => {
  const filter = await buildFilter(filterQuery);
  const sortOption = getSortOption(sortBy);
  const { limitNum, skip } = getPagination(page, limit);

  return [
    { $match: filter },

    // Lookup to get category details mapping to categoryId
    {
      $lookup: {
        from: "categories",
        localField: "categoryId",
        foreignField: "_id",
        as: "categoryDetails",
      },
    },

    { $unwind: { path: "$categoryDetails", preserveNullAndEmptyArrays: true } },

    // Projection matching your exact Book schema
    {
      $project: {
        name: 1,
        description: 1,
        language: 1,
        author: 1,
        edition: 1,
        coverImage: 1,
        images: 1,
        quantity: 1,
        purchasePrice: 1,
        rentalPricePerDay: 1,
        rentalPricePerWeek: 1,
        rentalPricePerMonth: 1,
        securityDeposit: 1,
        availableForSale: 1,
        availableForRent: 1,
        sellerId: 1,
        listingType: 1,
        condition: 1,
        numberOfPages: 1,
        publicationDate: 1,
        isPopular: 1,
        isAvailable: 1,
        availabilityStatus: 1,
        isActive: 1,
        status: 1,
        createdAt: 1,
        category: {
          id: "$categoryDetails._id",
          name: "$categoryDetails.name",
        },
      },
    },

    { $sort: sortOption },
    { $skip: skip },
    { $limit: limitNum },
  ];
};

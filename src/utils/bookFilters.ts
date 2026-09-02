import { FilterQuery, PipelineStage, Types } from "mongoose";
import { IBook } from "../models/Book";
import Category from "../models/Category";

//  * Decode search text safely.

const decodeSearchText = (text: string): string => {
    return decodeURIComponent(text.replace(/%(?![0-9A-Fa-f]{2})/g, "%25"));
};

//  * Convert query string to boolean.

const toBoolean = (value: any): boolean => {
    return String(value).toLowerCase() === "true";
};

//  * Fetch matching category ids.

const getCategoryIds = async (keyword: string) => {
    const categories = await Category.find({
        name: {
            $regex: keyword,
            $options: "i",
        },
    }).select("_id");

    return categories.map((category) => category._id);
};

//  * Build MongoDB Filter

export const buildFilter = async (
    query: any
): Promise<FilterQuery<IBook>> => {
    const filter: FilterQuery<IBook> = {};
    const andConditions: FilterQuery<IBook>[] = [];

    try {
        const {
            categoryID,
            categoryName,
            search,
            name,
            language,
            minPrice,
            maxPrice,
            isPopular,
            isAvailable,
            availableForSale,
            availableForRent,
            isAuction,
        } = query;

        // Category ID
        if (categoryID && Types.ObjectId.isValid(categoryID)) {
            filter.categoryId = new Types.ObjectId(categoryID);
        }

        // Category Name
        if (categoryName?.trim()) {
            const categoryNames = categoryName
                .split(",")
                .map((item: string) => item.trim())
                .filter(Boolean);

            const categories = await Category.find({
                $or: categoryNames.map((item: string) => ({
                    name: {
                        $regex: item,
                        $options: "i",
                    },
                })),
            }).select("_id");

            filter.categoryId = {
                $in: categories.map((item) => item._id),
            };
        }

        // Global Search
        // Search in:
        // 1. Book Name
        // 2. Author
        // 3. Category
        if (search?.trim()) {
            const keyword = decodeSearchText(search);
            const categoryIds = await getCategoryIds(keyword);

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

            if (categoryIds.length) {
                searchConditions.push({
                    categoryId: {
                        $in: categoryIds,
                    },
                });
            }

            andConditions.push({
                $or: searchConditions,
            });
        }

        // Name Filter
        // Search in:
        // 1. Book Name
        // 2. Author
        if (name?.trim()) {
            const keyword = decodeSearchText(name);

            andConditions.push({
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
        const lang = language?.trim();

        if (lang && lang.toLowerCase() !== "all") {
            filter.language = {
                $in: lang
                    .split(",")
                    .map(
                        (item: string) =>
                            new RegExp(`^${item.trim()}$`, "i")
                    ),
            };
        }

        // Purchase Price Filter
        const min = Number(minPrice);
        const max = Number(maxPrice);

        if (!isNaN(min) || !isNaN(max)) {
            filter.purchasePrice = {};

            if (!isNaN(min)) {
                filter.purchasePrice.$gte = min;
            }

            if (!isNaN(max)) {
                filter.purchasePrice.$lte = max;
            }
        }

        // Boolean Filters
        if (isPopular !== undefined) {
            filter.isPopular = toBoolean(isPopular);
        }

        if (isAvailable !== undefined) {
            filter.isAvailable = toBoolean(isAvailable);
        }

        if (availableForSale !== undefined) {
            filter.availableForSale = toBoolean(availableForSale);
        }

        if (availableForRent !== undefined) {
            filter.availableForRent = toBoolean(availableForRent);
        }

        if (isAuction !== undefined) {
            filter.isAuction = toBoolean(isAuction);
        }

//         if (activeStatus?.trim()) {
//     const statuses = activeStatus
//         .split(",")
//         .map((status: string) => status.trim().toLowerCase())
//         .filter(Boolean);

//     filter.activeStatus = {
//         $in: statuses,
//     };
// }

        // Attach AND Conditions
        if (andConditions.length > 0) {
            filter.$and = andConditions;
        }

        return filter;
    } catch (error) {
        console.error("Filter Builder Error:", error);

        return filter;
    }
};
//  * Get Sort Option

export const getSortOption = (sortBy?: string): Record<string, 1 | -1> => {
    switch (sortBy) {
        case "priceLowToHigh":
            return {
                purchasePrice: 1,
            };

        case "priceHighToLow":
            return {
                purchasePrice: -1,
            };

        case "nameAToZ":
            return {
                name: 1,
            };

        case "nameZToA":
            return {
                name: -1,
            };

        case "latest":
            return {
                createdAt: -1,
            };

        case "oldest":
            return {
                createdAt: 1,
            };

        case "popular":
            return {
                isPopular: -1,
                createdAt: -1,
            };

        default:
            return {
                createdAt: -1,
            };
    }
};

//  * Pagination

export const getPagination = (page?: number | string, limit?: number | string) => {
    const pageNum = Math.max(1, Number(page) || 1);

    const limitNum = Math.max(1, Number(limit) || 10);

    const skip = (pageNum - 1) * limitNum;

    return {
        pageNum,
        limitNum,
        skip,
    };
};

//  * Build Pagination Metadata

export const buildPaginationMeta = (totalRecords: number, page: number, limit: number) => {
    const totalPages = Math.ceil(totalRecords / limit);

    return {
        totalRecords,
        totalPages,
        currentPage: page,
        limit,
        hasMore: page < totalPages,
    };
};

export const buildBookAggregationPipeline = async (
    filterQuery: any,
    sortBy?: string,
    page: number = 1,
    limit: number = 10
): Promise<PipelineStage[]> => {
    const filter = await buildFilter(filterQuery);

    const sortOption = getSortOption(sortBy);

    const { skip, limitNum } = getPagination(
        page,
        limit
    );

    const { status } = filterQuery;

    const auctionStatuses = status
        ?.split(",")
        .map((item: string) =>
            item.trim().toLowerCase()
        )
        .filter(Boolean);

    const pipeline: PipelineStage[] = [
        // --------------------------------------------------
        // Book filter
        // --------------------------------------------------
        {
            $match: filter,
        },

        // --------------------------------------------------
        // Category lookup
        // --------------------------------------------------
        {
            $lookup: {
                from: "categories",
                localField: "categoryId",
                foreignField: "_id",
                as: "category",
            },
        },

        {
            $unwind: {
                path: "$category",
                preserveNullAndEmptyArrays: true,
            },
        },

        // --------------------------------------------------
        // Auction lookup
        // --------------------------------------------------
        {
            $lookup: {
                from: "auctions",
                localField: "_id",
                foreignField: "bookId",
                as: "auction",
            },
        },

        {
            $unwind: {
                path: "$auction",
                preserveNullAndEmptyArrays: true,
            },
        },

        // --------------------------------------------------
        // Calculate auction status
        // --------------------------------------------------
        {
            $addFields: {
                "auction.calculatedStatus": {
                    $cond: [
                        {
                            $not: ["$auction._id"],
                        },
                        null,
                        {
                            $switch: {
                                branches: [
                                    {
                                        // UPCOMING
                                        case: {
                                            $gt: [
                                                "$auction.startDate",
                                                "$$NOW",
                                            ],
                                        },
                                        then: "upcoming",
                                    },

                                    {
                                        // LIVE
                                        case: {
                                            $lt: [
                                                "$$NOW",
                                                {
                                                    $dateAdd: {
                                                        startDate:
                                                            "$auction.startDate",
                                                        unit: "day",
                                                        amount:
                                                            "$auction.duration",
                                                    },
                                                },
                                            ],
                                        },
                                        then: "live",
                                    },
                                ],

                                // COMPLETED
                                default: "completed",
                            },
                        },
                    ],
                },
            },
        },

        // --------------------------------------------------
        // Auction status filter
        // --------------------------------------------------
        ...(auctionStatuses?.length
            ? [
                  {
                      $match: {
                          "auction.calculatedStatus": {
                              $in: auctionStatuses,
                          },
                      },
                  },
              ]
            : []),

        // --------------------------------------------------
        // Get auction bid details
        // --------------------------------------------------
        {
            $lookup: {
                from: "auctionbids",

                let: {
                    auctionId: "$auction._id",
                },

                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $eq: [
                                    "$auctionId",
                                    "$$auctionId",
                                ],
                            },
                        },
                    },

                    {
                        $facet: {
                            // Highest bid
                            highestBid: [
                                {
                                    $sort: {
                                        bidPrice: -1,
                                    },
                                },
                                {
                                    $limit: 1,
                                },
                            ],

                            // Total number of bids
                            bidCount: [
                                {
                                    $count: "count",
                                },
                            ],
                        },
                    },
                ],

                as: "auctionBidDetails",
            },
        },

        // --------------------------------------------------
        // Unwind bid details
        // --------------------------------------------------
        {
            $unwind: {
                path: "$auctionBidDetails",
                preserveNullAndEmptyArrays: true,
            },
        },

        // --------------------------------------------------
        // Build response
        // --------------------------------------------------
        {
            $addFields: {
                category: {
                    id: "$category._id",
                    name: "$category.name",
                },

                auction: {
                    $cond: [
                        {
                            $eq: [
                                "$isAuction",
                                true,
                            ],
                        },

                        {
                            $mergeObjects: [
                                "$auction",

                                {
                                    // Auction status
                                    status: "$auction.calculatedStatus",

                                    // Current highest bid
                                    currentBidPrice: {
                                        $ifNull: [
                                            {
                                                $arrayElemAt: [
                                                    "$auctionBidDetails.highestBid.bidPrice",
                                                    0,
                                                ],
                                            },
                                            "$auction.bidPrice",
                                        ],
                                    },

                                    // Number of bids
                                    bidCount: {
                                        $ifNull: [
                                            {
                                                $arrayElemAt: [
                                                    "$auctionBidDetails.bidCount.count",
                                                    0,
                                                ],
                                            },
                                            0,
                                        ],
                                    },
                                },
                            ],
                        },

                        null,
                    ],
                },
            },
        },

        // --------------------------------------------------
        // Remove unwanted fields
        // --------------------------------------------------
        {
            $project: {
                __v: 0,
                categoryId: 0,
                auctionBidDetails: 0,

                "category.__v": 0,
                "category.createdAt": 0,
                "category.updatedAt": 0,

                "auction.__v": 0,
                "auction.createdAt": 0,
                "auction.updatedAt": 0,
                "auction.calculatedStatus": 0,
            },
        },

        // --------------------------------------------------
        // Sort
        // --------------------------------------------------
        {
            $sort: sortOption,
        },

        // --------------------------------------------------
        // Pagination
        // --------------------------------------------------
        {
            $skip: skip,
        },

        {
            $limit: limitNum,
        },
    ];

    return pipeline;
};


// Build Count Aggregation Pipeline
export const buildBookCountAggregationPipeline = async (
    filterQuery: any
): Promise<PipelineStage[]> => {

    const filter =
        await buildFilter(filterQuery);

    const { status } = filterQuery;

    const auctionStatuses = status
        ?.split(",")
        .map((item: string) =>
            item.trim().toLowerCase()
        )
        .filter(Boolean);

    const pipeline: PipelineStage[] = [

        // Apply Book filters
        {
            $match: filter,
        },

        // Join Auction
        {
            $lookup: {
                from: "auctions",
                localField: "_id",
                foreignField: "bookId",
                as: "auction",
            },
        },

        {
            $unwind: {
                path: "$auction",
                preserveNullAndEmptyArrays: true,
            },
        },

        // Calculate auction status dynamically
        {
            $addFields: {
                "auction.calculatedStatus": {
                    $cond: [
                        {
                            $not: ["$auction._id"],
                        },
                        null,
                        {
                            $switch: {
                                branches: [
                                    {
                                        // UPCOMING
                                        case: {
                                            $gt: [
                                                "$auction.startDate",
                                                "$$NOW",
                                            ],
                                        },
                                        then: "upcoming",
                                    },

                                    {
                                        // LIVE
                                        case: {
                                            $lt: [
                                                "$$NOW",
                                                {
                                                    $dateAdd: {
                                                        startDate:
                                                            "$auction.startDate",
                                                        unit: "day",
                                                        amount:
                                                            "$auction.duration",
                                                    },
                                                },
                                            ],
                                        },
                                        then: "live",
                                    },
                                ],

                                // COMPLETED
                                default: "completed",
                            },
                        },
                    ],
                },
            },
        },

        // Apply auction status filter
        ...(auctionStatuses?.length
            ? [
                  {
                      $match: {
                          "auction.calculatedStatus": {
                              $in: auctionStatuses,
                          },
                      },
                  },
              ]
            : []),

        // Count matching books
        {
            $count: "totalCount",
        },
    ];

    return pipeline;
};

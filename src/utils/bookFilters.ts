import { FilterQuery, PipelineStage, Types } from "mongoose";
import { IBook } from "../models/Book";
import Category from "../models/Category";

// ==================================================
// HELPERS
// ==================================================

const decodeSearchText = (text: string): string => {
    return decodeURIComponent(
        text.replace(
            /%(?![0-9A-Fa-f]{2})/g,
            "%25"
        )
    );
};

const toBoolean = (value: unknown): boolean => {
    return String(value).toLowerCase() === "true";
};

const getCategoryIds = async (keyword: string) => {
    const categories = await Category.find({
        name: {
            $regex: keyword,
            $options: "i",
        },
    }).select("_id");

    return categories.map(
        (category) => category._id
    );
};

// ==================================================
// BUILD BOOK FILTER
// ==================================================

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
        if (
            categoryID &&
            Types.ObjectId.isValid(categoryID)
        ) {
            filter.categoryId =
                new Types.ObjectId(categoryID);
        }

        // Category Name
        if (categoryName?.trim()) {
            const categoryNames = categoryName
                .split(",")
                .map((item: string) => item.trim())
                .filter(Boolean);

            const categories =
                await Category.find({
                    $or: categoryNames.map(
                        (item: string) => ({
                            name: {
                                $regex: item,
                                $options: "i",
                            },
                        })
                    ),
                }).select("_id");

            filter.categoryId = {
                $in: categories.map(
                    (item) => item._id
                ),
            };
        }

        // Global Search
        if (search?.trim()) {
            const keyword =
                decodeSearchText(search);

            const categoryIds =
                await getCategoryIds(keyword);

            const searchConditions:
                FilterQuery<IBook>[] = [
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

            if (categoryIds.length > 0) {
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

        // Name / Author
        if (name?.trim()) {
            const keyword =
                decodeSearchText(name);

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

        // Language
        const lang = language?.trim();

        if (
            lang &&
            lang.toLowerCase() !== "all"
        ) {
            filter.language = {
                $in: lang
                    .split(",")
                    .map(
                        (item: string) =>
                            new RegExp(
                                `^${item.trim()}$`,
                                "i"
                            )
                    ),
            };
        }

        // Price
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

        // Boolean filters
        if (isPopular !== undefined) {
            filter.isPopular =
                toBoolean(isPopular);
        }

        if (isAvailable !== undefined) {
            filter.isAvailable =
                toBoolean(isAvailable);
        }

        if (availableForSale !== undefined) {
            filter.availableForSale =
                toBoolean(availableForSale);
        }

        if (availableForRent !== undefined) {
            filter.availableForRent =
                toBoolean(availableForRent);
        }

        if (isAuction !== undefined) {
            filter.isAuction = toBoolean(isAuction);
        } else {
            filter.isAuction = false;
        }

        if (andConditions.length > 0) {
            filter.$and = andConditions;
        }

        return filter;
    } catch (error) {
        console.error(
            "Filter Builder Error:",
            error
        );

        return filter;
    }
};

// ==================================================
// SORT
// ==================================================

export const getSortOption = (
    sortBy?: string
): Record<string, 1 | -1> => {
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

// ==================================================
// PAGINATION
// ==================================================

export const getPagination = (
    page?: number | string,
    limit?: number | string
) => {
    const pageNum = Math.max(
        1,
        Number(page) || 1
    );

    const limitNum = Math.max(
        1,
        Number(limit) || 10
    );

    const skip =
        (pageNum - 1) * limitNum;

    return {
        pageNum,
        limitNum,
        skip,
    };
};

// ==================================================
// PAGINATION META
// ==================================================

export const buildPaginationMeta = (
    totalRecords: number,
    page: number,
    limit: number
) => {
    const totalPages = Math.ceil(
        totalRecords / limit
    );

    return {
        totalRecords,
        totalPages,
        currentPage: page,
        limit,
        hasMore: page < totalPages,
    };
};

// ==================================================
// AUCTION STATUS PIPELINE
// ==================================================

const getAuctionStatusStages = (
    status?: string
): PipelineStage[] => {
    const auctionStatuses = status
        ?.split(",")
        .map((item: string) =>
            item.trim().toLowerCase()
        )
        .filter(Boolean);

    if (!auctionStatuses?.length) {
        return [];
    }

    return [
        {
            $match: {
                "auction.calculatedStatus": {
                    $in: auctionStatuses,
                },
            },
        },
    ];
};

// ==================================================
// BOOK AGGREGATION PIPELINE
// ==================================================

export const buildBookAggregationPipeline =
    async (
        filterQuery: any,
        sortBy?: string,
        page: number = 1,
        limit: number = 10
    ): Promise<PipelineStage[]> => {
        const filter =
            await buildFilter(filterQuery);

        const sortOption =
            getSortOption(sortBy);

        const { skip, limitNum } =
            getPagination(page, limit);

        const pipeline: PipelineStage[] = [
            // ------------------------------------------
            // 1. BOOK FILTER
            // ------------------------------------------
            {
                $match: filter,
            },

            // ------------------------------------------
            // 2. CATEGORY
            // ------------------------------------------
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

            // ------------------------------------------
            // 3. AUCTION
            // ------------------------------------------
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

            // ------------------------------------------
            // 4. CALCULATE AUCTION STATUS
            // ------------------------------------------
            {
                $addFields: {
                    "auction.calculatedStatus": {
                        $cond: [
                            {
                                $not: [
                                    "$auction._id",
                                ],
                            },

                            null,

                            {
                                $switch: {
                                    branches: [
                                        // UPCOMING
                                        {
                                            case: {
                                                $gt: [
                                                    "$auction.startDate",
                                                    "$$NOW",
                                                ],
                                            },
                                            then: "upcoming",
                                        },

                                        // LIVE
                                        {
                                            case: {
                                                $lt: [
                                                    "$$NOW",
                                                    {
                                                        $dateAdd:
                                                            {
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

                                    default:
                                        "completed",
                                },
                            },
                        ],
                    },
                },
            },

            // ------------------------------------------
            // 5. AUCTION STATUS FILTER
            // ------------------------------------------
            ...getAuctionStatusStages(
                filterQuery.status
            ),

            // ------------------------------------------
            // 6. HIGHEST BID + BIDDER
            // ------------------------------------------
            {
                $lookup: {
                    from: "auctionbids",

                    let: {
                        auctionId:
                            "$auction._id",
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
                            $sort: {
                                bidPrice: -1,
                            },
                        },

                        {
                            $limit: 1,
                        },

                        // Highest bidder
                        {
                            $lookup: {
                                from: "users",

                                localField:
                                    "userId",

                                foreignField:
                                    "_id",

                                as: "bidder",
                            },
                        },

                        {
                            $unwind: {
                                path: "$bidder",
                                preserveNullAndEmptyArrays:
                                    true,
                            },
                        },

                        {
                            $project: {
                                _id: 1,
                                auctionId: 1,
                                userId: 1,
                                bidPrice: 1,
                                createdAt: 1,

                                bidder: {
                                    _id: "$bidder._id",
                                    name: "$bidder.name",
                                    email: "$bidder.email",
                                    phone: "$bidder.phone",
                                    profileImage:
                                        "$bidder.profileImage",
                                },
                            },
                        },
                    ],

                    as: "highestBid",
                },
            },

            // ------------------------------------------
            // 7. BID COUNT
            // ------------------------------------------
            {
                $lookup: {
                    from: "auctionbids",

                    let: {
                        auctionId:
                            "$auction._id",
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
                            $count: "count",
                        },
                    ],

                    as: "bidCount",
                },
            },

            // ------------------------------------------
            // 8. AUCTION ORDER
            // ------------------------------------------
            {
                $lookup: {
                    from: "orders",

                    let: {
                        bookId: "$_id",
                        isAuctionBook:
                            "$isAuction",
                    },

                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        // Only auction books
                                        {
                                            $eq: [
                                                "$$isAuctionBook",
                                                true,
                                            ],
                                        },

                                        // Only auction orders
                                        {
                                            $eq: [
                                                "$orderType",
                                                "auction",
                                            ],
                                        },

                                        // Book exists in order
                                        {
                                            $in: [
                                                "$$bookId",
                                                "$items.bookId",
                                            ],
                                        },
                                    ],
                                },
                            },
                        },

                        {
                            $sort: {
                                createdAt: -1,
                            },
                        },

                        {
                            $limit: 1,
                        },
                    ],

                    as: "orderDetails",
                },
            },

            // ------------------------------------------
            // 9. BUILD FINAL RESPONSE
            // ------------------------------------------
            {
                $addFields: {
                    // Category
                    category: {
                        id: "$category._id",
                        name: "$category.name",
                    },

                    // --------------------------------------
                    // Book status
                    // --------------------------------------
                    status: {
                        $cond: [
                            {
                                $and: [
                                    {
                                        $eq: [
                                            "$isAuction",
                                            true,
                                        ],
                                    },

                                    {
                                        $eq: [
                                            "$auction.calculatedStatus",
                                            "completed",
                                        ],
                                    },

                                    {
                                        $gt: [
                                            {
                                                $size: "$orderDetails",
                                            },
                                            0,
                                        ],
                                    },
                                ],
                            },

                            "inactive",

                            "$status",
                        ],
                    },

                    // --------------------------------------
                    // Active
                    // --------------------------------------
                    isActive: {
                        $cond: [
                            {
                                $and: [
                                    {
                                        $eq: [
                                            "$isAuction",
                                            true,
                                        ],
                                    },

                                    {
                                        $eq: [
                                            "$auction.calculatedStatus",
                                            "completed",
                                        ],
                                    },

                                    {
                                        $gt: [
                                            {
                                                $size: "$orderDetails",
                                            },
                                            0,
                                        ],
                                    },
                                ],
                            },

                            false,

                            "$isActive",
                        ],
                    },

                     availabilityStatus: {
            $cond: [
                {
                    $and: [
                        {
                            $eq: [
                                "$isAuction",
                                true,
                            ],
                        },
                        {
                            $eq: [
                                "$auction.calculatedStatus",
                                "completed",
                            ],
                        },
                        {
                            $gt: [
                                {
                                    $size: "$orderDetails",
                                },
                                0,
                            ],
                        },
                    ],
                },

                // Completed auction + order placed
                "unavailable",

                // Completed auction + no order
                // Keep original availability
                "$availabilityStatus",
            ],
        },


                    availableForRent: {
                        $cond: [
                            {
                                $eq: [
                                    "$isAuction",
                                    true,
                                ],
                            },

                            false,

                            "$availableForRent",
                        ],
                    },

                    isAvailable: {
                        $cond: [
                            {
                                $and: [
                                    {
                                        $eq: [
                                            "$isAuction",
                                            true,
                                        ],
                                    },

                                    {
                                        $eq: [
                                            "$auction.calculatedStatus",
                                            "completed",
                                        ],
                                    },

                                    {
                                        $gt: [
                                            {
                                                $size: "$orderDetails",
                                            },
                                            0,
                                        ],
                                    },
                                ],
                            },

                            false,

                            "$isAvailable",
                        ],
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
                                        // Status
                                        status:
                                            "$auction.calculatedStatus",

                                        // Current highest bid
                                        currentBidPrice: {
                                            $ifNull: [
                                                {
                                                    $arrayElemAt:
                                                        [
                                                            "$highestBid.bidPrice",
                                                            0,
                                                        ],
                                                },

                                                "$auction.bidPrice",
                                            ],
                                        },

                                        // Highest bid
                                        highestBid: {
                                            $arrayElemAt:
                                                [
                                                    "$highestBid",
                                                    0,
                                                ],
                                        },

                                        // Highest bidder
                                        highestBidder: {
                                            $arrayElemAt:
                                                [
                                                    "$highestBid.bidder",
                                                    0,
                                                ],
                                        },

                                        // Bid count
                                        bidCount: {
                                            $ifNull: [
                                                {
                                                    $arrayElemAt:
                                                        [
                                                            "$bidCount.count",
                                                            0,
                                                        ],
                                                },

                                                0,
                                            ],
                                        },

                                        // Order
                                        order: {
                                            $arrayElemAt:
                                                [
                                                    "$orderDetails",
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


            {
                $project: {
                    __v: 0,
                    categoryId: 0,

                    highestBid: 0,
                    bidCount: 0,
                    orderDetails: 0,

                    "category.__v": 0,
                    "category.createdAt": 0,
                    "category.updatedAt": 0,

                    "auction.__v": 0,
                    "auction.createdAt": 0,
                    "auction.updatedAt": 0,
                    "auction.calculatedStatus": 0,
                },
            },

            {
                $sort: sortOption,
            },

            // ------------------------------------------
            // 12. PAGINATION
            // ------------------------------------------
            {
                $skip: skip,
            },

            {
                $limit: limitNum,
            },
        ];

        return pipeline;
    };


export const buildBookCountAggregationPipeline =
    async (
        filterQuery: any
    ): Promise<PipelineStage[]> => {
        const filter =
            await buildFilter(filterQuery);

        const pipeline: PipelineStage[] = [

            {
                $match: filter,
            },

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

            {
                $addFields: {
                    "auction.calculatedStatus": {
                        $cond: [
                            {
                                $not: [
                                    "$auction._id",
                                ],
                            },

                            null,

                            {
                                $switch: {
                                    branches: [
                                        // UPCOMING
                                        {
                                            case: {
                                                $gt: [
                                                    "$auction.startDate",
                                                    "$$NOW",
                                                ],
                                            },
                                            then: "upcoming",
                                        },

                                        // LIVE
                                        {
                                            case: {
                                                $lt: [
                                                    "$$NOW",
                                                    {
                                                        $dateAdd:
                                                            {
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

                                    default:
                                        "completed",
                                },
                            },
                        ],
                    },
                },
            },

            ...getAuctionStatusStages(
                filterQuery.status
            ),
            {
                $count: "totalCount",
            },
        ];

        return pipeline;
    };
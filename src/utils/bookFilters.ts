import {
    FilterQuery,
    PipelineStage,
    Types,
} from "mongoose";
import { IBook } from "../models/Book";
import Category from "../models/Category";

// ==================================================
// HELPERS
// ==================================================

const decodeSearchText = (
    text: string
): string => {
    return decodeURIComponent(
        text.replace(
            /%(?![0-9A-Fa-f]{2})/g,
            "%25"
        )
    );
};

const toBoolean = (
    value: unknown
): boolean => {
    return (
        String(value).toLowerCase() ===
        "true"
    );
};

const getCategoryIds = async (
    keyword: string
) => {
    const categories =
        await Category.find({
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
    const andConditions: FilterQuery<IBook>[] =
        [];

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
            const categoryNames =
                categoryName
                    .split(",")
                    .map(
                        (item: string) =>
                            item.trim()
                    )
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
                await getCategoryIds(
                    keyword
                );

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
        const lang =
            language?.trim();

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
        const min = Number(
            minPrice
        );

        const max = Number(
            maxPrice
        );

        if (
            !isNaN(min) ||
            !isNaN(max)
        ) {
            filter.purchasePrice = {};

            if (!isNaN(min)) {
                filter.purchasePrice.$gte =
                    min;
            }

            if (!isNaN(max)) {
                filter.purchasePrice.$lte =
                    max;
            }
        }

        // Boolean filters
        if (
            isPopular !== undefined
        ) {
            filter.isPopular =
                toBoolean(isPopular);
        }

        if (
            isAvailable !== undefined
        ) {
            filter.isAvailable =
                toBoolean(isAvailable);
        }

        if (
            availableForSale !==
            undefined
        ) {
            filter.availableForSale =
                toBoolean(
                    availableForSale
                );
        }

        if (
            availableForRent !==
            undefined
        ) {
            filter.availableForRent =
                toBoolean(
                    availableForRent
                );
        }

        if (
            isAuction !== undefined
        ) {
            filter.isAuction =
                toBoolean(isAuction);
        } else {
            filter.isAuction = false;
        }

        if (
            andConditions.length > 0
        ) {
            filter.$and =
                andConditions;
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
        hasMore:
            page < totalPages,
    };
};

// ==================================================
// AUCTION STATUS FILTER
// ==================================================

const getAuctionStatusStages = (
    status?: string
): PipelineStage[] => {
    const auctionStatuses = status
        ?.split(",")
        .map(
            (item: string) =>
                item.trim().toLowerCase()
        )
        .filter(Boolean);

    if (
        !auctionStatuses?.length
    ) {
        return [];
    }

    return [
        {
            $match: {
                "auction.calculatedStatus":
                    {
                        $in: auctionStatuses,
                    },
            },
        },
    ];
};

// ==================================================
// BOOK AGGREGATION PIPELINE
// ==================================================

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
            await buildFilter(
                filterQuery
            );

        const sortOption =
            getSortOption(sortBy);

        const {
            skip,
            limitNum,
        } = getPagination(
            page,
            limit
        );

        const pipeline: PipelineStage[] = [
            // ==================================================
            // 1. BOOK FILTER
            // ==================================================
            {
                $match: filter,
            },

            // ==================================================
            // 2. CATEGORY
            // ==================================================
            {
                $lookup: {
                    from: "categories",
                    localField:
                        "categoryId",
                    foreignField:
                        "_id",
                    as: "category",
                },
            },

            {
                $unwind: {
                    path: "$category",
                    preserveNullAndEmptyArrays:
                        true,
                },
            },

            // ==================================================
            // 3. GET ALL AUCTIONS FOR THIS BOOK
            // ==================================================
           // ==================================================
// 3. GET ALL AUCTIONS FOR THIS BOOK
// ==================================================
{
    $lookup: {
        from: "auctions",

        let: {
            bookId: "$_id",
        },

        pipeline: [
            {
                $match: {
                    $expr: {
                        $eq: [
                            "$bookId",
                            "$$bookId",
                        ],
                    },
                },
            },

            // Calculate current auction status
            {
                $addFields: {
                    calculatedStatus: {
                        $cond: [
                            {
                                $eq: [
                                    "$isActive",
                                    false,
                                ],
                            },

                            "cancelled",

                            {
                                $switch: {
                                    branches: [
                                        {
                                            case: {
                                                $gt: [
                                                    "$startDate",
                                                    "$$NOW",
                                                ],
                                            },

                                            then: "upcoming",
                                        },

                                        {
                                            case: {
                                                $lt: [
                                                    "$$NOW",
                                                    {
                                                        $dateAdd: {
                                                            startDate:
                                                                "$startDate",
                                                            unit: "day",
                                                            amount:
                                                                "$duration",
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

            // Return calculated status as status
            {
                $addFields: {
                    status: "$calculatedStatus",
                },
            },
        ],

        as: "auction",
    },
},

            // ==================================================
            // 4. CALCULATE STATUS FOR EVERY AUCTION
            // ==================================================
            // {
            //     $addFields: {
            //         auction: {
            //             $map: {
            //                 input: "$auction",
            //                 as: "auctionItem",

            //                 in: {
            //                     $mergeObjects: [
            //                         "$$auctionItem",
            //                         {
            //                             calculatedStatus:
            //                                 {
            //                                     $cond: [
            //                                         {
            //                                             $eq: [
            //                                                 "$$auctionItem.isActive",
            //                                                 false,
            //                                             ],
            //                                         },

            //                                         "cancelled",

            //                                         {
            //                                             $switch:
            //                                                 {
            //                                                     branches:
            //                                                         [
            //                                                             {
            //                                                                 case: {
            //                                                                     $gt: [
            //                                                                         "$$auctionItem.startDate",
            //                                                                         "$$NOW",
            //                                                                     ],
            //                                                                 },

            //                                                                 then: "upcoming",
            //                                                             },

            //                                                             {
            //                                                                 case: {
            //                                                                     $lt: [
            //                                                                         "$$NOW",
            //                                                                         {
            //                                                                             $dateAdd:
            //                                                                                 {
            //                                                                                     startDate:
            //                                                                                         "$$auctionItem.startDate",
            //                                                                                     unit: "day",
            //                                                                                     amount:
            //                                                                                         "$$auctionItem.duration",
            //                                                                                 },
            //                                                                         },
            //                                                                     ],
            //                                                                 },

            //                                                                 then: "live",
            //                                                             },
            //                                                         ],

            //                                                     default:
            //                                                         "completed",
            //                                                 },
            //                                         },
            //                                     ],
            //                                 },
            //                         },
            //                     ],
            //                 },
            //             },
            //         },
            //     },
            // },
        ];

        // ==================================================
        // 5. AUCTION STATUS FILTER
        // ==================================================
        if (filterQuery.status) {
            const auctionStatuses =
                filterQuery.status
                    .split(",")
                    .map(
                        (item: string) =>
                            item
                                .trim()
                                .toLowerCase()
                    )
                    .filter(Boolean);

            if (
                auctionStatuses.length > 0
            ) {
                pipeline.push({
                    $match: {
                        auction: {
                            $elemMatch: {
                                calculatedStatus:
                                    {
                                        $in: auctionStatuses,
                                    },
                            },
                        },
                    },
                });
            }
        }

        // ==================================================
        // 6. GET HIGHEST BID FOR EACH AUCTION
        // ==================================================
        pipeline.push({
            $lookup: {
                from: "auctionbids",

                let: {
                    bookId: "$_id",
                },

                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $eq: [
                                    "$bookId",
                                    "$$bookId",
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
                        $group: {
                            _id: "$auctionId",

                            highestBid: {
                                $first:
                                    "$$ROOT",
                            },

                            bidCount: {
                                $sum: 1,
                            },
                        },
                    },

                    // Get bidder
                    {
                        $lookup: {
                            from: "users",

                            localField:
                                "highestBid.userId",

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
                            _id: 0,

                            auctionId:
                                "$_id",

                            bidPrice:
                                "$highestBid.bidPrice",

                            highestBid: {
                                _id:
                                    "$highestBid._id",

                                bidPrice:
                                    "$highestBid.bidPrice",

                                userId:
                                    "$highestBid.userId",

                                createdAt:
                                    "$highestBid.createdAt",
                            },

                            highestBidder: {
                                _id: "$bidder._id",
                                name: "$bidder.name",
                                email: "$bidder.email",
                                phone: "$bidder.phone",
                                profileImage:
                                    "$bidder.profileImage",
                            },

                            bidCount: 1,
                        },
                    },
                ],

                as: "auctionBidDetails",
            },
        });

        // ==================================================
        // 7. GET ORDERS FOR AUCTIONS
        // ==================================================
        pipeline.push({
            $lookup: {
                from: "orders",

                let: {
                    bookId: "$_id",
                },

                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    {
                                        $eq: [
                                            "$orderType",
                                            "auction",
                                        ],
                                    },

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
                ],

                as: "auctionOrderDetails",
            },
        });

        // ==================================================
        // 8. BUILD FINAL AUCTION ARRAY
        // ==================================================
        pipeline.push({
            $addFields: {
                auction: {
                    $map: {
                        input: "$auction",
                        as: "auctionItem",

                        in: {
                            $let: {
                                vars: {
                                    bidInfo: {
                                        $arrayElemAt: [
                                            {
                                                $filter:
                                                    {
                                                        input:
                                                            "$auctionBidDetails",

                                                        as: "bid",

                                                        cond: {
                                                            $eq: [
                                                                "$$bid.auctionId",
                                                                "$$auctionItem._id",
                                                            ],
                                                        },
                                                    },
                                            },

                                            0,
                                        ],
                                    },

                                    orderInfo: {
                                        $arrayElemAt: [
                                            {
                                                $filter:
                                                    {
                                                        input:
                                                            "$auctionOrderDetails",

                                                        as: "order",

                                                        cond: {
                                                            $eq: [
                                                                "$$order.auctionDetails.auctionId",
                                                                "$$auctionItem._id",
                                                            ],
                                                        },
                                                    },
                                            },

                                            0,
                                        ],
                                    },
                                },

                                in: {
                                    $mergeObjects: [
                                        "$$auctionItem",

                                        {
                                            status:
                                                "$$auctionItem.calculatedStatus",

                                            currentBidPrice:
                                                {
                                                    $ifNull: [
                                                        "$$bidInfo.bidPrice",
                                                        "$$auctionItem.bidPrice",
                                                    ],
                                                },

                                            highestBid:
                                                "$$bidInfo.highestBid",

                                            highestBidder:
                                                "$$bidInfo.highestBidder",

                                            bidCount:
                                                {
                                                    $ifNull: [
                                                        "$$bidInfo.bidCount",
                                                        0,
                                                    ],
                                                },

                                            order:
                                                "$$orderInfo",
                                        },
                                    ],
                                },
                            },
                        },
                    },
                },
            },
        });

        // ==================================================
        // 9. BOOK LEVEL FIELDS
        // ==================================================
        pipeline.push({
            $addFields: {
                category: {
                    id: "$category._id",
                    name: "$category.name",
                },

                /*
                 * Book.auctionId is the current/latest auction.
                 *
                 * The auction array contains the complete
                 * auction history.
                 *
                 * Therefore book-level availability should
                 * use the current auction only.
                 */
                currentAuction: {
                    $arrayElemAt: [
                        {
                            $filter: {
                                input: "$auction",
                                as: "auctionItem",

                                cond: {
                                    $eq: [
                                        "$$auctionItem._id",
                                        "$auctionId",
                                    ],
                                },
                            },
                        },

                        0,
                    ],
                },
            },
        });

        // ==================================================
        // 10. BOOK STATUS / AVAILABILITY
        // ==================================================
        pipeline.push({
            $addFields: {
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
                                        "$currentAuction.status",
                                        "completed",
                                    ],
                                },

                                {
                                    $ne: [
                                        "$currentAuction.order",
                                        null,
                                    ],
                                },
                            ],
                        },

                        "inactive",

                        "$status",
                    ],
                },

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
                                        "$currentAuction.status",
                                        "completed",
                                    ],
                                },

                                {
                                    $ne: [
                                        "$currentAuction.order",
                                        null,
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
                                        "$currentAuction.status",
                                        "completed",
                                    ],
                                },

                                {
                                    $ne: [
                                        "$currentAuction.order",
                                        null,
                                    ],
                                },
                            ],
                        },

                        "unavailable",

                        "$availabilityStatus",
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
                                        "$currentAuction.status",
                                        "completed",
                                    ],
                                },

                                {
                                    $ne: [
                                        "$currentAuction.order",
                                        null,
                                    ],
                                },
                            ],
                        },

                        false,

                        "$isAvailable",
                    ],
                },

                /*
                 * Cancelled auction:
                 * book becomes available for rent again.
                 */
                availableForRent: {
                    $cond: [
                        {
                            $eq: [
                                "$currentAuction.status",
                                "cancelled",
                            ],
                        },

                        true,

                        {
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
                    ],
                },

                /*
                 * Cancelled auction:
                 * preserve the book's original sale setting.
                 */
                availableForSale: {
                    $cond: [
                        {
                            $eq: [
                                "$currentAuction.status",
                                "cancelled",
                            ],
                        },

                        "$availableForSale",

                        {
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
                                                "$currentAuction.status",
                                                "completed",
                                            ],
                                        },

                                        {
                                            $ne: [
                                                "$currentAuction.order",
                                                null,
                                            ],
                                        },
                                    ],
                                },

                                false,

                                {
                                    $cond: [
                                        {
                                            $eq: [
                                                "$isAuction",
                                                true,
                                            ],
                                        },

                                        false,

                                        "$availableForSale",
                                    ],
                                },
                            ],
                        },
                    ],
                },
            },
        });

        // ==================================================
        // 11. REMOVE INTERNAL FIELDS
        // ==================================================
        pipeline.push({
            $project: {
                __v: 0,

                categoryId: 0,

                auctionBidDetails: 0,

                auctionOrderDetails: 0,

                currentAuction: 0,

                "category.__v": 0,
                "category.createdAt": 0,
                "category.updatedAt": 0,

                "auction.calculatedStatus": 0,
                "auction.__v": 0,
                "auction.updatedAt": 0,
            },
        });

        // ==================================================
        // 12. SORT
        // ==================================================
        pipeline.push({
            $sort: sortOption,
        });

        // ==================================================
        // 13. PAGINATION
        // ==================================================
        pipeline.push(
            {
                $skip: skip,
            },
            {
                $limit: limitNum,
            }
        );

        return pipeline;
    };

// ==================================================
// BOOK COUNT AGGREGATION PIPELINE
// ==================================================

export const buildBookCountAggregationPipeline =
    async (
        filterQuery: any
    ): Promise<PipelineStage[]> => {
        const filter =
            await buildFilter(
                filterQuery
            );

        const pipeline: PipelineStage[] = [
            // ==================================================
            // 1. BOOK FILTER
            // ==================================================
            {
                $match: filter,
            },

            // ==================================================
            // 2. GET ALL AUCTIONS
            // ==================================================
            {
                $lookup: {
                    from: "auctions",

                    localField: "_id",

                    foreignField: "bookId",

                    as: "auction",
                },
            },

            // ==================================================
            // 3. CALCULATE STATUS FOR EACH AUCTION
            // ==================================================
            {
                $addFields: {
                    auction: {
                        $map: {
                            input: "$auction",
                            as: "auctionItem",

                            in: {
                                $mergeObjects: [
                                    "$$auctionItem",

                                    {
                                        calculatedStatus:
                                            {
                                                $cond: [
                                                    {
                                                        $eq: [
                                                            "$$auctionItem.isActive",
                                                            false,
                                                        ],
                                                    },

                                                    "cancelled",

                                                    {
                                                        $switch:
                                                            {
                                                                branches:
                                                                    [
                                                                        {
                                                                            case: {
                                                                                $gt: [
                                                                                    "$$auctionItem.startDate",
                                                                                    "$$NOW",
                                                                                ],
                                                                            },

                                                                            then: "upcoming",
                                                                        },

                                                                        {
                                                                            case: {
                                                                                $lt: [
                                                                                    "$$NOW",
                                                                                    {
                                                                                        $dateAdd:
                                                                                            {
                                                                                                startDate:
                                                                                                    "$$auctionItem.startDate",
                                                                                                unit: "day",
                                                                                                amount:
                                                                                                    "$$auctionItem.duration",
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
                                ],
                            },
                        },
                    },
                },
            },
        ];

        // ==================================================
        // 4. STATUS FILTER
        // ==================================================
        if (filterQuery.status) {
            const auctionStatuses =
                filterQuery.status
                    .split(",")
                    .map(
                        (item: string) =>
                            item
                                .trim()
                                .toLowerCase()
                    )
                    .filter(Boolean);

            if (
                auctionStatuses.length > 0
            ) {
                pipeline.push({
                    $match: {
                        auction: {
                            $elemMatch: {
                                calculatedStatus:
                                    {
                                        $in: auctionStatuses,
                                    },
                            },
                        },
                    },
                });
            }
        }

        // ==================================================
        // 5. COUNT UNIQUE BOOKS
        // ==================================================
        pipeline.push({
            $count: "totalCount",
        });

        return pipeline;
    };
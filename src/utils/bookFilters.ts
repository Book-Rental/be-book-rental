import mongoose, { FilterQuery, Types } from 'mongoose';
import { IBook } from '../models/Book';

// Function to build the filter object
export const buildFilter = async (query: any): Promise<FilterQuery<IBook>> => {
  const filter: FilterQuery<IBook> = {};
  try {
    const { categoryID, name, minPrice, maxPrice, isPopular } = query;

    console.log("category, name, minPrice, maxPrice, isPopular :::", categoryID, name, minPrice, maxPrice, isPopular);

    if (categoryID && Types.ObjectId.isValid(categoryID)) {
      filter.categoryId = new Types.ObjectId(categoryID);
    }

    if (name) {
      let queryName = name.replace(/%(?![0-9A-Fa-f]{2})/g, '%25');
      queryName = decodeURIComponent(queryName);
      filter.name = { $regex: queryName, $options: 'i' };
    }

    // Filter by book purchase price range
    if (minPrice || maxPrice) {
      filter.purchasePrice = {};
      if (minPrice) filter.purchasePrice.$gte = parseFloat(minPrice as string);
      if (maxPrice) filter.purchasePrice.$lte = parseFloat(maxPrice as string);
    }

    // Is Popular 
    if (isPopular) {
      filter.isPopular = (isPopular === "true");
    }

    console.log('filter', filter);
    return filter;

  } catch (err) {
    console.log('Filter Query Err', err);
    return filter;
  }
};

// Function to get sort option
export const getSortOption = (sortBy: string | undefined): { [key: string]: 1 | -1 } => {
  switch (sortBy) {
    case 'priceLowToHigh':
      return { purchasePrice: 1 };
    case 'priceHighToLow':
      return { purchasePrice: -1 };
    case 'nameAToZ':
      return { name: 1 };
    case 'nameZToA':
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
        from: 'categories',
        localField: 'categoryId',
        foreignField: '_id',
        as: 'categoryDetails',
      },
    },

    { $unwind: { path: '$categoryDetails', preserveNullAndEmptyArrays: true } },

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
        createdAt: 1,
        category: {
          id: '$categoryDetails._id',
          name: '$categoryDetails.name',
          description: '$categoryDetails.description',
        }
      },
    },

    { $sort: sortOption },
    { $skip: skip },
    { $limit: limitNum },
  ];
};

export const buildWishlistBooksAggregationPipeline = (
  filter: any,
  page: number,
  limit: number,
) => {
  const skip = (page - 1) * limit;

  return [
    { $match: filter },
    {
      $project: {
        name: 1,
        items: 1,
      },
    },
    { $unwind: "$items" },
    {
      $lookup: {
        from: "books",
        localField: "items.bookId",
        foreignField: "_id",
        as: "book",
      },
    },
    { $unwind: "$book" },
    {
      $project: {
        wishlistName: "$name",
        _id: "$book._id",
        name: "$book.name",
        description: "$book.description",
        price: "$book.purchasePrice",
        coverImage: "$book.coverImage",
        author: "$book.author",
      },
    },
    { $skip: skip },
    { $limit: limit },
  ];
};
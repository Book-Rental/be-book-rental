import Auction, { AuctionStatus } from "../models/Auction";

export const updateAuctionStatuses = async () => {
  try {
    const now = new Date();

    await Auction.updateMany(
      {
        status: AuctionStatus.UPCOMING,
        startDate: { $lte: now },
      },
      {
        $set: { status: AuctionStatus.LIVE },
      }
    );

    await Auction.updateMany(
      {
        status: AuctionStatus.LIVE,
        $expr: {
          $lte: [
            {
              $dateAdd: {
                startDate: "$startDate",
                unit: "day",
                amount: "$duration",
              },
            },
            now,
          ],
        },
      },
      {
        $set: { status: AuctionStatus.COMPLETED },
      }
    );

    console.log("Auction statuses updated successfully");
  } catch (error) {
    console.error("Error updating auction statuses:", error);
  }
};
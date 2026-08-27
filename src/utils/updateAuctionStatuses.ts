import Auction, { AuctionStatus } from "../models/Auction";


export const updateAuctionStatuses = async () => {
    try {
        const now = new Date();

        // 1. UPCOMING → LIVE
        await Auction.updateMany(
            {
                status: AuctionStatus.UPCOMING,
                startDate: { $lte: now },
            },
            {
                $set: {
                    status: AuctionStatus.LIVE,
                },
            }
        );

        // 2. LIVE → COMPLETED
        const liveAuctions = await Auction.find({
            status: AuctionStatus.LIVE,
        });

        for (const auction of liveAuctions) {
            const endTime =
                new Date(auction.startDate).getTime() +
                auction.duration * 60 * 1000; // duration in minutes

            if (now.getTime() >= endTime) {
                await Auction.updateOne(
                    { _id: auction._id },
                    {
                        $set: {
                            status: AuctionStatus.COMPLETED,
                        },
                    }
                );
            }
        }

        console.log("Auction statuses updated successfully");
    } catch (error) {
        console.error("Error updating auction statuses:", error);
    }
};
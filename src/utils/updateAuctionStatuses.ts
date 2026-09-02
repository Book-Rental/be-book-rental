// import Auction, { AuctionStatus } from "../models/Auction";

// export const updateAuctionStatuses = async () => {
//   try {
//     const now = new Date();

//     const auctions = await Auction.find({
//       status: {
//         $in: [AuctionStatus.UPCOMING, AuctionStatus.LIVE],
//       },
//     });

//     const bulkOperations = [];

//     for (const auction of auctions) {
//       const startDate = new Date(auction.startDate);

//       const endDate = new Date(startDate);
//       endDate.setDate(endDate.getDate() + Number(auction.duration));

//       let newStatus: AuctionStatus | null = null;

//       // Auction has already ended
//       if (now >= endDate) {
//         newStatus = AuctionStatus.COMPLETED;
//       }

//       // Auction should currently be live
//       else if (now >= startDate) {
//         newStatus = AuctionStatus.LIVE;
//       }

//       // Still upcoming
//       else {
//         newStatus = AuctionStatus.UPCOMING;
//       }

//       if (auction.status !== newStatus) {
//         bulkOperations.push({
//           updateOne: {
//             filter: {
//               _id: auction._id,
//             },
//             update: {
//               $set: {
//                 status: newStatus,
//               },
//             },
//           },
//         });
//       }
//     }

//     if (bulkOperations.length > 0) {
//       await Auction.bulkWrite(bulkOperations);
//     }

//     console.log(
//       `Auction statuses updated successfully. Updated: ${bulkOperations.length}`
//     );
//   } catch (error) {
//     console.error("Error updating auction statuses:", error);
//   }
// };
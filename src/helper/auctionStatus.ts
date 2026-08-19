import { AuctionStatus } from "../models/Auction";

export const calculateAuctionStatus = (
  startDate: Date | string,
  duration: number
): AuctionStatus => {
  const now = new Date();
  const start = new Date(startDate);

  if (now < start) {
    return AuctionStatus.UPCOMING;
  }
  const end = new Date(start);
  end.setDate(end.getDate() + duration);

  if (now < end) {
    return AuctionStatus.LIVE;
  }
  return AuctionStatus.COMPLETED;
};
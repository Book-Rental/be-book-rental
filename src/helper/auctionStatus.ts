export enum AuctionStatus {
    UPCOMING = "upcoming",
    LIVE = "live",
    COMPLETED = "completed",
    CANCELLED = "cancelled",
}

export const calculateAuctionStatus = (
    startDate: Date | string,
    duration: number
): AuctionStatus => {
    const now = new Date();

    const start = new Date(startDate);

    const end = new Date(start);

    end.setDate(
        end.getDate() + Number(duration)
    );

    if (now < start) {
        return AuctionStatus.UPCOMING;
    }

    if (now < end) {
        return AuctionStatus.LIVE;
    }

    return AuctionStatus.COMPLETED;
};

export const getAuctionStatus = (
    isActive: boolean,
    startDate: Date | string,
    duration: number
): AuctionStatus => {
    if (isActive === false) {
        return AuctionStatus.CANCELLED;
    }

    return calculateAuctionStatus(
        startDate,
        duration
    );
};
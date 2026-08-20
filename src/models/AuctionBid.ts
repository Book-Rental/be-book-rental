import { model, Schema } from "mongoose";

export interface IAuctionBid {
    auctionId: Schema.Types.ObjectId;
    bookId: Schema.Types.ObjectId;
    userId: Schema.Types.ObjectId;
    bidPrice: number;
    createdAt: Date;
    updatedAt: Date;
}

const auctionBidSchema = new Schema<IAuctionBid>(
    {
        auctionId: {
            type: Schema.Types.ObjectId,
            ref: "Auction",
            required: true,
            index: true,
        },

        bookId: {
            type: Schema.Types.ObjectId,
            ref: "Book",
            required: true,
        },

        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        bidPrice: {
            type: Number,
            required: true,
            min: 0,
        },
    },
    {
        timestamps: true,
    }
);

const AuctionBid = model<IAuctionBid>(
    "AuctionBid",
    auctionBidSchema
);

export default AuctionBid;
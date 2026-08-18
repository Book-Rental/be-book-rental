import { Schema, model } from "mongoose";
import { IAuction } from "./interfaces";

const auctionSchema = new Schema<IAuction>(
    {
        bookId: {
            type: Schema.Types.ObjectId,
            ref: "Book",
            required: true,
        },
        bidPrice: {
            type: Number,
            required: true,
            min: 0,
        },

        buyNowPrice: {
            type: Number,
            min: 0,
        },

        duration: {
            type: Number,
            required: true,
            min: 1,
        },

        startDate: {
            type: Date,
            required: true,
        },
    },
    {
        _id: true,
        timestamps: true,
    }
);

auctionSchema.index({ bookId: 1 });

const Auction = model<IAuction>("Auction", auctionSchema);

export default Auction;
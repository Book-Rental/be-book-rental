import { Schema, model } from "mongoose";

import { IAuction } from "./interfaces";
import { AuctionStatus } from "../helper/auctionStatus";

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

        isActive: {
            type: Boolean,
            default: true,
        },

        status: {
            type: String,
            enum: Object.values(AuctionStatus),
            default: AuctionStatus.UPCOMING,
        },
    },
    {
        _id: true,
        timestamps: true,
    }
);

auctionSchema.index({ bookId: 1 });

const Auction = model<IAuction>(
    "Auction",
    auctionSchema
);

export default Auction;
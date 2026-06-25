import { model, Schema } from "mongoose";
import { IBasicFields } from "./interfaces";
import mongoose from "mongoose";

interface Image {
    url: string;
    altText: string;
}

export interface IBook extends IBasicFields {
    name: string;
    description: string;
    categoryId: mongoose.Types.ObjectId;
    language: string;
    author: string;
    edition?: string;
    coverImage?: string;
    purchasePrice?: number;
    rentalPricePerDay: number;
    rentalPricePerWeek: number;
    rentalPricePerMonth: number;
    securityDeposit: number;
    availableForSale: boolean;
    availableForRent: boolean;
    availabilityStatus: "available" | "rented_out" | "sold" | "maintenance";
    sellerId: mongoose.Types.ObjectId;
    listingType: "sale" | "rent" | "both";
    condition: "new" | "used" | "like new" | "refurbished";
    numberOfPages?: number;
    publicationDate?: Date;
    isPopular?: boolean;
    images?: Image[];
}

const bookSchema = new Schema<IBook>(
    {
        name: {
            required: true,
            type: String
        },
        description: {
            required: true,
            type: String
        },
        categoryId: {
            required: true,
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category'
        },
        language: {
            required: true,
            type: String
        },
        author: {
            required: true,
            type: String
        },
        edition: {
            type: String
        },
        coverImage: {
            type: String
        },
        purchasePrice: {

            type: Number
        },
        rentalPricePerDay: {
            required: true,
            type: Number
        },
        rentalPricePerWeek: {
            required: true,
            type: Number
        },
        rentalPricePerMonth: {
            required: true,
            type: Number
        },
        securityDeposit: {
            required: true,
            type: Number
        },
        availableForSale: {
            required: true,
            type: Boolean
        },
        availableForRent: {
            required: true,
            type: Boolean
        },
        availabilityStatus: {
            type: String,
            required: true,
            enum: ["available", "rented_out", "sold", "maintenance"],
            default: "available"
        },
        sellerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        listingType: {
            required: true,
            type: String,
            enum: ['sale', 'rent', 'both']
        },
        condition: {
            required: true,
            type: String,
            enum: ['new', 'used', 'like new', 'refurbished']
        },
        numberOfPages: {
            type: Number
        },
        publicationDate: {
            type: Date
        },
        isPopular: {
            type: Boolean,
            default: false
        },
        images: [
            {
                url: { type: String, required: true },
                altText: { type: String, required: true },
            },
        ],
        isActive: {
            type: Boolean,
            default: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        updatedAt: {
            type: Date,
            default: Date.now
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User"
        },
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: "User"
        },
        status: {
            type: String,
            default: "active"
        },
        version: {
            type: Number,
            default: 1
        }
    },
)
const Book = model<IBook>("Book", bookSchema);

export default Book;

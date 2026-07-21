import mongoose, { Schema, Document } from "mongoose";

export interface IOtp extends Document {
    email: string;
    otp: string;
    expiresAt: Date;
    verified: boolean;
}

const otpSchema = new Schema<IOtp>(
    {
        email: {
            type: String,
            required: true,
        },
        otp: {
            type: String,
            required: true,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
        verified: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

const Otp = mongoose.model<IOtp>("Otp", otpSchema);

export default Otp;
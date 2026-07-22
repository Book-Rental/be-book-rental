import Otp from "../models/Otp";
import crypto from "crypto";

export const generateOtp = (): string => {
    return crypto.randomInt(100000, 1000000).toString();
};

export const saveOtp = async (email: string, otp: string) => {
    await Otp.deleteMany({ email });
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const otpData = new Otp({
        email,
        otp,
        expiresAt,
        verified: false,
    });

    return await otpData.save();
};

export const verifyOtp = async (email: string, otp: string): Promise<boolean> => {
    const otpRecord = await Otp.findOne({ email });

    if (!otpRecord) {
        return false;
    }

    if (otpRecord.expiresAt < new Date()) {
        await Otp.deleteOne({ email });
        return false;
    }

    if (otpRecord.otp !== otp) {
        return false;
    }

    otpRecord.verified = true;
    await otpRecord.save();

    return true;
};

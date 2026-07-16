import mongoose, { Schema, model } from "mongoose";
import bcrypt from "bcrypt";
import { IUser, Status, UserType } from "./interfaces";

/**
 * GeoJSON Location Schema
 */
const locationSchema = new Schema(
    {
        type: {
            type: String,
            enum: ["Point"],
            required: true,
            default: "Point",
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true,
            validate: {
                validator: function (value: number[]) {
                    return (
                        Array.isArray(value) &&
                        value.length === 2 &&
                        typeof value[0] === "number" &&
                        typeof value[1] === "number"
                    );
                },
                message: "Coordinates must contain exactly [longitude, latitude].",
            },
        },
    },
    {
        _id: false,
    }
);

/**
 * Address Schema
 */
const addressSchema = new Schema(
    {
        name: {
            type: String,
            trim: true,
        },

        type: {
            type: String,
            enum: ["home", "work", "other"],
            default: "home",
        },

        street: {
            type: String,
            required: true,
            trim: true,
        },

        city: {
            type: String,
            required: true,
            trim: true,
        },

        state: {
            type: String,
            required: true,
            trim: true,
        },

        zipCode: {
            type: String,
            required: true,
            trim: true,
        },

        country: {
            type: String,
            required: true,
            trim: true,
        },

        phone: {
            type: String,
            required: true,
            minlength: 10,
            maxlength: 15,
            validate: {
                validator: function (value: string) {
                    return /^\d+$/.test(value);
                },
                message: "Phone number should contain only digits.",
            },
        },

        location: {
            type: locationSchema,
            required: true,
        },

        isDefault: {
            type: Boolean,
            default: false,
        },
    },
    {
        _id: true,
        timestamps: true,
    }
);

/**
 * User Schema
 */
const userSchema = new Schema<IUser>(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        firstName: {
            type: String,
            required: true,
            trim: true,
        },

        lastName: {
            type: String,
            required: true,
            trim: true,
        },

        password: {
            type: String,
            required: true,
        },

        userType: {
            type: String,
            enum: Object.values(UserType),
            default: UserType.CUSTOMER,
            required: true,
        },

        profilePic: {
            type: String,
        },

        addresses: {
            type: [addressSchema],
            default: [],
        },

        isVerified: {
            type: Boolean,
            default: false,
        },

        tokenCreatedAt: {
            type: Date,
        },

        hashedToken: {
            type: String,
            default: null,
        },

        status: {
            type: String,
            enum: Object.values(Status),
            default: Status.Active,
        },

        version: {
            type: Number,
            default: 1,
        },

        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },

        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },

        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

/**
 * Geo Index
 */
userSchema.index({
    "addresses.location": "2dsphere",
});

/**
 * Hash password before save
 */
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    const saltRounds = Number(process.env.PASSWORD_SALT) || 10;

    this.password = await bcrypt.hash(this.password, saltRounds);

    next();
});

/**
 * Hash password before update
 */
userSchema.pre(["findOneAndUpdate", "updateOne"], async function (next) {
    const update: any = this.getUpdate();

    if (update?.$set?.password) {
        const saltRounds = Number(process.env.PASSWORD_SALT) || 10;

        update.$set.password = await bcrypt.hash(update.$set.password, saltRounds);
    }

    this.set({
        updatedAt: new Date(),
    });

    next();
});

const User = model<IUser>("User", userSchema);

export default User;

import mongoose, { Schema, model } from "mongoose";
import { IUser, Status, UserType } from "./interfaces";

const bcrypt = require('bcrypt');

const addressSchema = new Schema(
  {
    // optional label + type for UI
    name: { type: String, required: false },
    type: {
      type: String,
      enum: ["home", "work", "other"],
      default: "home",
    },

    // Map your interface fields
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true }, // interface zipCode
    country: { type: String, required: true },

    // GeoJSON location
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
        default: "Point",
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
      },
    },

    phone: {
      type: String,
      required: true,
      minlength: [10, "Phone number must be at least 10 digits long"],
      maxlength: [15, "Phone number cannot exceed 15 digits"],
      validate: {
        validator: function (v: string) {
          return /^\d+$/.test(v);
        },
        message: (props: any) =>
          `${props?.value} is not a valid phone number! Phone number should contain only digits.`,
      },
    },

    isDefault: { type: Boolean, default: false },
  },
  { _id: false }
);


const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
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

    profilePic: String,

    addresses: {
      type: [addressSchema],
      default: [],
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    tokenCreatedAt: Date,

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

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next(); // Skip if password is not modified
  const saltRounds = +`${process.env.PASSWORD_SALT}`;
  this.password = await bcrypt.hash(this.password, saltRounds);
  next();
});

userSchema.pre(['findOneAndUpdate', 'updateOne'], async function (next) {
  const update = this.getUpdate() as any;
  const password = update?.$set?.password;
  if (password) {
    const salt = await bcrypt.genSalt(+`${process.env.PASSWORD_SALT}`);
    const hashedPassword = await bcrypt.hash(password, salt);
    this.set({ password: hashedPassword });
  }
  this.set({ updatedAt: new Date() });
  next();
});

const User = model<IUser>("User", userSchema);

export default User;
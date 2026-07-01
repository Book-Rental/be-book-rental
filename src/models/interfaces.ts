import { Types } from "mongoose";

export interface IBasicFields {
  isActive: boolean;
  createdAt: Date;
  createdBy?: Types.ObjectId;
  updatedAt: Date;
  updatedBy?: Types.ObjectId;
  status: string;
  version: number;
}

export interface BasicQueryFields {
  search?: string;
  page?: number;
  limit?: number;
  userType?: string;
  status?: string;
}

export interface IUserAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;

  location: {
    type: "Point";
    coordinates: [number, number];
  };

  isDefault?: boolean;
}

export enum UserType {
  CUSTOMER = "customer",
  ADMIN = "admin",
}

export enum Status {
  Active = "active",
  InActive = "inactive",
  Deleted = "deleted",
}

export interface IUser extends IBasicFields {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  userType: UserType;
  profilePic?: string;
  isVerified: boolean;
  verificationToken?: string | null;
  tokenCreatedAt?: Date;
  hashedToken?: string | null;
  addresses: IUserAddress[];
}


export interface ICategory {
  name: string;
  description?: string;
  isActive: boolean;
  isPopular: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
}

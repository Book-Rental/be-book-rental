import { Document, Types } from "mongoose";
import { OrderStatus, PaymentStatus, PaymentMethod, DepositStatus } from "../models/Order";

/* ---------------- Address ---------------- */

export interface IAddress {
    name: string;
    phone: string;
    type: "home" | "work" | "other";
    addressLine1: string;
    addressLine2?: string;
    landmark?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
}

/* ---------------- Rental ---------------- */

export interface IRental {
    rentalPrice: number;
    securityDeposit: number;
    rentalDuration: number;
    rentStartDate: Date;
    expectedReturnDate: Date;
    actualReturnDate?: Date | null;
    extensionCount: number;
    maximumExtensions: number;
    extendedUntil?: Date | null;
    lateFee: number;
}

/* ---------------- Deposit ---------------- */

export interface IDeposit {
    amount: number;
    status: DepositStatus;
    refundedAmount: number;
    deductionAmount: number;
    deductionReason?: string;
    refundedDate?: Date | null;
}

/* ---------------- Order Item ---------------- */

export interface IOrderItem {
    bookId: Types.ObjectId;
    sellerId: Types.ObjectId;
    quantity: number;
    itemStatus: OrderStatus;
    rental: IRental;
    deposit: IDeposit;
}

/* ---------------- Payment ---------------- */

export interface IPayment {
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    transactionId: string | null;
    paidAt?: Date | null;
}

/* ---------------- Amount ---------------- */

export interface IAmount {
    rentalAmount: number;
    securityDeposit: number;
    deliveryFee: number;
    discount: number;
    tax: number;
    totalAmount: number;
    refundAmount: number;
}

/* ---------------- Order ---------------- */

export interface IOrder extends Document {
    orderNumber: string;

    userId: Types.ObjectId;

    items: IOrderItem[];

    shippingAddress: IAddress;

    billingAddress: IAddress;

    payment: IPayment;

    amount: IAmount;

    orderStatus: OrderStatus;

    createdBy?: Types.ObjectId;

    updatedBy?: Types.ObjectId;

    isActive: boolean;

    createdAt: Date;

    updatedAt: Date;
}

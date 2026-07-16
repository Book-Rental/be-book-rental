import { Document, Types } from "mongoose";
import { OrderStatus, OrderType, PaymentStatus } from "../models/Order";

export interface IAddressSnapshot {
    name?: string;
    type?: "home" | "work" | "other";
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone: string;
}

export interface IOrderItem {
    bookId: Types.ObjectId;
    sellerId: Types.ObjectId;

    orderType: OrderType;

    quantity: number;

    purchasePrice: number;

    rentalPrice: number;

    rentalDuration: number;

    securityDeposit: number;

    rentStartDate?: Date;

    expectedReturnDate?: Date;

    actualReturnDate?: Date;

    lateFee: number;
}

export interface IOrder extends Document {
    orderNumber: string;

    customerId: Types.ObjectId;

    items: IOrderItem[];

    deliveryAddress: IAddressSnapshot;

    subtotal: number;

    deliveryCharge: number;

    discount: number;

    tax: number;

    totalAmount: number;

    paymentMethod: "COD" | "UPI" | "CARD" | "NET_BANKING";

    paymentStatus: PaymentStatus;

    transactionId?: string | null;

    orderStatus: OrderStatus;

    cancellationReason?: string;

    notes?: string;

    createdBy?: Types.ObjectId;

    updatedBy?: Types.ObjectId;

    isActive: boolean;

    createdAt: Date;

    updatedAt: Date;
}

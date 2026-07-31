import axios from "axios";
import User from "../models/User";
import Book from "../models/Book";
import { PaymentMethod } from "../utils/constants";
import { IUserAddress } from "../models/interfaces";

export enum PaymentMode {
    PREPAID = "Prepaid",
    COD = "COD",
}

export const createShipmentFromOrder = async (
    order: any,
    item: any
) => {
    // Get Seller
    const seller = await User.findById(item.sellerId);

    if (!seller) {
        throw new Error("Seller not found.");
    }

    // Get Buyer
    const buyer = await User.findById(order.userId);

    if (!buyer) {
        throw new Error("Buyer not found.");
    }

    // Get Book
    const book = await Book.findById(item.bookId);

    if (!book) {
        throw new Error("Book not found.");
    }

    // Seller Address
    const sellerAddress =
        seller.addresses.find(
            (address: IUserAddress) => address.isSellerAddress
        ) ??
        seller.addresses.find(
            (address: IUserAddress) => address.isDefault
        ) ??
        seller.addresses[0];

    if (!sellerAddress) {
        throw new Error("Seller address not found.");
    }

    const shipmentPayload = {
        orderId: order._id,

        orderItemId: item._id,

        bookId: item.bookId,

        sellerId: item.sellerId,

        buyerId: order.userId,

        sender: {
            name: seller.firstName,
            phone: sellerAddress.phone,
            email: seller.email,

            addressLine1: sellerAddress.street,
            city: sellerAddress.city,
            state: sellerAddress.state,
            pincode: sellerAddress.zipCode,
            country: sellerAddress.country,

            location: {
                type: sellerAddress.location.type,
                coordinates: sellerAddress.location.coordinates,
            },
        },

        receiver: {
            name: order.shippingAddress.name,
            phone: order.shippingAddress.phone,

            addressLine1: order.shippingAddress.street,
            city: order.shippingAddress.city,
            state: order.shippingAddress.state,
            pincode: order.shippingAddress.zipCode,
            country: order.shippingAddress.country,

            location: {
                type: order.shippingAddress.location.type,
                coordinates: order.shippingAddress.location.coordinates,
            },
        },

        paymentMode:
            order.payment.paymentMethod === PaymentMethod.COD
                ? PaymentMode.COD
                : PaymentMode.PREPAID,

        codAmount:
            order.payment.paymentMethod === PaymentMethod.COD
                ? order.amount.totalAmount
                : 0,

        expectedDeliveryDate: new Date("2026-08-06T00:00:00.000Z"),

        createdBy: order.userId.toString(),
    };

    await axios.post(
        `${process.env.LOGISTICS_SERVICE_URL}/api/shipment/create`,
        shipmentPayload
    );
};
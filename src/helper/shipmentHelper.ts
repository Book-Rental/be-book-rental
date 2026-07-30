import axios from "axios";
import User from "../models/User";
import Book from "../models/Book";
import { IOrder } from "../models/orderInteface";
import { PaymentMethod } from "../utils/constants";
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
    const defaultAddress =
        seller.addresses.find((address: any) => address.isDefault) ??
        seller.addresses[0];

    console.log('dataaaaaaa', seller, buyer, book)
    const shipmentPayload = {
        orderId: order._id,

        orderItemId: item._id,

        bookId: item.bookId,

        sellerId: item.sellerId,

        buyerId: order.userId,

        // Static Seller Address (Temporary)
        sender: {
            name: "Test Seller",
            phone: "9876543210",
            email: "seller@test.com",

            addressLine1: "Madhapur, Hitech City",
            city: "Hyderabad",
            state: "Telangana",
            pincode: "500042",
            country: "India",
        },

        receiver: {
            name: order.shippingAddress.name,
            phone: order.shippingAddress.phone,

            addressLine1: order.shippingAddress.street,
            city: order.shippingAddress.city,
            state: order.shippingAddress.state,
            pincode: "560001",
            country: order.shippingAddress.country,
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
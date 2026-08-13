import axios from "axios";
import User from "../models/User";
import Book from "../models/Book";
import { PaymentMethod } from "../utils/constants";
import { IUserAddress } from "../models/interfaces";
import { StatusCode } from "../utils/StatusCodes";

export enum PaymentMode {
    PREPAID = "Prepaid",
    COD = "COD",
}

export const createShipmentFromOrder = async (
    order: any,
    item: any
) => {
    // 1. Get Seller with specific select parameters to keep response objects lean
    const seller = await User.findById(item.sellerId).lean();
    if (!seller) {
        throw new Error("Seller profile context record not found.");
    }

    // 2. Get Buyer
    const buyer = await User.findById(order.userId).lean();
    if (!buyer) {
        throw new Error("Buyer profile context record not found.");
    }

    // 3. Get Book
    const book = await Book.findById(item.bookId).lean();
    if (!book) {
        throw new Error("Book instance database context not found.");
    }

    // 4. Fallback lookup tree logic evaluating valid Seller address components
    const sellerAddress =
        seller.addresses?.find((address: IUserAddress) => address.isSellerAddress) ??
        seller.addresses?.find((address: IUserAddress) => address.isDefault) ??
        seller.addresses?.[0];

    if (!sellerAddress) {
        throw new Error("No operational pickup addresses found for target merchant.");
    }

    // 5. Calculate a dynamic expected delivery date (e.g., exactly 3 days from today)
    const computedDeliveryDate = new Date();
    computedDeliveryDate.setDate(computedDeliveryDate.getDate() + 3);

    // 6. Build production structured payload maps
    const shipmentPayload = {
        orderId: order._id,
        orderItemId: item._id,
        bookId: item.bookId,
        sellerId: item.sellerId,
        buyerId: order.userId,

        sender: {
            name: `${seller.firstName || ""} ${seller.lastName || ""}`.trim(),
            phone: sellerAddress.phone,
            email: seller.email,
            addressLine1: sellerAddress.street,
            city: sellerAddress.city,
            state: sellerAddress.state,
            pincode: sellerAddress.zipCode,
            country: sellerAddress.country,
            location: {
                type: sellerAddress.location?.type || "Point",
                coordinates: sellerAddress.location?.coordinates
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
                type: order.shippingAddress.location?.type || "Point",
                coordinates: order.shippingAddress.location?.coordinates
            },
        },

        paymentMode:
            order.payment?.paymentMethod === PaymentMethod.COD
                ? PaymentMode.COD
                : PaymentMode.PREPAID,

        codAmount:
            order.payment?.paymentMethod === PaymentMethod.COD
                ? order.amount?.totalAmount || 0
                : 0,

        expectedDeliveryDate: computedDeliveryDate,
        createdBy: order.userId.toString(),
    };

    try {
        // 7. Fire the outgoing authorization validated POST network request
        const response = await axios.post(
            `${process.env.LOGISTICS_SERVICE_URL}/api/shipment/create`,
            shipmentPayload,
            {
                headers: {
                    "Content-Type": "application/json",
                    "x-internal-service-token": process.env.INTERNAL_SERVICE_SECRET || "",
                }
            }
        );

        return response.data?.data || response.data;
    } catch (error: any) {
        console.error(`Logistics execution delivery pipeline synchronization failed for order item: ${item._id}`, error.message);
        throw new Error(error.response?.data?.message || "Downstream shipment generation interface crashed.");
    }
};


export const checkExternalPincodeService = async (pincode: string): Promise<boolean> => {
    try {
        const serviceUrl = `${process.env.LOGISTICS_SERVICE_URL}/api/hub/check-serviceability?pincode=${pincode}`;
        const response = await axios.get(serviceUrl, {
            headers: {
                "Content-Type": "application/json",
                "x-internal-service-token": process.env.INTERNAL_SERVICE_SECRET || "",
            }
        });
      
        // Adjust this condition based on what the external API actually returns
        return response.data.data.isServiceable
    } catch (error) {
        // Log the error internally but return false to fail the validation
        console.error("External pincode service error:", error);
        return false;
    }
};


export const createReturnShipmentFromOrder = async (
    order: any,
    item: any
) => {
    // 1. Get Seller
    const seller = await User.findById(item.sellerId).lean();

    if (!seller) {
        throw new Error("Seller profile context record not found.");
    }

    // 2. Get Buyer
    const buyer = await User.findById(order.userId).lean();

    if (!buyer) {
        throw new Error("Buyer profile context record not found.");
    }

    // 3. Get Book
    const book = await Book.findById(item.bookId).lean();

    if (!book) {
        throw new Error("Book instance database context not found.");
    }

    // ---------------------------------------------------------
    // 4. Seller address
    // This is the DESTINATION for the return shipment
    // ---------------------------------------------------------

    const sellerAddress =
        seller.addresses?.find(
            (address: IUserAddress) => address.isSellerAddress
        ) ??
        seller.addresses?.find(
            (address: IUserAddress) => address.isDefault
        ) ??
        seller.addresses?.[0];

    if (!sellerAddress) {
        throw new Error(
            "No operational seller address found for return shipment."
        );
    }

    // ---------------------------------------------------------
    // 5. Buyer address
    // This is the ORIGIN for the return shipment
    // ---------------------------------------------------------

    const buyerAddress =
        buyer.addresses?.find(
            (address: IUserAddress) => address.isDefault
        ) ??
        buyer.addresses?.[0];

    if (!buyerAddress) {
        throw new Error(
            "No operational buyer address found for return shipment."
        );
    }

    // ---------------------------------------------------------
    // 6. Expected return date
    // ---------------------------------------------------------

    const expectedReturnDate = new Date();

    expectedReturnDate.setDate(
        expectedReturnDate.getDate() + 3
    );

    // ---------------------------------------------------------
    // 7. Build return shipment payload
    // ---------------------------------------------------------

    const shipmentPayload = {
        orderId: order._id,
        orderItemId: item._id,
        bookId: item.bookId,
        sellerId: item.sellerId,
        buyerId: order.userId,

        // Important: tell Logistics this is a return shipment
        shipmentType: "Return",

        // -----------------------------------------------------
        // BUYER -> SELLER
        // -----------------------------------------------------

        sender: {
            name: `${buyer.firstName || ""} ${buyer.lastName || ""}`.trim(),
            phone: buyerAddress.phone,
            email: buyer.email,
            addressLine1: buyerAddress.street,
            city: buyerAddress.city,
            state: buyerAddress.state,
            pincode: buyerAddress.zipCode,
            country: buyerAddress.country,
            location: {
                type: buyerAddress.location?.type || "Point",
                coordinates:
                    buyerAddress.location?.coordinates,
            },
        },

        receiver: {
            name: `${seller.firstName || ""} ${seller.lastName || ""}`.trim(),
            phone: sellerAddress.phone,
            email: seller.email,
            addressLine1: sellerAddress.street,
            city: sellerAddress.city,
            state: sellerAddress.state,
            pincode: sellerAddress.zipCode,
            country: sellerAddress.country,
            location: {
                type: sellerAddress.location?.type || "Point",
                coordinates:
                    sellerAddress.location?.coordinates,
            },
        },

        // Return shipment does not need COD collection
        paymentMode: PaymentMode.PREPAID,

        codAmount: 0,

        expectedDeliveryDate: expectedReturnDate,

        createdBy: order.userId.toString(),
    };

    try {
        // -----------------------------------------------------
        // 8. Call Logistics Service
        // -----------------------------------------------------

        const response = await axios.post(
            `${process.env.LOGISTICS_SERVICE_URL}/api/shipment/cretae-return-shipment`,
            shipmentPayload,
            {
                headers: {
                    "Content-Type": "application/json",
                    "x-internal-service-token":
                        process.env.INTERNAL_SERVICE_SECRET || "",
                },
            }
        );
        console.log(`Return shipment created successfully for order item: ${item._id}`, response.data);
        return response.data?.data || response.data;
    } catch (error: any) {
        console.error(
            `Logistics return shipment creation failed for order item: ${item._id}`,
            error.message
        );

        throw new Error(
            error.response?.data?.message ||
                "Downstream return shipment generation interface crashed."
        );
    }
};



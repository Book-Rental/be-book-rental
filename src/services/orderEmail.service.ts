import Order, { ItemStatus, ShipmentType } from "../models/Order";
import { compileTemplate } from "../templates/template";
import { sendEmail } from "./email.service";

const STATUS_EMAIL_CONFIG: Record<
    string,
    {
        title: string;
        message: string;
        flag: string;
    }
> = {
    CONFIRMED: {
        title: "Order Confirmed!",
        message: "Your order item has been confirmed by the seller.",
        flag: "SEND_CONFIRMED_EMAIL",
    },

    REJECTED: {
        title: "Order Item Rejected",
        message: "Unfortunately, this item could not be fulfilled.",
        flag: "SEND_REJECTED_EMAIL",
    },

    SHIPPED: {
        title: "Your Order Has Been Shipped!",
        message: "Your order item is on its way.",
        flag: "SEND_SHIPPED_EMAIL",
    },

    PARTIALLY_SHIPPED: {
        title: "Your Order Is Partially Shipped!",
        message: "Some items from your order have been shipped.",
        flag: "SEND_PARTIALLY_SHIPPED_EMAIL",
    },

    PARTIALLY_OUT_FOR_DELIVERY: {
        title: "Your Order Is Partially Out for Delivery!",
        message: "Some items from your order are out for delivery.",
        flag: "SEND_PARTIALLY_OUT_FOR_DELIVERY_EMAIL",
    },

    OUT_FOR_DELIVERY: {
        title: "Your Order Is Out for Delivery!",
        message: "Your order item is out for delivery and will reach you soon.",
        flag: "SEND_OUT_FOR_DELIVERY_EMAIL",
    },

    PARTIALLY_DELIVERED: {
        title: "Your Order Is Partially Delivered!",
        message: "Some items from your order have been delivered.",
        flag: "SEND_PARTIALLY_DELIVERED_EMAIL",
    },
    DELIVERED: {
        title: "Your Order Has Been Delivered!",
        message: "Your order item has been delivered successfully.",
        flag: "SEND_DELIVERED_EMAIL",
    },

    RETURN_REQUESTED: {
        title: "Return Request Received",
        message: "We have received your return request for this order item.",
        flag: "SEND_RETURN_REQUESTED_EMAIL",
    },

    RETURNED: {
        title: "Order Item Returned",
        message: "Your order item has been returned successfully.",
        flag: "SEND_RETURNED_EMAIL",
    },

    CANCELLED: {
        title: "Order Cancelled",
        message: "Your order item has been cancelled.",
        flag: "SEND_CANCELLED_EMAIL",
    },
};



const getShipmentEvent = (statuses: string[]) => {
    const totalItems = statuses.length;

    const shippedCount = statuses.filter(
        (status) => status === ItemStatus.SHIPPED
    ).length;

    if (shippedCount === 0) {
        return null;
    }

    if (shippedCount < totalItems) {
        return "PARTIALLY_SHIPPED";
    }

    return "SHIPPED";
};

const getOutForDeliveryEvent = (statuses: string[]) => {
    const totalItems = statuses.length;

    const outForDeliveryCount = statuses.filter(
        (status) => status === ItemStatus.OUT_FOR_DELIVERY
    ).length;

    if (outForDeliveryCount === 0) {
        return null;
    }

    if (outForDeliveryCount < totalItems) {
        return "PARTIALLY_OUT_FOR_DELIVERY";
    }

    return "OUT_FOR_DELIVERY";
};

const getDeliveredEvent = (statuses: string[]) => {
    const totalItems = statuses.length;

    const deliveredCount = statuses.filter(
        (status) => status === ItemStatus.DELIVERED
    ).length;

    if (deliveredCount === 0) {
        return null;
    }

    if (deliveredCount < totalItems) {
        return "PARTIALLY_DELIVERED";
    }

    return "DELIVERED";
};

const sendOrderStatusEmail = async (
    order: any,
    item: any,
    event?: string
) => {
    const status = event
        ? event
        : String(item.itemStatus).toUpperCase();

    const config = STATUS_EMAIL_CONFIG[status];

    if (!config) {
        console.log(`No email configured for status: ${status}`);
        return;
    }

    const awbNumber = item.shipmentDetails?.find(
        (shipment: any) =>
            shipment.shipmentType === ShipmentType.FORWARD
    )?.awbNumber;

    const frontendUrl =
        process.env.FRONTEND_URL ||
        "https://fe-book-rental-host.onrender.com";

    const trackingUrl = awbNumber
        ? `${frontendUrl}/track-shipment/${awbNumber}`
        : "";

    const orderDetailsUrl =
        `${frontendUrl}/order-details?orderId=${order._id}&bookId=${item.bookId}`;
    const isEmailEnabled = process.env[config.flag] === "true";

    if (!isEmailEnabled) {
        console.log(
            `Email disabled for ${status} by ${config.flag}`
        );
        return;
    }

    try {
        const populatedOrder: any = await Order.findById(order._id)
            .populate("userId", "firstName lastName email")
            .populate("items.bookId", "name");

        if (!populatedOrder) {
            console.error("Order not found while sending status email");
            return;
        }

        const user: any = populatedOrder.userId;

        if (!user?.email) {
            console.error("User email not found");
            return;
        }

        const populatedItem = populatedOrder.items.find(
            (orderItem: any) =>
                orderItem._id.toString() === item._id.toString()
        );

        const html = compileTemplate("orderStatusEmail.hbs", {
            statusTitle: config.title,
            statusMessage: config.message,
            orderNumber: populatedOrder.orderNumber,
            trackingUrl,
            orderDetailsUrl,
            bookName: populatedItem?.bookId?.name || "",
            year: new Date().getFullYear(),
        });

        await sendEmail(
            [
                {
                    Email: user.email,
                    Name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
                },
            ],
            config.title,
            html
        );

        console.log(
            `${status} email sent successfully to ${user.email}`
        );
    } catch (error) {
        console.error(
            `Failed to send ${status} email:`,
            error
        );
    }
};

export {
    sendOrderStatusEmail,
    getShipmentEvent,
    getOutForDeliveryEvent,
    getDeliveredEvent,
};
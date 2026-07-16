import Book from "../models/Book";
import Order, { OrderStatus, OrderType } from "../models/Order";
import { IOrder } from "../models/orderInteface";
import User from "../models/User";
import { PaymentStatus } from "../utils/constants";


//getAll Order 
export const getAllOrdersService = async () => {
    try {
        return await Order.find();
    } catch (err) {
        return err;
    }
};


//get By Order 
export const getOrderByOrderIdService = async (orderId: string) => {
    try {
        return await Order.findById(orderId);
    } catch (error) {
        return error;
    }
};

//Create Order 
export const createOrderService = async (orderData: any) => {
    try {
        const {
            customerId,
            items,
            deliveryAddress,
            paymentMethod,
            discount = 0,
            deliveryCharge = 0,
            tax = 0,
            createdBy,
        } = orderData;

        // -----------------------------
        // Validate Customer
        // -----------------------------
        const customer = await User.findById(customerId);

        if (!customer) {
            throw new Error("Customer not found.");
        }

        let subtotal = 0;

        const orderItems = [];

        // -----------------------------
        // Validate Books
        // -----------------------------
        for (const item of items) {
            const book: any = await Book.findById(item.bookId);

            if (!book) {
                throw new Error(`Book not found : ${item.bookId}`);
            }

            if (!book.isActive) {
                throw new Error(`${book.name} is inactive.`);
            }

            if (!book.isAvailable) {
                throw new Error(`${book.name} is not available.`);
            }

            let purchasePrice = 0;
            let rentalPrice = 0;
            let securityDeposit = 0;
            let rentalDuration = 0;

            if (item.orderType === OrderType.BUY) {
                if (!book.availableForSale) {
                    throw new Error(`${book.name} is not available for sale.`);
                }

                purchasePrice = book.purchasePrice;

                subtotal += purchasePrice * item.quantity;
            }

            if (item.orderType === OrderType.RENT) {
                if (!book.availableForRent) {
                    throw new Error(`${book.name} is not available for rent.`);
                }

                rentalPrice = book.rentalPrice;
                securityDeposit = book.securityDeposit;
                rentalDuration = item.rentalDuration;

                subtotal += (rentalPrice + securityDeposit) * item.quantity;
            }

            orderItems.push({
                bookId: book._id,
                sellerId: book.sellerId,

                orderType: item.orderType,

                quantity: item.quantity,

                purchasePrice,

                rentalPrice,

                rentalDuration,

                securityDeposit,

                rentStartDate: item.rentStartDate,

                expectedReturnDate: item.expectedReturnDate,

                actualReturnDate: null,

                lateFee: 0,
            });
        }

        // -----------------------------
        // Calculate Total
        // -----------------------------
        const totalAmount = subtotal + Number(deliveryCharge) + Number(tax) - Number(discount);

        // -----------------------------
        // Generate Order Number
        // -----------------------------
        const orderNumber = `RB${Date.now()}`;

        // -----------------------------
        // Save Order
        // -----------------------------
        const order = await Order.create({
            orderNumber,

            customerId,

            items: orderItems,

            deliveryAddress,

            subtotal,

            deliveryCharge,

            discount,

            tax,

            totalAmount,

            paymentMethod,

            paymentStatus: PaymentStatus.Pending,

            orderStatus: OrderStatus.PENDING,

            createdBy,

            updatedBy: createdBy,

            isActive: true,
        });

        return order;
    } catch (error) {
        throw error;
    }
};

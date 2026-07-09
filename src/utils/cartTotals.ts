import { ICart, PricingMode, RentalPeriod } from "../models/Cart";

type PopulatedBook = {
    _id: string;
    name: string;
    purchasePrice: number;
    rentalPricePerDay: number;
    rentalPricePerWeek: number;
    rentalPricePerMonth: number;
    securityDeposit: number;
};

type CartItemWithBook = {
    bookId: PopulatedBook;
    quantity: number;
    pricingMode: PricingMode;
    rentalPeriod?: RentalPeriod;
};

type CartTotalsItem = {
    bookId: string;
    quantity: number;
    pricingMode: PricingMode;
    rentalPeriod?: RentalPeriod;
    unitPrice: number;
    lineSubtotal: number;
    securityDepositLine: number;
};

export const computeCartTotals = (
    cart: (ICart & { items: CartItemWithBook[] }) | null
) => {
    const items = cart?.items ?? [];

    const totalsItems: CartTotalsItem[] = [];

    let subtotal = 0;
    let securityDepositTotal = 0;

    for (const item of items) {
        const book = item.bookId;

        if (!book) continue;

        const quantity = Number(item.quantity ?? 1);
        const pricingMode = item.pricingMode;
        const rentalPeriod = item.rentalPeriod;

        let unitPrice = 0;

        if (pricingMode === "sale") {
            unitPrice = Number(book.purchasePrice ?? 0);
        } else {
            switch (rentalPeriod) {
                case "day":
                    unitPrice = Number(book.rentalPricePerDay ?? 0);
                    break;

                case "week":
                    unitPrice = Number(book.rentalPricePerWeek ?? 0);
                    break;

                case "month":
                    unitPrice = Number(book.rentalPricePerMonth ?? 0);
                    break;

                default:
                    unitPrice = 0;
            }
        }

        const lineSubtotal = unitPrice * quantity;

        const securityDepositLine =
            pricingMode === "rent"
                ? Number(book.securityDeposit ?? 0) * quantity
                : 0;

        subtotal += lineSubtotal;
        securityDepositTotal += securityDepositLine;

        totalsItems.push({
            bookId: String(book._id),
            quantity,
            pricingMode,
            rentalPeriod,
            unitPrice,
            lineSubtotal,
            securityDepositLine,
        });
    }

    // static. Need to change afterwards.
    const deliveryFee = 49;

    const tax = (subtotal + securityDepositTotal) * 0.05;

    const total = subtotal + securityDepositTotal + deliveryFee + tax;

    return {
        subtotal,
        securityDepositTotal,
        deliveryFee,
        tax,
        total,
        items: totalsItems,
    };
};
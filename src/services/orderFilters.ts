
export interface OrderQuery {
    orderStatus?: string;
    paymentStatus?: string;
    orderId?: string;
    page?: number;
    limit?: number;
}
export interface FormattedOrderItem {
    bookId: string;
    bookName?: string;
    author?: string;
    coverImage?: string;
    quantity: number;
    itemStatus: string;
    rentalDuration?: number;
}

export interface FormattedOrder {
    orderId: string;
    orderNumber: string;
    orderDate: Date;
    orderStatus: string;
    paymentStatus?: string;
    totalAmount?: number;
    items: FormattedOrderItem[];
}
export const buildOrderPipeline = (query: OrderQuery, skip: number, limit: number): any[] => {
    const { orderStatus, paymentStatus, orderId } = query;
    const matchStage: any = { isActive: true };

    if (orderStatus) {
        matchStage.orderStatus = orderStatus;
    }

    // 🔄 Match nested object payment properties
    if (paymentStatus) {
        matchStage["payment.paymentStatus"] = paymentStatus;
    }

    const pipeline: any[] = [];

    // Stage 1: Filter dynamically with stringified regex conversions if orderId is partial
    if (orderId) {
        pipeline.push(
            { $match: matchStage },
            { $addFields: { stringId: { $toString: "$_id" } } },
            { $match: { stringId: { $regex: orderId, $options: "i" } } }
        );
    } else {
        pipeline.push({ $match: matchStage });
    }

    // Stage 2: Parallel data fetch and tracking count metrics
    pipeline.push({
        $facet: {
            data: [
                { $sort: { createdAt: -1 } },
                { $skip: skip },
                { $limit: limit },
                {
                    $lookup: {
                        from: "books",
                        localField: "items.bookId",
                        foreignField: "_id",
                        as: "populatedBooks"
                    }
                }
            ],
            totalCount: [
                { $count: "count" }
            ]
        }
    });

    return pipeline;
};


export const formatOrderRecords = (rawOrders: any[]): FormattedOrder[] => {
    return rawOrders.map((order: any) => ({
        orderId: order._id,
        orderNumber: order.orderNumber,
        orderDate: order.createdAt,
        orderStatus: order.orderStatus,
        paymentStatus: order.payment?.paymentStatus,
        totalAmount: order.amount?.totalAmount,

        items: order.items.map((item: any) => {
            const matchedBook = order.populatedBooks?.find(
                (b: any) => b._id.toString() === item.bookId?.toString()
            );

            return {
                bookId: item.bookId,
                bookName: matchedBook?.name,
                author: matchedBook?.author,
                coverImage: matchedBook?.coverImage,
                quantity: item.quantity,
                itemStatus: item.itemStatus,
                rentalDuration: item.rental?.rentalDuration,
            };
        }),
    }));
};
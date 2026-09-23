import { Router } from "express";

import {
  createOrder,
  deleteOrderById,
  getAllOrders,
  getOrderBookDetails,
  getOrderById,
  getOrderByItemId,
  getOrderByUserId,
  getSellerDashboard,
  getSellerOrderItemDetail,
  getSellerOrders,
  getSellerRecentOrders,
  updateOrderById,
  updateSellerOrderItemStatus,
} from "../controllers/orderController";

import { auth } from "../middlewares/authMiddleware";

const route = Router();

/**
 * @openapi
 * tags:
 *   - name: Orders
 *     description: Order management APIs
 */

/**
 * @openapi
 * /api/order:
 *   get:
 *     summary: Get all orders
 *     description: Get all orders available to the authenticated user.
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Orders fetched successfully
 *       401:
 *         description: Unauthorized
 */
route.get("/", auth as any, getAllOrders);

/**
 * @openapi
 * /api/order/{orderId}:
 *   get:
 *     summary: Get order by ID
 *     description: Get details of a specific order.
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order fetched successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 */
route.get("/:orderId", auth as any, getOrderById);

/**
 * @openapi
 * /api/order/getByUserId/{userId}:
 *   get:
 *     summary: Get orders by user ID
 *     description: Get all orders associated with a specific user.
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User orders fetched successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User orders not found
 */
route.get(
  "/getByUserId/:userId",
  auth as any,
  getOrderByUserId
);

/**
 * @openapi
 * /api/order/{orderId}/book/{bookId}:
 *   get:
 *     summary: Get book details from an order
 *     description: Get book details associated with a specific order.
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *       - in: path
 *         name: bookId
 *         required: true
 *         schema:
 *           type: string
 *         description: Book ID
 *     responses:
 *       200:
 *         description: Order book details fetched successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order or book not found
 */
route.get(
  "/:orderId/book/:bookId",
  auth as any,
  getOrderBookDetails
);

/**
 * @openapi
 * /api/order/{orderId}/Item/{ItemId}:
 *   get:
 *     summary: Get order by item ID
 *     description: Get order details using order item ID.
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *       - in: path
 *         name: ItemId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order item ID
 *     responses:
 *       200:
 *         description: Order item details fetched successfully
 *       404:
 *         description: Order item not found
 */
route.get(
  "/:orderId/Item/:ItemId",
  getOrderByItemId
);

/**
 * @openapi
 * /api/order/create:
 *   post:
 *     summary: Create a new order
 *     description: Create an order for the authenticated user.
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               items:
 *                 type: array
 *                 description: Order items
 *                 items:
 *                   type: object
 *               totalAmount:
 *                 type: number
 *                 description: Total order amount
 *               addressId:
 *                 type: string
 *                 description: Delivery address ID
 *     responses:
 *       201:
 *         description: Order created successfully
 *       400:
 *         description: Invalid order data
 *       401:
 *         description: Unauthorized
 */
route.post(
  "/create",
  auth as any,
  createOrder
);

/**
 * @openapi
 * /api/order/{orderId}:
 *   delete:
 *     summary: Delete an order
 *     description: Delete an order using order ID.
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 */
route.delete(
  "/:orderId",
  auth as any,
  deleteOrderById
);

/**
 * @openapi
 * /api/order/update/{orderID}:
 *   put:
 *     summary: Update an order
 *     description: Update an existing order.
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderID
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       200:
 *         description: Order updated successfully
 *       400:
 *         description: Invalid order data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 */
route.put(
  "/update/:orderID",
  auth as any,
  updateOrderById
);

/**
 * @openapi
 * /api/order/seller/dashboard:
 *   get:
 *     summary: Get seller dashboard
 *     description: Get dashboard information for the authenticated seller.
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Seller dashboard fetched successfully
 *       401:
 *         description: Unauthorized
 */
route.get(
  "/seller/dashboard",
  auth as any,
  getSellerDashboard
);

/**
 * @openapi
 * /api/order/seller/orders:
 *   get:
 *     summary: Get seller orders
 *     description: Get orders associated with the authenticated seller.
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Seller orders fetched successfully
 *       401:
 *         description: Unauthorized
 */
route.get(
  "/seller/orders",
  auth as any,
  getSellerOrders
);

/**
 * @openapi
 * /api/order/seller/recent-orders:
 *   get:
 *     summary: Get recent seller orders
 *     description: Get recent orders for the authenticated seller.
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recent seller orders fetched successfully
 *       401:
 *         description: Unauthorized
 */
route.get(
  "/seller/recent-orders",
  auth as any,
  getSellerRecentOrders
);

/**
 * @openapi
 * /api/order/seller/order-item/{orderItemId}:
 *   get:
 *     summary: Get seller order item details
 *     description: Get details of a seller order item.
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderItemId
 *         required: true
 *         schema:
 *           type: string
 *         description: Seller order item ID
 *     responses:
 *       200:
 *         description: Seller order item details fetched successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order item not found
 */
route.get(
  "/seller/order-item/:orderItemId",
  auth as any,
  getSellerOrderItemDetail
);

/**
 * @openapi
 * /api/order/seller/order-item/{orderItemId}/status:
 *   patch:
 *     summary: Update seller order item status
 *     description: Update the status of a seller order item.
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderItemId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 description: New order item status
 *     responses:
 *       200:
 *         description: Order item status updated successfully
 *       400:
 *         description: Invalid status
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order item not found
 */
route.patch(
  "/seller/order-item/:orderItemId/status",
  auth as any,
  updateSellerOrderItemStatus
);

export default route;
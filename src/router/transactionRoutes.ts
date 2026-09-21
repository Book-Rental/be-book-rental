import { Router } from "express";

import {
    createSellerPayoutController,
    createTransactionController,
    getCustomerSummaryController,
    getCustomerTransactionDetailsController,
    getProfitSummaryController,
    getSellerPayoutDetailsController,
    getSellerPayoutsController,
    getTransactionsByOrderIdController,
} from "../controllers/transaction.controller";
import { refundController } from "../controllers/refund.controller";

const router = Router();

router.post("/", createTransactionController);

router.get("/order/:orderId", getTransactionsByOrderIdController);

router.get("/profit", getProfitSummaryController);

router.post("/refund/:orderItemId", refundController);

router.post("/seller-payout/:orderItemId", createSellerPayoutController);

router.get("/seller-payouts", getSellerPayoutsController);

router.get("/seller-payouts/:sellerId",getSellerPayoutDetailsController);

router.get("/customer-summary", getCustomerSummaryController);

router.get(
    "/customer-summary/:customerId",
    getCustomerTransactionDetailsController
);
export default router;
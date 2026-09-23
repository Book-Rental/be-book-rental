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
import { auth } from "../middlewares/authMiddleware";
import { superAdmin } from "../middlewares/superAdmin";

const router = Router();

router.post("/", createTransactionController);

router.get("/order/:orderId",auth,superAdmin, getTransactionsByOrderIdController);

router.get("/profit", auth, superAdmin, getProfitSummaryController);

router.post("/refund/:orderItemId", refundController);

router.post("/seller-payout/:orderItemId", createSellerPayoutController);

router.get("/seller-payouts", auth, superAdmin, getSellerPayoutsController);

router.get("/seller-payouts/:sellerId", auth, superAdmin, getSellerPayoutDetailsController);

router.get("/customer-summary", auth, superAdmin, getCustomerSummaryController);

router.get("/customer-summary/:customerId",auth,superAdmin,getCustomerTransactionDetailsController);

export default router;
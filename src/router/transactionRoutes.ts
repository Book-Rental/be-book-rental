import { Router } from "express";

import {
    createSellerPayoutController,
    createTransactionController,
    getProfitSummaryController,
    getTransactionsByOrderIdController,
} from "../controllers/transaction.controller";
import { refundController } from "../controllers/refund.controller";

const router = Router();

router.post("/", createTransactionController);

router.get("/order/:orderId", getTransactionsByOrderIdController);

router.get("/profit", getProfitSummaryController);

router.post(
    "/refund/:orderItemId",
    refundController
);

router.post(
    "/seller-payout/:orderItemId",
    createSellerPayoutController
);

export default router;
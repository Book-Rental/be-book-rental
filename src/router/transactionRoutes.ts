import { Router } from "express";

import {
    createSellerPayoutController,
    createTransactionController,
    getTransactionsByOrderIdController,
} from "../controllers/transaction.controller";
import { refundController } from "../controllers/refund.controller";

const router = Router();

router.post("/", createTransactionController);

router.get("/order/:orderId", getTransactionsByOrderIdController);

router.post(
    "/refund/:orderItemId",
    refundController
);

router.post(
    "/seller-payout/:orderItemId",
    createSellerPayoutController
);

export default router;
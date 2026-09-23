import express from "express";

import {
    chatWithAIAgent
} from "../controllers/aiAgentController";

const router = express.Router();

router.post(
    "/chat",
    chatWithAIAgent
);

export default router;
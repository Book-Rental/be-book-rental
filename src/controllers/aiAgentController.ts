import { Request, Response } from "express";
import {
    JWT_TOKEN_NAME
} from "../utils/constants";

export interface AuthRequest extends Request {
    user?: string | object;
    isInternalService?: boolean;
}

export const chatWithAIAgent = async (
    req: AuthRequest,
    res: Response
) => {

    try {

        /*
         * ----------------------------------------------
         * 1. Get JWT from HTTP-only cookie
         * ----------------------------------------------
         */

        const token: string | undefined =
            req.cookies?.[
            `${JWT_TOKEN_NAME}`
            ];

        console.log(
            "AI Proxy - Token exists:",
            !!token
        );


        /*
         * ----------------------------------------------
         * 2. Validate message
         * ----------------------------------------------
         */

        const { message } = req.body;

        if (
            !message ||
            typeof message !== "string"
        ) {

            return res.status(400).json({
                success: false,
                message: "Message is required"
            });
        }


        /*
         * ----------------------------------------------
         * 3. AI Agent URL
         * ----------------------------------------------
         */

        const aiAgentUrl =
            process.env.AI_AGENT_URL;

        if (!aiAgentUrl) {

            return res.status(500).json({
                success: false,
                message:
                    "AI Agent URL is not configured"
            });
        }


        /*
         * ----------------------------------------------
         * 4. Prepare headers
         * ----------------------------------------------
         */

        const headers: Record<string, string> = {
            "Content-Type": "application/json"
        };


        /*
         * ----------------------------------------------
         * 5. Forward JWT as Authorization header
         * ----------------------------------------------
         */

        if (token) {

            headers["Authorization"] =
                `Bearer ${token}`;

            console.log(
                "AI Proxy - Authorization header added"
            );
        }


        /*
         * ----------------------------------------------
         * 6. Call AI Agent
         * ----------------------------------------------
         */

        const authenticatedUserId =
            typeof req.user === "object" &&
                req.user !== null
                ? (req.user as any).id
                : undefined;

        console.log(
            "AI Proxy - Authenticated User ID:",
            authenticatedUserId
        );

        const response = await fetch(
            `${aiAgentUrl}/api/agent/chat`,
            {
                method: "POST",

                headers,

                body: JSON.stringify({
                    message,
                    userId: authenticatedUserId
                })
            }
        );


        /*
         * ----------------------------------------------
         * 7. Read AI Agent response
         * ----------------------------------------------
         */

        const data =
            await response.json();


        /*
         * ----------------------------------------------
         * 8. Return response to frontend
         * ----------------------------------------------
         */

        return res
            .status(response.status)
            .json(data);

    } catch (error) {

        console.error(
            "AI Agent Proxy Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to process AI request"
        });
    }
};
import { Request, Response } from "express";
import { NodeStreamableHTTPServerTransport } from "@modelcontextprotocol/node";
import { createMcpServer } from "./mcpServer";

export const handleMcpRequest = async (
    req: Request,
    res: Response
) => {
    try {
        const server = createMcpServer();

        const transport =
            new NodeStreamableHTTPServerTransport({
                sessionIdGenerator: undefined,
            });

        await server.connect(transport);

        await transport.handleRequest(
            req,
            res,
            req.body
        );

        res.on("close", () => {
            transport.close();
            server.close();
        });
    } catch (error) {
        console.error("MCP request error:", error);

        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: "MCP server error",
            });
        }
    }
};
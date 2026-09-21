import express, { Request, Response } from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";

import { swaggerSpec } from "./swagger";
import routes from "./router";
import { errorResponse } from "./utils/response";
import { handleMcpRequest } from "./mcp/mcpRoute";
const app: any = express();

app.use(express.json());

app.use(
    cors({
        origin: [
            "http://localhost:3000",
            "http://localhost:5173",
            "https://fe-book-rental-host.onrender.com",
            "https://admin-agent-host.onrender.com",
            "https://socket-io-frontend-c3wf.onrender.com"

        ],
        credentials: true,
    })
);

app.use(morgan("dev"));
app.use(cookieParser());

// Existing APIs
app.use("/api", routes);

// MCP Server
app.post("/mcp", handleMcpRequest);

// OpenAPI JSON
app.get("/openapi.json", (_req: Request, res: Response) => {
    res.json(swaggerSpec);
});
// Swagger documentation
app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec)
);

// Error handler
app.use((err: any, req: any, res: any, next: any) => {
    console.error(err.stack);
    errorResponse(res, "Something went wrong!", 500, err);
});

export default app;
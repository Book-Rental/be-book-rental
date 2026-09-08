import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

export const createMcpServer = () => {

  const server = new McpServer({
    name: "book-rental-mcp-server",
    version: "1.0.0",
  });

  server.registerTool(
    "call_backend_api",
    {
      description:
        "Call an API from the Book Rental backend",

      inputSchema: z.object({

        method: z.enum([
          "GET",
          "POST",
          "PUT",
          "DELETE",
          "PATCH",
        ]),

        path: z.string(),

        query: z
          .record(z.string(), z.any())
          .optional(),

        body: z
          .record(z.string(), z.any())
          .optional(),

        headers: z
          .record(z.string(), z.string())
          .optional(),
      }),
    },

    async ({
      method,
      path,
      query,
      body,
      headers,
    }) => {

      try {

        const baseUrl =
          process.env.BACKEND_URL ||
          "http://localhost:3000";

        const url =
          new URL(
            `${baseUrl}${path}`
          );

        /*
         * Query parameters
         */

        if (query) {

          Object.entries(query)
            .forEach(
              ([key, value]) => {

                url.searchParams.append(
                  key,
                  String(value)
                );

              }
            );
        }

        /*
         * Request headers
         */

        const requestHeaders: Record<
          string,
          string
        > = {

          "Content-Type":
            "application/json",
        };

        if (headers) {

          Object.assign(
            requestHeaders,
            headers
          );
        }

        console.log(
          "Calling backend:",
          {
            method,
            url:
              url.toString(),
            hasAuthorization:
              Boolean(
                requestHeaders.Authorization
              ),
          }
        );

        /*
         * Call existing backend
         */

        const response =
          await fetch(
            url.toString(),
            {
              method,

              headers:
                requestHeaders,

              body:
                method === "GET" ||
                method === "DELETE"
                  ? undefined
                  : JSON.stringify(body),
            }
          );

        const data =
          await response.json();

        return {

          content: [
            {
              type: "text",
              text:
                JSON.stringify(data),
            },
          ],

          isError:
            !response.ok,
        };

      } catch (error) {

        return {

          content: [
            {
              type: "text",
              text:
                error instanceof Error
                  ? error.message
                  : String(error),
            },
          ],

          isError: true,
        };
      }
    }
  );

  return server;
};
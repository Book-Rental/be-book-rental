import swaggerJSDoc from "swagger-jsdoc";

const options: swaggerJSDoc.Options = {
    definition: {
        openapi: "3.0.0",

        info: {
            title: "Book Rental API",
            version: "1.0.0",
            description: "Book Rental Backend API Documentation",
        },

        servers: [
            {
                url:
                    process.env.BASE_URL ||
                    "http://localhost:3000",
            },
        ],

        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
        },
    },

    apis: [
        "./src/router/*.ts",
    ],
};

export const swaggerSpec = swaggerJSDoc(options);

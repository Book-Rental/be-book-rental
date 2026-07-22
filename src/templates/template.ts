import fs from "fs";
import path from "path";
import handlebars from "handlebars";

// Register partials
const header = fs.readFileSync(
    path.join(__dirname, "partials/header.hbs"),
    "utf8"
);

const footer = fs.readFileSync(
    path.join(__dirname, "partials/footer.hbs"),
    "utf8"
);

handlebars.registerPartial("header", header);
handlebars.registerPartial("footer", footer);

export const compileTemplate = (
    fileName: string,
    data: any
) => {

    const template = fs.readFileSync(
        path.join(__dirname, "layouts", fileName),
        "utf8"
    );

    return handlebars.compile(template)(data);
};
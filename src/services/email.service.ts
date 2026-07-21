import { mailjet } from "../config/mailjet";

interface Recipient {
    Email: string;
    Name?: string;
}

export const sendEmail = async (
    to: Recipient[],
    subject: string,
    html: string
) => {
    try {
        const response = await mailjet
            .post("send", { version: "v3.1" })
            .request({
                Messages: [
                    {
                        From: {
                            Email: process.env.MAILJET_FROM_EMAIL!,
                            Name: process.env.MAILJET_FROM_NAME!,
                        },
                        To: to,
                        Subject: subject,
                        HTMLPart: html,
                    },
                ],
            });

        return response;
    } catch (error) {
        console.error("Mail Error:", error);
        throw error;
    }
};
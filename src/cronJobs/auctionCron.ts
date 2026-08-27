import cron from "node-cron";
import { updateAuctionStatuses } from "../utils/updateAuctionStatuses";


export const startAuctionCron = () => {
    // Runs every minute
    cron.schedule("* * * * *", async () => {
        console.log("Running auction status cron...");

        await updateAuctionStatuses();
    });

    console.log("Auction status cron started");
};
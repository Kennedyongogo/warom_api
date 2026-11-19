const cron = require("node-cron");
const earningsReleaseService = require("../services/warom/earningsReleaseService");

let started = false;

const startEarningsReleaseJob = () => {
  if (started) return;
  started = true;

  // Every 15 minutes
  cron.schedule("*/15 * * * *", async () => {
    try {
      const released = await earningsReleaseService.releaseMaturedHolds({
        limit: 500,
      });
      if (released > 0) {
        console.log(`💰 Released ${released} matured earning hold(s)`);
      }
    } catch (err) {
      console.error("earnings release cron failed:", err.message);
    }
  });

  console.log("⏰ Earnings release cron scheduled (every 15 min)");
};

module.exports = { startEarningsReleaseJob };

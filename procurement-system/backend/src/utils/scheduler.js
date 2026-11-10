// Background jobs. Registered once from server.js after the server is listening.
//   * Daily 08:00 IST: warranty + subscription reminders (30 / 7 / 1 day, expiry)
//     and auto-renew roll-over. See src/utils/tracker.js.
//   * Once shortly after boot, to catch reminders missed while the server was off.
//     Delayed so it never competes with the first page loads.
const cron = require('node-cron');
const { runReminders } = require('./tracker');

const STARTUP_DELAY_MS = 15000;

async function run(label) {
  try {
    const r = await runReminders();
    if (r.warranties || r.subscriptions || r.auto_renewed) {
      console.log(`[SCHEDULER] ${label}: ${r.warranties} warranty, ${r.subscriptions} subscription reminder(s), ${r.auto_renewed} auto-renewed`);
    }
  } catch (err) {
    console.error(`[SCHEDULER] ${label} failed:`, err.message);
  }
}

function startScheduler() {
  cron.schedule('0 8 * * *', () => run('Daily check'), { timezone: 'Asia/Kolkata' });
  setTimeout(() => run('Startup check'), STARTUP_DELAY_MS).unref();
}

module.exports = { startScheduler, runReminders: () => run('Manual check') };

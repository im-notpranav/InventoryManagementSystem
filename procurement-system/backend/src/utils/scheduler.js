require('dotenv').config();
const cron = require('node-cron');
const prisma = require('../config/db');
const {
  sendWarrantyExpiryAlert,
  sendSubscriptionExpiryAlert,
} = require('./mailer');

console.log('[SCHEDULER] Warranty and subscription alert scheduler started');

// Runs every day at 8:00 AM
cron.schedule('0 8 * * *', async () => {
  console.log('[SCHEDULER] Running daily warranty check...');

  try {
    // Get all admin users
    const admins = await prisma.user.findMany({
      where: {
        role: { role_name: 'Admin' },
        is_active: true,
      },
      select: { user_id: true, name: true, email: true },
    });

    if (admins.length === 0) {
      console.log('[SCHEDULER] No admin users found to notify');
      return;
    }

    const today = new Date();

    // Check warranties
    const warranties = await prisma.warranty.findMany({
      where: { notified: false },
      include: {
        product: true,
        vendor: true,
      },
    });

    let warrantiesAlerted = 0;

    for (const w of warranties) {
      const daysLeft = Math.ceil(
        (new Date(w.end_date) - today) / (1000 * 60 * 60 * 24)
      );

      // Alert if expired, expiring within 30 days
      const shouldAlert = daysLeft <= 30;

      if (shouldAlert) {
        for (const admin of admins) {
          try {
            await sendWarrantyExpiryAlert({
              to:           admin.email,
              adminName:    admin.name,
              productName:  w.product?.name || 'Unknown Product',
              serialNumber: w.serial_number,
              vendorName:   w.vendor?.vendor_name,
              endDate:      w.end_date,
              daysLeft,
            });
            console.log(
              `[SCHEDULER] Warranty alert sent to ${admin.email}` +
              ` for ${w.product?.name} (${daysLeft} days left)`
            );
          } catch (emailErr) {
            console.error('[SCHEDULER] Email failed:', emailErr.message);
          }
        }

        // Mark as notified so we don't spam every day
        await prisma.warranty.update({
          where: { warranty_id: w.warranty_id },
          data:  { notified: true },
        });

        warrantiesAlerted++;
      }
    }

    // Check subscriptions
    const subscriptions = await prisma.subscription.findMany({
      where: { notified: false },
      include: { product: true },
    });

    let subscriptionsAlerted = 0;

    for (const s of subscriptions) {
      const daysLeft = Math.ceil(
        (new Date(s.expiry_date) - today) / (1000 * 60 * 60 * 24)
      );

      const shouldAlert = daysLeft <= 30;

      if (shouldAlert) {
        for (const admin of admins) {
          try {
            await sendSubscriptionExpiryAlert({
              to:          admin.email,
              adminName:   admin.name,
              serviceName: s.service_name,
              productName: s.product?.name || 'Unknown',
              expiryDate:  s.expiry_date,
              daysLeft,
            });
          } catch (emailErr) {
            console.error('[SCHEDULER] Subscription email failed:', emailErr.message);
          }
        }

        await prisma.subscription.update({
          where: { subscription_id: s.subscription_id },
          data:  { notified: true },
        });

        subscriptionsAlerted++;
      }
    }

    console.log(
      `[SCHEDULER] Daily check complete. ` +
      `Warranties alerted: ${warrantiesAlerted}, ` +
      `Subscriptions alerted: ${subscriptionsAlerted}`
    );

  } catch (err) {
    console.error('[SCHEDULER] Daily check failed:', err.message);
  }
}, {
  timezone: 'Asia/Kolkata',
});

// Also run once immediately on startup to catch any missed alerts
// Wait 10 seconds for server to fully initialize first
setTimeout(async () => {
  console.log('[SCHEDULER] Running startup warranty check...');
  try {
    const admins = await prisma.user.findMany({
      where: { role: { role_name: 'Admin' }, is_active: true },
      select: { user_id: true, name: true, email: true },
    });

    const today = new Date();

    // Find critical warranties (expired or expiring within 7 days)
    // that have NOT been notified — startup only checks critical ones
    const criticalWarranties = await prisma.warranty.findMany({
      where: { notified: false },
      include: { product: true, vendor: true },
    });

    const critical = criticalWarranties.filter(w => {
      const days = Math.ceil(
        (new Date(w.end_date) - today) / (1000 * 60 * 60 * 24)
      );
      return days <= 7; // Only truly critical on startup
    });

    if (critical.length > 0) {
      console.log(
        `[SCHEDULER] Found ${critical.length} critical warranty alert(s)`
      );
      for (const w of critical) {
        const daysLeft = Math.ceil(
          (new Date(w.end_date) - today) / (1000 * 60 * 60 * 24)
        );
        for (const admin of admins) {
          await sendWarrantyExpiryAlert({
            to:           admin.email,
            adminName:    admin.name,
            productName:  w.product?.name,
            serialNumber: w.serial_number,
            vendorName:   w.vendor?.vendor_name,
            endDate:      w.end_date,
            daysLeft,
          }).catch(e => console.error('[SCHEDULER]', e.message));
        }
        await prisma.warranty.update({
          where: { warranty_id: w.warranty_id },
          data:  { notified: true },
        });
      }
    }
  } catch (err) {
    console.error('[SCHEDULER] Startup check failed:', err.message);
  }
}, 10000);

module.exports = {};

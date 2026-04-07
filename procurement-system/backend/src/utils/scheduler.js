import cron from 'node-cron';
import prisma from '../config/db.js';
import { sendWarrantyExpiryEmail, sendSubscriptionExpiryEmail } from './mailer.js';

export const initScheduler = () => {
  // Check warranty expiry daily at 8 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('[SCHEDULER] Checking warranty expiry...');
    try {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const expiringWarranties = await prisma.warranty.findMany({
        where: {
          status: 'Active',
          endDate: {
            lte: thirtyDaysFromNow,
            gte: new Date(),
          },
        },
        include: { product: true },
      });

      if (expiringWarranties.length > 0) {
        // Get admin users to notify
        const admins = await prisma.user.findMany({
          where: { role: { name: 'Admin' }, isActive: true },
          select: { email: true },
        });

        for (const admin of admins) {
          await sendWarrantyExpiryEmail(admin.email, expiringWarranties);
        }

        // Create in-app notifications
        for (const warranty of expiringWarranties) {
          const daysLeft = Math.ceil((warranty.endDate - new Date()) / (1000 * 60 * 60 * 24));
          for (const admin of admins) {
            const adminUser = await prisma.user.findUnique({ where: { email: admin.email } });
            if (adminUser) {
              await prisma.notification.create({
                data: {
                  userId: adminUser.id,
                  title: 'Warranty Expiring Soon',
                  message: `Warranty for ${warranty.product.name} expires in ${daysLeft} days.`,
                  type: 'warning',
                  link: '/warranties',
                },
              });
            }
          }
        }

        console.log(`[SCHEDULER] ${expiringWarranties.length} expiring warranties found, notifications sent.`);
      }
    } catch (error) {
      console.error('[SCHEDULER] Warranty check error:', error.message);
    }
  });

  // Check subscription expiry daily at 8:30 AM
  cron.schedule('30 8 * * *', async () => {
    console.log('[SCHEDULER] Checking subscription expiry...');
    try {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const expiringSubscriptions = await prisma.subscription.findMany({
        where: {
          status: 'Active',
          alertSent: false,
          endDate: {
            lte: thirtyDaysFromNow,
            gte: new Date(),
          },
        },
      });

      if (expiringSubscriptions.length > 0) {
        const admins = await prisma.user.findMany({
          where: { role: { name: 'Admin' }, isActive: true },
          select: { id: true, email: true },
        });

        for (const admin of admins) {
          await sendSubscriptionExpiryEmail(admin.email, expiringSubscriptions);
          
          for (const sub of expiringSubscriptions) {
            const daysLeft = Math.ceil((sub.endDate - new Date()) / (1000 * 60 * 60 * 24));
            await prisma.notification.create({
              data: {
                userId: admin.id,
                title: 'Subscription Expiring',
                message: `${sub.name} subscription expires in ${daysLeft} days. Renewal cost: ₹${sub.renewalCost.toLocaleString('en-IN')}`,
                type: 'warning',
                link: '/warranties',
              },
            });
          }
        }

        // Mark subscriptions as alerted
        await prisma.subscription.updateMany({
          where: { id: { in: expiringSubscriptions.map(s => s.id) } },
          data: { alertSent: true },
        });

        console.log(`[SCHEDULER] ${expiringSubscriptions.length} expiring subscriptions found, notifications sent.`);
      }
    } catch (error) {
      console.error('[SCHEDULER] Subscription check error:', error.message);
    }
  });

  // Check low stock daily at 9 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('[SCHEDULER] Checking low stock levels...');
    try {
      const lowStockItems = await prisma.$queryRaw`
        SELECT i.*, p.name as "productName"
        FROM "Inventory" i
        JOIN "Product" p ON p.id = i."productId"
        WHERE i.quantity <= i."reorderPoint"
      `;

      if (lowStockItems.length > 0) {
        const admins = await prisma.user.findMany({
          where: { role: { name: 'Admin' }, isActive: true },
        });

        for (const admin of admins) {
          await prisma.notification.create({
            data: {
              userId: admin.id,
              title: 'Low Stock Alert',
              message: `${lowStockItems.length} items are below reorder point.`,
              type: 'warning',
              link: '/inventory',
            },
          });
        }
        console.log(`[SCHEDULER] ${lowStockItems.length} low-stock items found.`);
      }
    } catch (error) {
      console.error('[SCHEDULER] Low stock check error:', error.message);
    }
  });

  console.log('[SCHEDULER] Cron jobs initialized.');
};

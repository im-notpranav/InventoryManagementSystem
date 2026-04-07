import nodemailer from 'nodemailer';
import env from '../config/env.js';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: false,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

export const sendEmail = async (to, subject, html) => {
  try {
    if (!env.SMTP_USER) {
      console.log(`[MAILER-DEV] To: ${to} | Subject: ${subject}`);
      console.log(`[MAILER-DEV] Body: ${html.substring(0, 200)}...`);
      return { success: true, dev: true };
    }

    const info = await transporter.sendMail({
      from: env.SMTP_FROM,
      to,
      subject,
      html,
    });

    console.log(`[MAILER] Email sent: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[MAILER] Error:', error.message);
    return { success: false, error: error.message };
  }
};

export const sendPurchaseOrderEmail = async (vendor, orderNo) => {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4f46e5;">New Purchase Order: ${orderNo}</h2>
      <p>Dear ${vendor.name},</p>
      <p>A new purchase order <strong>${orderNo}</strong> has been issued to you.</p>
      <p>Please log in to the InventBot portal to view details and acknowledge receipt.</p>
      <br/>
      <p>Best regards,<br/>InventBot System</p>
    </div>
  `;
  return sendEmail(vendor.email, `New Purchase Order: ${orderNo}`, html);
};

export const sendWarrantyExpiryEmail = async (userEmail, warranties) => {
  const items = warranties.map(w =>
    `<li><strong>${w.product.name}</strong> (S/N: ${w.serialNo || 'N/A'}) — expires ${new Date(w.endDate).toLocaleDateString()}</li>`
  ).join('');

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #f59e0b;">⚠ Warranty Expiry Alert</h2>
      <p>The following items have warranties expiring soon:</p>
      <ul>${items}</ul>
      <p>Please review and take necessary action.</p>
      <br/>
      <p>Best regards,<br/>InventBot System</p>
    </div>
  `;
  return sendEmail(userEmail, 'Warranty Expiry Alert — InventBot', html);
};

export const sendSubscriptionExpiryEmail = async (userEmail, subscriptions) => {
  const items = subscriptions.map(s => {
    const daysLeft = Math.ceil((new Date(s.endDate) - new Date()) / (1000 * 60 * 60 * 24));
    return `<li><strong>${s.name}</strong> (${s.type}) — expires in ${daysLeft} days — Renewal: ₹${s.renewalCost.toLocaleString('en-IN')}</li>`;
  }).join('');

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #ef4444;">🔔 Subscription Expiry Alert</h2>
      <p>The following subscriptions are expiring soon:</p>
      <ul>${items}</ul>
      <p>Please review and renew if necessary.</p>
      <br/>
      <p>Best regards,<br/>InventBot System</p>
    </div>
  `;
  return sendEmail(userEmail, 'Subscription Expiry Alert — InventBot', html);
};

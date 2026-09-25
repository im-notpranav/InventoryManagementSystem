require('dotenv').config();
const nodemailer = require('nodemailer');

const cfg = {
  host:     process.env.SMTP_HOST || 'smtp.gmail.com',
  port:     parseInt(process.env.SMTP_PORT) || 587,
  secure:   process.env.SMTP_SECURE === 'true',
  user:     process.env.SMTP_USER || '',
  pass:     process.env.SMTP_PASS || '',
  fromName: process.env.SMTP_FROM_NAME || 'InventBot',
};

const PLACEHOLDER_PATTERNS = ['your_', 'changeme', 'placeholder', 'example', 'xxx', 'test@', '_here'];
const looksReal = (val) => val.length > 5 && !PLACEHOLDER_PATTERNS.some((p) => val.toLowerCase().includes(p));
const isConfigured = looksReal(cfg.user) && looksReal(cfg.pass);

let transporter = null;

if (isConfigured) {
  transporter = nodemailer.createTransport({
    host:   cfg.host,
    port:   cfg.port,
    secure: cfg.secure,
    auth:   { user: cfg.user, pass: cfg.pass },
    tls:    { rejectUnauthorized: false },
    connectionTimeout: 10000,
    greetingTimeout:   10000,
  });
  transporter.verify((err) => {
    if (err) {
      console.error('[MAILER] SMTP connection failed:', err.message);
      console.error('[MAILER] Check SMTP_USER, SMTP_PASS, and that Gmail App Password is correct');
    } else {
      console.log('[MAILER] SMTP connection verified. Emails will be sent.');
    }
  });
} else {
  console.warn('[MAILER] SMTP not configured. Emails will be logged to console only.');
  console.warn('[MAILER] Set SMTP_USER and SMTP_PASS in backend/.env');
}

// ─── HTML Email Template ───────────────────────────────────────
function baseTemplate(content) {
  return [
    '<!DOCTYPE html><html><head><meta charset="utf-8">',
    '<style>',
    'body{margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif}',
    '.wrap{max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0}',
    '.header{background:linear-gradient(135deg,#1e3a5f,#2e75b6);padding:28px 32px}',
    '.header h1{color:#fff;margin:0;font-size:22px}',
    '.header p{color:rgba(255,255,255,0.7);margin:6px 0 0;font-size:13px}',
    '.body{padding:32px;color:#0f172a;line-height:1.7;font-size:15px}',
    '.body h2{margin:0 0 12px;font-size:20px;color:#0f172a}',
    '.body p{margin:8px 0}',
    '.footer{padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;text-align:center}',
    '.info-box{background:#f0f7ff;border:1px solid #bfdbfe;border-radius:10px;padding:18px 20px;margin:18px 0}',
    '.info-box p{margin:6px 0;font-size:14px}',
    '.info-box strong{color:#1e3a5f}',
    '.btn{display:inline-block;background:#1e3a5f;color:#fff !important;padding:13px 32px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:14px;margin-top:18px}',
    '.badge{display:inline-block;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:700}',
    '.badge-green{background:#dcfce7;color:#166534}',
    '.badge-red{background:#fee2e2;color:#991b1b}',
    '.badge-amber{background:#fef3c7;color:#92400e}',
    '.badge-blue{background:#dbeafe;color:#1e40af}',
    'table{width:100%;border-collapse:collapse;margin:18px 0;border-radius:8px;overflow:hidden}',
    'th{background:#1e3a5f;color:#fff;padding:11px 14px;text-align:left;font-size:13px}',
    'td{padding:11px 14px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#334155}',
    'tr:last-child td{border-bottom:none}',
    'code{background:#f1f5f9;padding:2px 8px;border-radius:4px;font-family:monospace;font-size:14px}',
    '</style></head><body>',
    '<div class="wrap">',
    '  <div class="header">',
    '    <h1>\uD83E\uDD16 InventBot</h1>',
    '    <p>Intelligent Inventory Management System</p>',
    '  </div>',
    '  <div class="body">' + content + '</div>',
    '  <div class="footer">',
    '    <p>This is an automated notification from <strong>InventBot</strong>.</p>',
    '    <p>Please do not reply to this email. For queries, contact your administrator.</p>',
    '  </div>',
    '</div>',
    '</body></html>',
  ].join('\n');
}

// ─── Core Send Function ────────────────────────────────────────
async function sendMail(to, subject, html) {
  if (!transporter) {
    console.log('[MAILER STUB] To: ' + to + ' | Subject: ' + subject);
    return { stubbed: true, to: to, subject: subject };
  }
  try {
    const info = await transporter.sendMail({
      from: '"' + cfg.fromName + '" <' + cfg.user + '>',
      to: to,
      subject: subject,
      html: html,
    });
    console.log('[MAILER] Sent to ' + to + ' | ID: ' + info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[MAILER] Failed to send to ' + to + ':', err.message);
    return { success: false, error: err.message };
  }
}

// ─── Welcome Email ─────────────────────────────────────────────
function sendWelcomeEmail(opts) {
  var to = opts.to, name = opts.name, role = opts.role, password = opts.password;
  var frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  var body = [
    '<h2>Welcome to InventBot, ' + name + '! \uD83D\uDC4B</h2>',
    '<p>Hello <strong>' + name + '</strong>,</p>',
    '<p>Your account has been successfully created on the InventBot Inventory Management System. You can now log in and start using the platform.</p>',
    '<div class="info-box">',
    '  <p><strong>Login URL:</strong> <a href="' + frontendUrl + '/login">' + frontendUrl + '/login</a></p>',
    '  <p><strong>Email:</strong> ' + to + '</p>',
    '  <p><strong>Temporary Password:</strong> <code>' + password + '</code></p>',
    '  <p><strong>Assigned Role:</strong> <span class="badge badge-blue">' + role + '</span></p>',
    '</div>',
    '<p style="color:#ef4444;font-size:13px">\u26A0\uFE0F <strong>Important:</strong> Please change your password immediately after your first login for security purposes.</p>',
    '<a href="' + frontendUrl + '/login" class="btn">Login to InventBot \u2192</a>',
  ].join('\n');
  return sendMail(to, 'Welcome to InventBot — Your Account is Ready', baseTemplate(body));
}

// ─── RFQ Email (to Vendor) ─────────────────────────────────────
function sendRFQEmail(opts) {
  var to = opts.to, vendorName = opts.vendorName, productName = opts.productName;
  var quantity = opts.quantity, prNumber = opts.prNumber, requiredDate = opts.requiredDate;
  var frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  var dateStr = requiredDate ? new Date(requiredDate).toDateString() : null;
  var body = [
    '<h2>Request for Quotation \uD83D\uDCCB</h2>',
    '<p>Dear <strong>' + vendorName + '</strong>,</p>',
    '<p>Greetings from <strong>InventBot</strong>! We are pleased to invite you to submit your quotation for the following procurement requirement:</p>',
    '<div class="info-box">',
    '  <p><strong>PR Reference:</strong> ' + prNumber + '</p>',
    '  <p><strong>Product / Item:</strong> ' + productName + '</p>',
    '  <p><strong>Required Quantity:</strong> ' + quantity + ' units</p>',
    dateStr ? '  <p><strong>Required By:</strong> ' + dateStr + '</p>' : '',
    '</div>',
    '<p><strong>What you need to submit:</strong></p>',
    '<ol style="margin:8px 0;padding-left:20px;font-size:14px">',
    '  <li>Your <strong>Quotation PDF</strong> with itemized pricing</li>',
    '  <li>A <strong>Proforma Invoice</strong> for advance processing</li>',
    '</ol>',
    '<p>Please log in to the Vendor Portal to upload your documents at your earliest convenience.</p>',
    '<a href="' + frontendUrl + '/vendor-portal" class="btn">Submit Quotation \u2192</a>',
    '<p style="font-size:13px;color:#64748b;margin-top:20px">If you have any questions regarding this RFQ, please contact the procurement team.</p>',
  ].join('\n');
  return sendMail(to, 'RFQ: ' + prNumber + ' — ' + productName, baseTemplate(body));
}

// ─── Quotation Approved (to Vendor) ────────────────────────────
function sendQuotationApprovedEmail(opts) {
  var to = opts.to, vendorName = opts.vendorName, prNumber = opts.prNumber, productName = opts.productName;
  var frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  var body = [
    '<h2>Quotation Approved \u2705</h2>',
    '<p>Dear <strong>' + vendorName + '</strong>,</p>',
    '<p>We are pleased to inform you that your quotation has been <strong>approved</strong>. Congratulations!</p>',
    '<div class="info-box">',
    '  <p><strong>PR Reference:</strong> ' + prNumber + '</p>',
    '  <p><strong>Product:</strong> ' + productName + '</p>',
    '  <p><strong>Status:</strong> <span class="badge badge-green">Approved</span></p>',
    '</div>',
    '<p>A <strong>Work Order</strong> will be issued to you shortly with delivery instructions and terms. Please check your Vendor Portal regularly for updates.</p>',
    '<a href="' + frontendUrl + '/vendor-portal" class="btn">Open Vendor Portal \u2192</a>',
    '<p style="font-size:13px;color:#64748b;margin-top:20px">Thank you for your competitive quotation. We look forward to a successful procurement.</p>',
  ].join('\n');
  return sendMail(to, 'Quotation Approved — ' + prNumber, baseTemplate(body));
}

// ─── Quotation Rejected (to Vendor) ───────────────────────────
function sendQuotationRejectedEmail(opts) {
  var to = opts.to, vendorName = opts.vendorName, prNumber = opts.prNumber;
  var productName = opts.productName, reason = opts.reason;
  var body = [
    '<h2>Quotation Status Update</h2>',
    '<p>Dear <strong>' + vendorName + '</strong>,</p>',
    '<p>Thank you for submitting your quotation. After careful evaluation, we regret to inform you that your quotation was not selected for this requirement.</p>',
    '<div class="info-box">',
    '  <p><strong>PR Reference:</strong> ' + prNumber + '</p>',
    '  <p><strong>Product:</strong> ' + productName + '</p>',
    '  <p><strong>Status:</strong> <span class="badge badge-red">Not Selected</span></p>',
    reason ? '  <p><strong>Remarks:</strong> ' + reason + '</p>' : '',
    '</div>',
    '<p>We sincerely appreciate your participation and encourage you to submit quotations for future procurement requests. Your partnership is valued.</p>',
    '<p style="font-size:13px;color:#64748b;margin-top:16px">If you believe this decision should be reconsidered, please contact the procurement team.</p>',
  ].join('\n');
  return sendMail(to, 'Quotation Update — ' + prNumber, baseTemplate(body));
}

// ─── Work Order Issued (to Vendor) ─────────────────────────────
function sendWorkOrderEmail(opts) {
  var to = opts.to, vendorName = opts.vendorName, woNumber = opts.woNumber;
  var itemsDescription = opts.itemsDescription, quantity = opts.quantity;
  var agreedPrice = opts.agreedPrice, deliveryDeadline = opts.deliveryDeadline;
  var frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  var deadlineStr = deliveryDeadline ? new Date(deliveryDeadline).toDateString() : 'To be confirmed';
  var body = [
    '<h2>Work Order Issued \uD83D\uDCE6</h2>',
    '<p>Dear <strong>' + vendorName + '</strong>,</p>',
    '<p>A Work Order has been officially issued to you. Please review the details below and acknowledge receipt through the Vendor Portal.</p>',
    '<table>',
    '  <tr><th>Field</th><th>Details</th></tr>',
    '  <tr><td>Work Order #</td><td><strong>' + woNumber + '</strong></td></tr>',
    '  <tr><td>Items</td><td>' + itemsDescription + '</td></tr>',
    '  <tr><td>Quantity</td><td>' + quantity + ' units</td></tr>',
    '  <tr><td>Agreed Price</td><td><strong>\u20B9' + Number(agreedPrice).toLocaleString('en-IN') + '</strong></td></tr>',
    '  <tr><td>Delivery Deadline</td><td>' + deadlineStr + '</td></tr>',
    '</table>',
    '<p><strong>\u26A0\uFE0F Important steps before dispatch:</strong></p>',
    '<ol style="margin:8px 0;padding-left:20px;font-size:14px;line-height:1.8">',
    '  <li>Acknowledge this Work Order on the Vendor Portal</li>',
    '  <li>Upload your <strong>Tax Invoice</strong> before dispatching goods</li>',
    '  <li>Ensure the delivery driver carries a physical copy of the Tax Invoice</li>',
    '</ol>',
    '<a href="' + frontendUrl + '/vendor-portal" class="btn">Acknowledge Work Order \u2192</a>',
  ].join('\n');
  return sendMail(to, 'Work Order Issued: ' + woNumber, baseTemplate(body));
}

// ─── PR Approved (to Department User) ──────────────────────────
function sendPRApprovedEmail(opts) {
  var to = opts.to, userName = opts.userName, prNumber = opts.prNumber;
  var productName = opts.productName, quantity = opts.quantity;
  var frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  var body = [
    '<h2>Purchase Request Approved \u2705</h2>',
    '<p>Dear <strong>' + userName + '</strong>,</p>',
    '<p>Great news! Your purchase request has been reviewed and <strong>approved</strong> by the admin team.</p>',
    '<div class="info-box">',
    '  <p><strong>PR Number:</strong> ' + prNumber + '</p>',
    '  <p><strong>Product:</strong> ' + productName + '</p>',
    '  <p><strong>Quantity:</strong> ' + quantity + '</p>',
    '  <p><strong>Status:</strong> <span class="badge badge-green">Approved</span></p>',
    '</div>',
    '<p>The procurement team will now reach out to vendors for competitive quotations. You can track the full progress on your dashboard.</p>',
    '<a href="' + frontendUrl + '/purchase-requests" class="btn">Track Your Request \u2192</a>',
  ].join('\n');
  return sendMail(to, 'Purchase Request Approved — ' + prNumber, baseTemplate(body));
}

// ─── Gate Entry Blocked Alert (to Admin) ───────────────────────
function sendGateBlockedAlert(opts) {
  var to = opts.to, entryNumber = opts.entryNumber, woNumber = opts.woNumber;
  var vendorName = opts.vendorName, expectedInvoice = opts.expectedInvoice;
  var enteredInvoice = opts.enteredInvoice;
  var frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  var body = [
    '<h2 style="color:#ef4444">\uD83D\uDEA8 Gate Entry Blocked — Immediate Action Required</h2>',
    '<p>A delivery has been <strong>blocked</strong> at the gate due to a Tax Invoice number mismatch. Please investigate immediately.</p>',
    '<div class="info-box" style="border-color:#fecaca;background:#fef2f2">',
    '  <p><strong>Gate Entry:</strong> ' + entryNumber + '</p>',
    '  <p><strong>Work Order:</strong> ' + woNumber + '</p>',
    '  <p><strong>Vendor:</strong> ' + vendorName + '</p>',
    '  <p><strong>Expected Invoice #:</strong> <code>' + expectedInvoice + '</code></p>',
    '  <p><strong>Presented Invoice #:</strong> <code style="color:#ef4444;font-weight:bold">' + enteredInvoice + '</code></p>',
    '</div>',
    '<p>The delivery vehicle is waiting at the gate. Please contact the vendor and gate staff to resolve this discrepancy.</p>',
    '<a href="' + frontendUrl + '/gate-entry" class="btn" style="background:#ef4444">View Gate Entries \u2192</a>',
  ].join('\n');
  return sendMail(to, '\uD83D\uDEA8 Gate Entry Blocked: ' + entryNumber, baseTemplate(body));
}

// ─── Bill Ready for Review (to Accountant) ─────────────────────
function sendBillReadyEmail(opts) {
  var to = opts.to, accountantName = opts.accountantName;
  var entryNumber = opts.entryNumber, vendorName = opts.vendorName;
  var frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  var body = [
    '<h2>Bill Ready for Review \uD83D\uDCB0</h2>',
    '<p>Dear <strong>' + accountantName + '</strong>,</p>',
    '<p>A billing document has been fully signed and confirmed by both the Admin and Security. It is now awaiting your review and final release.</p>',
    '<div class="info-box">',
    '  <p><strong>Entry Number:</strong> ' + entryNumber + '</p>',
    '  <p><strong>Vendor:</strong> ' + vendorName + '</p>',
    '  <p><strong>Status:</strong> <span class="badge badge-amber">Ready for Review</span></p>',
    '</div>',
    '<p>Please log in to verify all supporting documents (Proforma Invoice, Tax Invoice, Work Order, Scanned Physical Invoice) and release the payment.</p>',
    '<a href="' + frontendUrl + '/billing" class="btn">Review &amp; Release Bill \u2192</a>',
  ].join('\n');
  return sendMail(to, 'Bill Ready for Review: ' + entryNumber, baseTemplate(body));
}

// ─── Warranty Expiry Alert (to Admin — per warranty) ───────────
const sendWarrantyExpiryAlert = async ({
  to, adminName, productName, serialNumber,
  vendorName, endDate, daysLeft
}) => {
  const urgency = daysLeft <= 0
    ? '🔴 EXPIRED'
    : daysLeft <= 7
    ? '🔴 CRITICAL — Expires in ' + daysLeft + ' days'
    : '⚠️ Expiring in ' + daysLeft + ' days';

  const borderColor = daysLeft <= 0 ? '#ef4444'
    : daysLeft <= 7 ? '#ef4444' : '#f59e0b';

  return sendMail(
    to,
    `${daysLeft <= 0 ? '[EXPIRED]' : '[WARRANTY ALERT]'} ${productName} — ${urgency}`,
    baseTemplate(`
      <h2 style="color:${borderColor}">Warranty Alert — Action Required</h2>
      <p>Dear <strong>${adminName}</strong>,</p>
      <p>This is an automated reminder about a warranty that requires your attention:</p>
      <div style="background:#fff7ed;border:2px solid ${borderColor};
        border-radius:10px;padding:20px;margin:20px 0">
        <table style="width:100%;border:none">
          <tr><td style="padding:6px 0;color:#64748b;width:140px">Product</td>
              <td style="padding:6px 0;font-weight:bold">${productName}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Serial Number</td>
              <td style="padding:6px 0">${serialNumber || 'Not recorded'}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Vendor</td>
              <td style="padding:6px 0">${vendorName || 'Unknown'}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Expiry Date</td>
              <td style="padding:6px 0;font-weight:bold;color:${borderColor}">
                ${new Date(endDate).toDateString()}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Status</td>
              <td style="padding:6px 0;font-weight:bold;color:${borderColor}">
                ${urgency}</td></tr>
        </table>
      </div>
      <p><strong>Recommended Actions:</strong></p>
      <ul>
        <li>Contact the vendor to discuss warranty renewal or replacement</li>
        <li>Create a Purchase Request if a new unit is needed</li>
        <li>Update the warranty record once renewed</li>
      </ul>
      <a href="http://localhost:5173/warranties" class="btn">
        View Warranties
      </a>
    `)
  );
};

// ─── Subscription Expiry Alert (to Admin — per subscription) ───
const sendSubscriptionExpiryAlert = async ({
  to, adminName, serviceName, productName, expiryDate, daysLeft
}) => {
  const urgency = daysLeft <= 0
    ? 'EXPIRED'
    : 'Expires in ' + daysLeft + ' days';

  return sendMail(
    to,
    `[SUBSCRIPTION ALERT] ${serviceName} — ${urgency}`,
    baseTemplate(`
      <h2 style="color:#f59e0b">Subscription Expiry Alert</h2>
      <p>Dear <strong>${adminName}</strong>,</p>
      <p>The following subscription requires renewal:</p>
      <div class="info-box">
        <p><strong>Service:</strong> ${serviceName}</p>
        <p><strong>Product:</strong> ${productName}</p>
        <p><strong>Expiry Date:</strong>
          <span style="color:#ef4444;font-weight:bold">
            ${new Date(expiryDate).toDateString()}
          </span>
        </p>
        <p><strong>Status:</strong> ${urgency}</p>
      </div>
      <p>Please renew this subscription to avoid service interruption.</p>
      <a href="http://localhost:5173/warranties" class="btn">
        View Subscriptions
      </a>
    `)
  );
};

// ─── Password Changed Notification ─────────────────────────────
function sendPasswordChangedEmail(opts) {
  var to = opts.to, name = opts.name;
  var body = [
    '<h2>Password Changed 🔒</h2>',
    '<p>Dear <strong>' + name + '</strong>,</p>',
    '<p>Your InventBot account password has been successfully changed.</p>',
    '<div class="info-box" style="border-color:#fecaca;background:#fef2f2">',
    '  <p><strong>⚠️ If you did not make this change</strong>, please contact your administrator immediately to secure your account.</p>',
    '</div>',
    '<p style="font-size:13px;color:#64748b;margin-top:16px">This is an automated security notification. No action is required if you initiated this change.</p>',
  ].join('\n');
  return sendMail(to, 'InventBot — Password Changed', baseTemplate(body));
}

module.exports = {
  sendMail, sendWelcomeEmail, sendRFQEmail,
  sendQuotationApprovedEmail, sendQuotationRejectedEmail,
  sendWorkOrderEmail, sendPRApprovedEmail,
  sendGateBlockedAlert, sendBillReadyEmail,
  sendWarrantyExpiryAlert, sendSubscriptionExpiryAlert,
  sendPasswordChangedEmail,
};


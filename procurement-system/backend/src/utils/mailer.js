require('dotenv').config();

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

// nodemailer is loaded and the SMTP connection opened on first use, not at boot:
// requiring it and the TLS handshake used to add to every server start.
let transporter = null;

function getTransporter() {
  if (!isConfigured) return null;
  if (!transporter) {
    const nodemailer = require('nodemailer');
    transporter = nodemailer.createTransport({
      host:   cfg.host,
      port:   cfg.port,
      secure: cfg.secure,
      auth:   { user: cfg.user, pass: cfg.pass },
      tls:    { rejectUnauthorized: false },
      connectionTimeout: 10000,
      greetingTimeout:   10000,
    });
  }
  return transporter;
}

if (!isConfigured) {
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
  const transporter = getTransporter();
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

// ─── Generic workflow notice (all order-cycle emails) ─────────
// rows: [[label, value], ...]   cta: { label, url }
function esc(v) {
  return String(v == null ? "" : v).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c];
  });
}

function sendNotice(opts) {
  var rows = (opts.rows || []).filter(function (r) { return r && r[1] != null && r[1] !== ""; });
  var body = [
    "<h2>" + esc(opts.heading || opts.subject) + "</h2>",
    opts.intro ? "<p>" + esc(opts.intro) + "</p>" : "",
    rows.length
      ? "<div class=\"info-box\">" + rows.map(function (r) {
          return "<p><strong>" + esc(r[0]) + ":</strong> " + esc(r[1]) + "</p>";
        }).join("") + "</div>"
      : "",
    opts.cta ? "<a class=\"btn\" href=\"" + esc(opts.cta.url) + "\">" + esc(opts.cta.label) + "</a>" : "",
  ].join("\n");
  return sendMail(opts.to, opts.subject, baseTemplate(body));
}

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
  sendMail, sendNotice, sendWelcomeEmail,
  sendPasswordChangedEmail,
};


import { Router } from 'express';
import { sendEmail } from '../../../utils/mailer.js';
import { sendSuccess, sendError } from '../../../utils/response.js';
import { authMiddleware } from '../../../middleware/auth.middleware.js';

const router = Router();

/**
 * Test email endpoint - Admin only
 * POST /api/test-email
 * Body: { to: "recipient@email.com" }
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    // Only admins can test email
    if (req.user.role !== 'Admin') {
      return sendError(res, 'Admin access required.', 403);
    }

    const { to } = req.body;
    const recipient = to || req.user.email;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1E3A5F 0%, #3B82F6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Email Test Successful!</h1>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Hello <strong>${req.user.name}</strong>,
          </p>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            This is a test email from <strong>InventBot</strong>. If you're reading this, your email configuration is working correctly! 🚀
          </p>
          <div style="background: #f0f9ff; border-left: 4px solid #3B82F6; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #1e40af; font-size: 14px;">
              <strong>Test Details:</strong><br/>
              Sent at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}<br/>
              Recipient: ${recipient}<br/>
              Server: InventBot Procurement System
            </p>
          </div>
          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
            You can now approve purchase requests and the system will automatically send PO emails to vendors.
          </p>
        </div>
        <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
          This is an automated test message from InventBot.
        </div>
      </div>
    `;

    const result = await sendEmail(recipient, '✅ InventBot Email Test', html);

    if (result.success) {
      return sendSuccess(res, {
        recipient,
        messageId: result.messageId,
        devMode: result.dev || false,
      }, result.dev 
        ? 'Email logged to console (dev mode - no SMTP configured)' 
        : 'Test email sent successfully!'
      );
    } else {
      return sendError(res, 'Email delivery failed.', 500);
    }
  } catch (error) {
    return sendError(res, 'Failed to send test email.', 500);
  }
});

export default router;

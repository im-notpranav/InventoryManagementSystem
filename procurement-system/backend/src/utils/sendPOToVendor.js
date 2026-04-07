import { sendEmail } from './mailer.js';
import prisma from '../config/db.js';

/**
 * Sends Purchase Order to vendor via email and marks it as sent
 * Called after approval creates a PO automatically
 */
export const sendPOToVendor = async (po) => {
  try {
    // Fetch full PO details with relations
    const fullPO = await prisma.purchaseOrder.findUnique({
      where: { id: po.id },
      include: {
        vendor: true,
        items: { include: { product: true } },
        request: { include: { user: true } },
      },
    });

    if (!fullPO || !fullPO.vendor) {
      console.error(`[sendPOToVendor] PO-${po.id} not found or no vendor`);
      return;
    }

    // Build vendor portal link
    const portalLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/vendor-portal/${fullPO.id}`;

    // Build email HTML with item details
    const itemRows = fullPO.items.map(item => `
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;">${item.product?.name || 'Custom Item'}</td>
        <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${item.quantityOrdered}</td>
        <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">₹${Number(item.priceEach).toLocaleString('en-IN')}</td>
        <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">₹${(item.quantityOrdered * item.priceEach).toLocaleString('en-IN')}</td>
      </tr>
    `).join('');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff;">
        <div style="background: #1E3A5F; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Purchase Order</h1>
          <p style="margin: 5px 0 0 0; font-size: 14px;">PO-${fullPO.orderNo}</p>
        </div>
        
        <div style="padding: 20px;">
          <p>Dear <strong>${fullPO.vendor.name}</strong>,</p>
          <p>A new purchase order has been generated for your review. Please find the details below:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background: #1E3A5F; color: white;">
                <th style="padding: 12px; text-align: left;">Product</th>
                <th style="padding: 12px; text-align: center;">Quantity</th>
                <th style="padding: 12px; text-align: right;">Unit Price</th>
                <th style="padding: 12px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
            <tfoot>
              <tr style="background: #f5f5f5; font-weight: bold;">
                <td colspan="3" style="padding: 12px; text-align: right;">Grand Total:</td>
                <td style="padding: 12px; text-align: right;">₹${Number(fullPO.totalAmount).toLocaleString('en-IN')}</td>
              </tr>
            </tfoot>
          </table>
          
          <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Payment Terms:</strong> ${fullPO.paymentTerms || 'Standard (Net 30)'}</p>
            <p style="margin: 0 0 10px 0;"><strong>Shipping Terms:</strong> ${fullPO.shippingTerms || 'Standard Delivery'}</p>
            <p style="margin: 0;"><strong>Expected Delivery:</strong> ${fullPO.expectedDelivery ? new Date(fullPO.expectedDelivery).toLocaleDateString('en-IN') : 'To be confirmed'}</p>
          </div>
          
          <p>Please confirm, reject, or request changes to this order via your vendor portal:</p>
          
          <div style="text-align: center; margin: 25px 0;">
            <a href="${portalLink}" 
               style="background: #1E3A5F; color: white; padding: 14px 32px; 
                      text-decoration: none; border-radius: 8px; display: inline-block;
                      font-weight: bold;">
              Open Vendor Portal
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          
          <p style="color: #888; font-size: 12px; text-align: center;">
            This is an automated message from InventBot Procurement System.<br/>
            Please do not reply directly to this email.
          </p>
        </div>
      </div>
    `;

    // Send email to vendor
    await sendEmail(
      fullPO.vendor.email,
      `Purchase Order PO-${fullPO.orderNo} from InventBot`,
      html
    );

    // Mark PO as sent
    await prisma.purchaseOrder.update({
      where: { id: po.id },
      data: {
        sentToVendor: true,
        sentAt: new Date(),
        status: 'Sent',
      },
    });

    console.log(`[sendPOToVendor] PO-${fullPO.orderNo} sent to ${fullPO.vendor.name} (${fullPO.vendor.email})`);
    return { success: true };
  } catch (err) {
    console.error('[sendPOToVendor] Failed:', err.message);
    return { success: false, error: err.message };
  }
};

export default sendPOToVendor;

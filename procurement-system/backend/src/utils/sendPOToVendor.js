const { sendMail } = require('./mailer');
const prisma = require('../config/db');
const { FRONTEND_URL } = require('../config/env');

const sendPOToVendor = async (po) => {
  try {
    const fullPO = await prisma.purchaseOrder.findUnique({
      where: { order_id: po.order_id },
      include: {
        vendor: true,
        order_items: { include: { product: true } },
        creator: true,
      },
    });
    if (!fullPO?.vendor?.email) return;

    const rows = fullPO.order_items.map(i =>
      `<tr>
        <td style="padding:8px;border:1px solid #ddd">${i.product.name}</td>
        <td style="padding:8px;border:1px solid #ddd">${i.quantity_ordered}</td>
        <td style="padding:8px;border:1px solid #ddd">₹${i.unit_price}</td>
        <td style="padding:8px;border:1px solid #ddd">₹${Number(i.unit_price) * i.quantity_ordered}</td>
      </tr>`
    ).join('');

    const html = `
      <div style="font-family:Arial;max-width:600px;margin:0 auto">
        <div style="background:#1e3a5f;padding:24px;border-radius:8px 8px 0 0">
          <h1 style="color:white;margin:0;font-size:20px">InventBot</h1>
          <p style="color:#a8c8e8;margin:4px 0 0">Purchase Order</p>
        </div>
        <div style="padding:24px;border:1px solid #ddd;border-top:none;border-radius:0 0 8px 8px">
          <h2 style="color:#1e3a5f">${fullPO.po_number || 'PO-'+fullPO.order_id}</h2>
          <p>Dear <strong>${fullPO.vendor.vendor_name}</strong>,</p>
          <p>Please find your purchase order below. Log in to your vendor portal
             to acknowledge this order.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <thead>
              <tr style="background:#1e3a5f;color:white">
                <th style="padding:10px;text-align:left">Product</th>
                <th style="padding:10px;text-align:left">Qty</th>
                <th style="padding:10px;text-align:left">Unit Price</th>
                <th style="padding:10px;text-align:left">Total</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <p><strong>Total Amount: ₹${fullPO.total_amount}</strong></p>
          <a href="${FRONTEND_URL}/vendor-portal"
             style="display:inline-block;background:#1e3a5f;color:white;
                    padding:12px 24px;text-decoration:none;border-radius:8px;margin-top:8px">
            Open Vendor Portal
          </a>
        </div>
      </div>`;

    await sendMail(
      fullPO.vendor.email,
      `Purchase Order: ${fullPO.po_number || 'PO-' + fullPO.order_id}`,
      html
    );

    await prisma.purchaseOrder.update({
      where: { order_id: po.order_id },
      data: { sent_to_vendor: true, sent_at: new Date() },
    });
  } catch (err) {
    console.error('[PO EMAIL] Failed:', err.message);
  }
};

module.exports = { sendPOToVendor };

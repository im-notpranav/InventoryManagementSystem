import prisma from '../../../config/db.js';
import { sendSuccess, sendError } from '../../../utils/response.js';
import { sendEmail } from '../../../utils/mailer.js';
import { z } from 'zod';

const quotationSchema = z.object({
  rfqId: z.coerce.number().int().positive(),
  deliveryDays: z.coerce.number().int().min(0).max(365).optional(),
  validUntil: z.string().datetime().optional(),
  terms: z.string().max(5000).optional(),
  notes: z.string().max(5000).optional(),
  items: z.array(z.object({
    productId: z.coerce.number().int().positive().optional(),
    customProductName: z.string().max(255).optional(),
    quantity: z.coerce.number().positive(),
    unitPrice: z.coerce.number().nonnegative(),
  })).min(1),
});

// Get all RFQs (Admin/Manager)
export const getAllRFQs = async (req, res, next) => {
  try {
    let where = {};
    if (req.query.status) where.status = req.query.status;
    
    const rfqs = await prisma.rFQ.findMany({
      where,
      include: {
        request: {
          include: {
            user: { select: { id: true, name: true, department: true } },
            items: { include: { product: true } },
          },
        },
        vendors: {
          include: {
            vendor: { select: { id: true, name: true, email: true } },
          },
        },
        quotations: {
          include: {
            vendor: true,
            items: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return sendSuccess(res, rfqs);
  } catch (error) { next(error); }
};

// Get single RFQ with all quotations and invited vendors
export const getRFQById = async (req, res, next) => {
  try {
    const rfq = await prisma.rFQ.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        request: {
          include: {
            user: { select: { id: true, name: true, department: true } },
            items: { include: { product: true } },
          },
        },
        vendors: {
          include: {
            vendor: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
        quotations: {
          include: {
            vendor: true,
            items: { include: { product: true } },
          },
          orderBy: { totalAmount: 'asc' },
        },
      },
    });
    if (!rfq) return sendError(res, 'RFQ not found.', 404);
    return sendSuccess(res, rfq);
  } catch (error) { next(error); }
};

// Create RFQ from approved purchase request and invite vendors
export const createRFQ = async (req, res, next) => {
  try {
    const { requestId, vendorIds, deadline, notes } = req.body;

    if (!vendorIds || vendorIds.length === 0) {
      return sendError(res, 'Please select at least one vendor to send RFQ.', 400);
    }

    // Verify request is approved
    const request = await prisma.purchaseRequest.findUnique({
      where: { id: requestId },
      include: { items: { include: { product: true } } },
    });

    if (!request) return sendError(res, 'Purchase request not found.', 404);
    if (request.status !== 'Approved' && request.status !== 'RFQ_Sent') {
      return sendError(res, 'Only approved requests can have RFQs.', 400);
    }

    // Check if RFQ already exists for this request
    let rfq = await prisma.rFQ.findFirst({
      where: { requestId, status: 'Open' },
    });

    // Create RFQ if doesn't exist
    if (!rfq) {
      rfq = await prisma.rFQ.create({
        data: {
          requestId,
          deadline: deadline ? new Date(deadline) : null,
          notes,
        },
      });

      // Update request status
      await prisma.purchaseRequest.update({
        where: { id: requestId },
        data: { status: 'RFQ_Sent' },
      });
    } else if (deadline || notes) {
      // Update existing RFQ deadline/notes if provided
      rfq = await prisma.rFQ.update({
        where: { id: rfq.id },
        data: {
          ...(deadline && { deadline: new Date(deadline) }),
          ...(notes && { notes }),
        },
      });
    }

    // Get active vendors
    const vendors = await prisma.vendor.findMany({
      where: { id: { in: vendorIds }, status: 'Active' },
    });

    if (vendors.length === 0) {
      return sendError(res, 'No active vendors found from the selection.', 400);
    }

    // Invite vendors (create RFQVendor entries)
    const newInvitations = [];
    for (const vendor of vendors) {
      // Check if already invited
      const existing = await prisma.rFQVendor.findUnique({
        where: { rfqId_vendorId: { rfqId: rfq.id, vendorId: vendor.id } },
      });

      if (!existing) {
        const invitation = await prisma.rFQVendor.create({
          data: {
            rfqId: rfq.id,
            vendorId: vendor.id,
            status: 'Invited',
          },
        });
        newInvitations.push({ invitation, vendor });

        // Send email to vendor
        const itemsList = request.items.map(i => 
          `• ${i.product?.name || i.customProductName} × ${i.quantity}`
        ).join('\n');

        const html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4f46e5;">Request for Quotation: ${rfq.rfqNo}</h2>
            <p>Dear ${vendor.name},</p>
            <p>You are invited to submit a quotation for the following items:</p>
            <pre style="background: #f3f4f6; padding: 15px; border-radius: 8px;">${itemsList}</pre>
            ${deadline ? `<p><strong>Deadline:</strong> ${new Date(deadline).toLocaleDateString()}</p>` : ''}
            <p>Please log in to the vendor portal to submit your quotation with pricing and delivery terms.</p>
            <br/>
            <p>Best regards,<br/>InventBot Procurement Team</p>
          </div>
        `;
        await sendEmail(vendor.email, `RFQ: ${rfq.rfqNo} - Quote Requested`, html).catch(console.error);
      }
    }

    // Get full RFQ with vendors
    const fullRfq = await prisma.rFQ.findUnique({
      where: { id: rfq.id },
      include: {
        request: { include: { items: { include: { product: true } } } },
        vendors: { include: { vendor: { select: { id: true, name: true, email: true } } } },
        quotations: { include: { vendor: true } },
      },
    });

    // Notify admins
    const admins = await prisma.user.findMany({
      where: { role: { name: 'Admin' }, isActive: true },
    });
    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: newInvitations.length > 0 ? 'RFQ Vendors Invited' : 'RFQ Updated',
          message: `RFQ ${rfq.rfqNo}: ${newInvitations.length} new vendor(s) invited. Total invited: ${fullRfq.vendors.length}`,
          type: 'info',
          link: '/rfq',
        },
      });
    }

    return sendSuccess(res, fullRfq, `RFQ sent to ${newInvitations.length} new vendor(s).`, 201);
  } catch (error) { next(error); }
};

// Add more vendors to existing RFQ
export const addVendorsToRFQ = async (req, res, next) => {
  try {
    const rfqId = parseInt(req.params.id);
    const { vendorIds } = req.body;

    if (!vendorIds || vendorIds.length === 0) {
      return sendError(res, 'Please select at least one vendor.', 400);
    }

    const rfq = await prisma.rFQ.findUnique({
      where: { id: rfqId },
      include: { request: { include: { items: { include: { product: true } } } } },
    });

    if (!rfq) return sendError(res, 'RFQ not found.', 404);
    if (rfq.status !== 'Open') {
      return sendError(res, 'Cannot add vendors to a closed RFQ.', 400);
    }

    // Get active vendors
    const vendors = await prisma.vendor.findMany({
      where: { id: { in: vendorIds }, status: 'Active' },
    });

    const newInvitations = [];
    for (const vendor of vendors) {
      const existing = await prisma.rFQVendor.findUnique({
        where: { rfqId_vendorId: { rfqId, vendorId: vendor.id } },
      });

      if (!existing) {
        await prisma.rFQVendor.create({
          data: { rfqId, vendorId: vendor.id, status: 'Invited' },
        });
        newInvitations.push(vendor);

        // Send email
        const itemsList = rfq.request.items.map(i => 
          `• ${i.product?.name || i.customProductName} × ${i.quantity}`
        ).join('\n');

        const html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4f46e5;">Request for Quotation: ${rfq.rfqNo}</h2>
            <p>Dear ${vendor.name},</p>
            <p>You are invited to submit a quotation for the following items:</p>
            <pre style="background: #f3f4f6; padding: 15px; border-radius: 8px;">${itemsList}</pre>
            ${rfq.deadline ? `<p><strong>Deadline:</strong> ${new Date(rfq.deadline).toLocaleDateString()}</p>` : ''}
            <p>Please log in to the vendor portal to submit your quotation.</p>
          </div>
        `;
        await sendEmail(vendor.email, `RFQ: ${rfq.rfqNo} - Quote Requested`, html).catch(console.error);
      }
    }

    const updatedRfq = await prisma.rFQ.findUnique({
      where: { id: rfqId },
      include: {
        vendors: { include: { vendor: { select: { id: true, name: true, email: true } } } },
        quotations: { include: { vendor: true } },
      },
    });

    return sendSuccess(res, updatedRfq, `${newInvitations.length} new vendor(s) invited.`);
  } catch (error) { next(error); }
};

// Close an RFQ
export const closeRFQ = async (req, res, next) => {
  try {
    const rfq = await prisma.rFQ.update({
      where: { id: parseInt(req.params.id) },
      data: { status: 'Closed' },
    });
    return sendSuccess(res, rfq, 'RFQ closed.');
  } catch (error) { next(error); }
};

// Submit a quotation (Vendor)
export const submitQuotation = async (req, res, next) => {
  try {
    const { rfqId, items, deliveryDays, validUntil, terms, notes } = quotationSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { id: req.user?.id },
      select: { vendorId: true },
    });
    const vendorId = user?.vendorId;
    if (!vendorId) {
      return sendError(res, 'Vendor account is required to submit quotations.', 403);
    }

    // Verify RFQ is open
    const rfq = await prisma.rFQ.findUnique({
      where: { id: rfqId },
      include: { request: { include: { items: true } } },
    });

    if (!rfq) return sendError(res, 'RFQ not found.', 404);
    if (rfq.status !== 'Open') {
      return sendError(res, 'This RFQ is no longer accepting quotations.', 400);
    }

    const invitation = await prisma.rFQVendor.findUnique({
      where: { rfqId_vendorId: { rfqId, vendorId } },
    });
    if (!invitation) {
      return sendError(res, 'You are not invited to submit a quotation for this RFQ.', 403);
    }

    // Check if vendor already submitted
    const existing = await prisma.quotation.findUnique({
      where: { rfqId_vendorId: { rfqId, vendorId } },
    });
    if (existing) {
      return sendError(res, 'You have already submitted a quotation for this RFQ.', 400);
    }

    // Calculate total
    if (!Array.isArray(items) || items.length === 0) {
      return sendError(res, 'At least one quotation item is required.', 400);
    }
    const totalAmount = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

    // Create quotation with items
    const quotation = await prisma.quotation.create({
      data: {
        rfqId,
        vendorId,
        totalAmount,
        deliveryDays,
        validUntil: validUntil ? new Date(validUntil) : null,
        terms,
        notes,
        items: {
          create: items.map(item => ({
            productId: item.productId || null,
            customProductName: item.customProductName || null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.unitPrice * item.quantity,
          })),
        },
      },
      include: { vendor: true, items: true },
    });

    // Notify admins
    const admins = await prisma.user.findMany({
      where: { role: { name: 'Admin' }, isActive: true },
    });
    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: 'New Quotation Received',
          message: `${vendor?.name} submitted a quotation for RFQ ${rfq.rfqNo} — ₹${totalAmount.toLocaleString('en-IN')}`,
          type: 'success',
          link: '/rfq',
        },
      });
    }

    return sendSuccess(res, quotation, 'Quotation submitted successfully.', 201);
  } catch (error) { next(error); }
};

// Get all quotations for an RFQ (for comparison)
export const getQuotations = async (req, res, next) => {
  try {
    const quotations = await prisma.quotation.findMany({
      where: { rfqId: parseInt(req.params.rfqId) },
      include: {
        vendor: true,
        items: { include: { product: true } },
      },
      orderBy: { totalAmount: 'asc' },
    });
    return sendSuccess(res, quotations);
  } catch (error) { next(error); }
};

// Select a quotation and create PO
export const selectQuotation = async (req, res, next) => {
  try {
    const quotationId = parseInt(req.params.quotationId);
    const { expectedDelivery } = req.body;

    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        vendor: true,
        items: { include: { product: true } },
        rfq: { include: { request: true } },
      },
    });

    if (!quotation) return sendError(res, 'Quotation not found.', 404);
    if (quotation.status === 'Selected') {
      return sendError(res, 'This quotation has already been selected.', 400);
    }

    // Mark this quotation as selected
    await prisma.quotation.update({
      where: { id: quotationId },
      data: { status: 'Selected' },
    });

    // Reject other quotations for this RFQ
    await prisma.quotation.updateMany({
      where: { rfqId: quotation.rfqId, id: { not: quotationId } },
      data: { status: 'Rejected' },
    });

    // Close the RFQ
    await prisma.rFQ.update({
      where: { id: quotation.rfqId },
      data: { status: 'Closed' },
    });

    // Create Purchase Order from quotation
    const po = await prisma.purchaseOrder.create({
      data: {
        requestId: quotation.rfq.requestId,
        quotationId: quotation.id,
        vendorId: quotation.vendorId,
        totalAmount: quotation.totalAmount,
        expectedDelivery: expectedDelivery 
          ? new Date(expectedDelivery) 
          : quotation.deliveryDays 
            ? new Date(Date.now() + quotation.deliveryDays * 24 * 60 * 60 * 1000)
            : null,
        items: {
          create: quotation.items.map(item => ({
            productId: item.productId,
            quantityOrdered: item.quantity,
            priceEach: item.unitPrice,
          })),
        },
      },
      include: { vendor: true, items: { include: { product: true } } },
    });

    // Update request status
    await prisma.purchaseRequest.update({
      where: { id: quotation.rfq.requestId },
      data: { status: 'PO_Created' },
    });

    // Send PO email to vendor
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">🎉 Congratulations! Your Quotation Has Been Selected</h2>
        <p>Dear ${quotation.vendor.name},</p>
        <p>Your quotation for RFQ ${quotation.rfq.rfqNo} has been selected.</p>
        <h3>Purchase Order: ${po.orderNo}</h3>
        <p><strong>Total Amount:</strong> ₹${quotation.totalAmount.toLocaleString('en-IN')}</p>
        <p>Please log in to view the full purchase order details and confirm acceptance.</p>
        <br/>
        <p>Best regards,<br/>InventBot Procurement Team</p>
      </div>
    `;
    await sendEmail(quotation.vendor.email, `PO Generated: ${po.orderNo} - Your Quotation Selected`, html);

    // Notify requester
    await prisma.notification.create({
      data: {
        userId: quotation.rfq.request.userId,
        title: 'Purchase Order Created',
        message: `A PO (${po.orderNo}) has been created for your request ${quotation.rfq.request.requestNo}.`,
        type: 'success',
        link: '/purchase-orders',
      },
    });

    return sendSuccess(res, { quotation, purchaseOrder: po }, 'Quotation selected and PO created.', 201);
  } catch (error) { next(error); }
};

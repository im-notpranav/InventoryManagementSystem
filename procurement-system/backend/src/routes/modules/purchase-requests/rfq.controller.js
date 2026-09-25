import prisma from '../../../config/db.js';
import { sendSuccess, sendError } from '../../../utils/response.js';
import { sendEmail } from '../../../utils/mailer.js';
import { sendPOToVendor } from '../../../utils/sendPOToVendor.js';
import { generatePONumber } from '../../../utils/generateNumbers.js';
import { z } from 'zod';

const quotationSchema = z.object({
  rfqId: z.number().int().positive(),
  items: z.array(z.object({
    productId: z.number().int().positive().optional(),
    customProductName: z.string().trim().max(255).optional(),
    quantity: z.number().int().positive(),
    unitPrice: z.number().positive(),
  })).min(1),
  deliveryDays: z.number().int().positive().max(365).optional(),
  validUntil: z.string().max(100).optional().or(z.null()).optional(),
  terms: z.string().max(2000).optional(),
  notes: z.string().max(2000).optional(),
});

// Get all RFQs (Admin/Manager)
export const getAllRFQs = async (req, res, next) => {
  try {
    const requests = await prisma.purchaseRequest.findMany({
      where: {
        status: {
          in: ['approved', 'rfq_sent', 'quotation_received', 'quotation_approved', 'Approved', 'RFQ_Sent', 'PO_Created', 'po_created'],
        },
      },
      include: {
        items: { include: { product: true } },
        vendorQuotes: {
          include: {
            vendor: { select: { id: true, name: true, email: true, rating: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = requests.map((request) => {
      const quantity = request.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      const productName = request.items.length === 1
        ? (request.items[0].product?.name || request.items[0].customProductName || 'N/A')
        : 'Multiple Items';

      const invitedVendors = request.vendorQuotes.map((quote) => ({
        quote_id: quote.id,
        vendor_id: quote.vendorId,
        vendor_name: quote.vendor?.name || 'Unknown Vendor',
        vendor_email: quote.vendor?.email || '',
        vendor_rating: Number(quote.vendor?.rating || 0),
        unit_price: Number(quote.unitPrice || 0),
        delivery_days: quote.deliveryDays,
        validity_date: quote.validityDate,
        is_selected: quote.isSelected,
        resent_at: quote.resent_at,
        notes: quote.notes,
      }));

      const status = invitedVendors.some((quote) => quote.is_selected)
        ? 'quotation_approved'
        : invitedVendors.length > 0
          ? 'rfq_sent'
          : request.status;

      return {
        request_id: request.id,
        pr_number: request.pr_number || request.requestNo,
        product_name: productName,
        quantity,
        status,
        vendors_invited: invitedVendors.length,
        quotes_received: invitedVendors.filter((quote) => quote.unit_price > 0).length,
        invited_vendors: invitedVendors,
      };
    });

    return sendSuccess(res, data);
  } catch (error) { 
    console.error('getAllRFQs error:', error);
    next(error); 
  }
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
    if (request.status !== 'approved' && request.status !== 'rfq_sent' && request.status !== 'Approved' && request.status !== 'RFQ_Sent') {
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
        data: { status: 'rfq_sent' },
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

    const po_number = await generatePONumber(quotation.vendor?.name);

    // Create Purchase Order from quotation
    const po = await prisma.purchaseOrder.create({
      data: {
        po_number,
        requestId: quotation.rfq.requestId,
        quotationId: quotation.id,
        vendorId: quotation.vendorId,
        totalAmount: quotation.totalAmount,
        status: 'Sent',  // Mark as Sent since vendor is selected
        sentToVendor: true,
        sentAt: new Date(),
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
    
    console.log('Created PO:', { id: po.id, po_number: po.po_number, orderNo: po.orderNo, vendorId: po.vendorId, status: po.status });

    // Update request status
    await prisma.purchaseRequest.update({
      where: { id: quotation.rfq.requestId },
      data: { status: 'quotation_approved' },
    });

    await sendPOToVendor(po);

    // Notify requester
    await prisma.notification.create({
      data: {
        userId: quotation.rfq.request.userId,
        title: 'Purchase Order Created',
        message: `A PO (${po.po_number || po.orderNo}) has been created for your request ${quotation.rfq.request.pr_number || quotation.rfq.request.requestNo}.`,
        type: 'success',
        link: '/purchase-orders',
      },
    });

    return sendSuccess(res, { quotation, purchaseOrder: po }, 'Quotation selected and PO created.', 201);
  } catch (error) { next(error); }
};

export const sendRFQInvite = async (req, res, next) => {
  try {
    const { request_id, vendor_id, notes, validity_date } = req.body;

    const requestId = Number.parseInt(request_id, 10);
    const vendorId = Number.parseInt(vendor_id, 10);
    if (!Number.isInteger(requestId) || !Number.isInteger(vendorId)) {
      return sendError(res, 'request_id and vendor_id are required.', 400);
    }

    const [request, vendor] = await Promise.all([
      prisma.purchaseRequest.findUnique({
        where: { id: requestId },
        include: { items: { include: { product: true } } },
      }),
      prisma.vendor.findUnique({ where: { id: vendorId } }),
    ]);

    if (!request) {
      return sendError(res, 'Purchase request not found.', 404);
    }
    if (!vendor) {
      return sendError(res, 'Vendor not found.', 404);
    }

    const existing = await prisma.vendorQuote.findFirst({
      where: { requestId, vendorId }
    });

    if (existing) {
      return sendError(res, "RFQ already sent to this vendor. Use resend to send again.", 400);
    }

    const vendorQuote = await prisma.vendorQuote.create({
      data: {
        requestId,
        vendorId,
        notes: notes || null,
        validityDate: validity_date ? new Date(validity_date) : null,
        unitPrice: 0,
      }
    });

    const itemsList = (request.items || [])
      .map((item) => `• ${item.product?.name || item.customProductName || 'Item'} × ${item.quantity}`)
      .join('\n');
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">RFQ Invitation</h2>
        <p>Dear ${vendor.name},</p>
        <p>You have been invited to quote for <strong>${request.pr_number || request.requestNo}</strong>.</p>
        <pre style="background: #f3f4f6; padding: 12px; border-radius: 8px;">${itemsList || 'Please review the request in portal.'}</pre>
        ${validity_date ? `<p><strong>Validity Date:</strong> ${new Date(validity_date).toLocaleDateString('en-IN')}</p>` : ''}
        ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
      </div>
    `;
    await sendEmail(vendor.email, `RFQ Invitation - ${request.pr_number || request.requestNo}`, html);

    if (request.status === 'approved' || request.status === 'Approved') {
      await prisma.purchaseRequest.update({
        where: { id: request.id },
        data: { status: 'rfq_sent' },
      });
    }

    return sendSuccess(res, vendorQuote, "RFQ sent successfully", 201);
  } catch (err) { next(err); }
};

export const resendRFQInvite = async (req, res, next) => {
  try {
    const { quote_id } = req.params;

    const quote = await prisma.vendorQuote.findUnique({
      where: { id: parseInt(quote_id) },
      include: { vendor: true }
    });

    if (!quote) return sendError(res, "VendorQuote not found", 404);

    await prisma.vendorQuote.update({
      where: { id: parseInt(quote_id) },
      data: { resent_at: new Date() }
    });

    if (quote.vendor) {
      await sendEmail(quote.vendor.email, `REMINDER: RFQ Invitation - Request #${quote.requestId}`, `Please review the RFQ and submit your quote as soon as possible.`);
    }

    return sendSuccess(res, null, `RFQ resent to ${quote.vendor?.name || 'vendor'}`);
  } catch (err) { next(err); }
};

export const compareQuotes = async (req, res, next) => {
  try {
    const { request_id } = req.params;

    const request = await prisma.purchaseRequest.findUnique({
      where: { id: parseInt(request_id) },
      include: { items: { include: { product: true } } },
    });
    if (!request) {
      return sendError(res, 'Purchase request not found.', 404);
    }

    const quotes = await prisma.vendorQuote.findMany({
      where: { requestId: request.id },
      include: { vendor: true },
      orderBy: { unitPrice: 'asc' },
    });

    if (!quotes.length) {
      const productName = request.items.length === 1
        ? (request.items[0].product?.name || request.items[0].customProductName || 'N/A')
        : 'Multiple Items';
      const quantity = request.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      return sendSuccess(res, {
        request_id: request.id,
        product_name: productName,
        quantity,
        quotes: [],
        recommended_vendor_id: null,
        total_quotes: 0,
      });
    }

    const submittedQuotes = quotes.filter((quote) => Number(quote.unitPrice || 0) > 0);
    const max_price = Math.max(...submittedQuotes.map((quote) => Number(quote.unitPrice || 0)), 1);
    const max_days = Math.max(...submittedQuotes.map((quote) => Number(quote.deliveryDays || 0)), 1);
    const totalQuantity = request.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 1;

    const analyzedQuotes = quotes.map((quote) => {
      const unitPrice = Number(quote.unitPrice || 0);
      const hasSubmittedQuote = unitPrice > 0;
      const deliveryDays = Number(quote.deliveryDays || 0);
      const price_weight = hasSubmittedQuote ? 1 - (unitPrice / max_price) : 0;
      const delivery_weight = hasSubmittedQuote ? 1 - ((deliveryDays || max_days) / max_days) : 0;
      const rating_weight = (Number(quote.vendor?.rating || 0) / 5);
      const score = hasSubmittedQuote
        ? (price_weight * 0.4) + (delivery_weight * 0.3) + (rating_weight * 0.3)
        : 0;

      return {
        quote_id: quote.id,
        vendor_id: quote.vendorId,
        vendor_name: quote.vendor?.name || 'Unknown Vendor',
        vendor_email: quote.vendor?.email || '',
        vendor_rating: Number(quote.vendor?.rating || 0),
        unit_price: unitPrice,
        total_price: unitPrice * totalQuantity,
        delivery_days: quote.deliveryDays,
        validity_date: quote.validityDate,
        is_selected: quote.isSelected,
        score: Number(score.toFixed(4)),
      };
    });

    let recommended_vendor_id = null;
    if (analyzedQuotes.length > 0) {
      const best = [...analyzedQuotes]
        .filter((quote) => quote.unit_price > 0)
        .sort((a, b) => b.score - a.score)[0];
      recommended_vendor_id = best?.vendor_id || null;
    }

    const product_name = request.items.length === 1
      ? (request.items[0].product?.name || request.items[0].customProductName || 'N/A')
      : 'Multiple Items';
    const quantity = request.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

    return sendSuccess(res, {
      request_id: request.id,
      product_name,
      quantity,
      quotes: analyzedQuotes.sort((a, b) => {
        const aPrice = a.unit_price > 0 ? a.unit_price : Number.POSITIVE_INFINITY;
        const bPrice = b.unit_price > 0 ? b.unit_price : Number.POSITIVE_INFINITY;
        return aPrice - bPrice;
      }),
      recommended_vendor_id,
      total_quotes: analyzedQuotes.length
    });
  } catch (err) { next(err); }
};

export const selectQuoteDecision = async (req, res, next) => {
  try {
    const { quote_id } = req.params;

    const quote = await prisma.vendorQuote.findUnique({
      where: { id: parseInt(quote_id) },
      include: { vendor: true, request: { include: { items: true } } }
    });

    if (!quote) return sendError(res, 'Quote not found', 404);
    if (Number(quote.unitPrice || 0) <= 0) {
      return sendError(res, 'Cannot select a quote without unit price.', 400);
    }

    const existingPO = await prisma.purchaseOrder.findFirst({
      where: {
        requestId: quote.requestId,
      },
      select: { id: true },
    });
    if (existingPO) {
      return sendError(res, 'A purchase order already exists for this quote.', 400);
    }

    const totalQuantity = quote.request?.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 1;
    const po_number = await generatePONumber(quote.vendor?.name);

    const po = await prisma.$transaction(async (tx) => {
      await tx.vendorQuote.update({
        where: { id: parseInt(quote_id, 10) },
        data: { isSelected: true },
      });

      await tx.vendorQuote.updateMany({
        where: { requestId: quote.requestId, id: { not: parseInt(quote_id, 10) } },
        data: { isSelected: false },
      });

      const createdPO = await tx.purchaseOrder.create({
        data: {
          po_number,
          requestId: quote.requestId,
          vendorId: quote.vendorId,
          status: 'Draft',
          totalAmount: Number(quote.unitPrice) * totalQuantity,
          expectedDelivery: quote.deliveryDays
            ? new Date(Date.now() + quote.deliveryDays * 24 * 60 * 60 * 1000)
            : null,
          items: {
            create: (quote.request?.items || [])
              .filter((item) => item.productId)
              .map((item) => ({
                productId: item.productId,
                quantityOrdered: item.quantity,
                priceEach: Number(quote.unitPrice),
              })),
          },
        },
        include: {
          vendor: true,
          items: { include: { product: true } },
        },
      });

      await tx.purchaseRequest.update({
        where: { id: quote.requestId },
        data: { status: 'po_created' },
      });

      return createdPO;
    });

    await sendPOToVendor(po);

    return sendSuccess(res, po, 'Quote selected, PO generated and sent to vendor.');
  } catch (err) { next(err); }
};

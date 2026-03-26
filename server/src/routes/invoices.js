const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { resolveOrg, requireRole } = require('../middleware/org');
const { logActivity } = require('../utils/activityLog');
const { checkPlanLimit } = require('../middleware/billing');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);
router.use(resolveOrg);

// Generate invoice number
async function generateInvoiceNumber(orgId) {
  const maxRetries = 5;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const count = await prisma.invoice.count({ where: { orgId } });
    const num = `INV-${String(count + 1 + attempt).padStart(5, '0')}`;
    const exists = await prisma.invoice.findUnique({ where: { invoiceNumber: num } });
    if (!exists) return num;
  }
  // Fallback: use timestamp-based number
  return `INV-${Date.now().toString(36).toUpperCase()}`;
}

// Get all invoices
router.get('/', async (req, res) => {
  try {
    const { status, clientId, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = { orgId: req.orgId };
    if (status) where.status = status;
    if (clientId) where.clientId = clientId;

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: { client: true, _count: { select: { items: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.invoice.count({ where }),
    ]);

    res.json({ invoices, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// Get single invoice with items
router.get('/:id', async (req, res) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, orgId: req.orgId },
      include: {
        client: true,
        items: { include: { product: true } },
        payments: true,
      },
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    // Get organization info for PDF (replaces business lookup)
    const organization = await prisma.organization.findUnique({ where: { id: req.orgId } });
    res.json({ ...invoice, business: organization });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

// Create invoice
router.post('/', requireRole('OWNER', 'MANAGER', 'ACCOUNTANT'), checkPlanLimit('invoices'), async (req, res) => {
  try {
    const { clientId, issueDate, dueDate, items, discount, discountType, notes, terms } = req.body;

    if (!clientId) return res.status(400).json({ error: 'Client is required' });
    if (!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'At least one item is required' });
    for (const item of items) {
      if (!item.name || !item.name.trim()) return res.status(400).json({ error: 'All items must have a name' });
      if (!item.unitPrice || isNaN(parseFloat(item.unitPrice)) || parseFloat(item.unitPrice) < 0) return res.status(400).json({ error: 'All items must have a valid price' });
      if (!item.quantity || isNaN(parseFloat(item.quantity)) || parseFloat(item.quantity) <= 0) return res.status(400).json({ error: 'All items must have a positive quantity' });
      if (item.taxRate !== undefined && (isNaN(parseFloat(item.taxRate)) || parseFloat(item.taxRate) < 0 || parseFloat(item.taxRate) > 100)) return res.status(400).json({ error: 'Tax rate must be between 0 and 100' });
    }
    if (discount && (isNaN(parseFloat(discount)) || parseFloat(discount) < 0)) return res.status(400).json({ error: 'Discount must be zero or positive' });

    const invoiceNumber = await generateInvoiceNumber(req.orgId);

    // Calculate totals
    let subtotal = 0;
    let totalTax = 0;
    const processedItems = items.map((item) => {
      const lineTotal = parseFloat(item.quantity) * parseFloat(item.unitPrice);
      const lineTax = lineTotal * (parseFloat(item.taxRate || 17) / 100);
      subtotal += lineTotal;
      totalTax += lineTax;
      return {
        name: item.name,
        description: item.description,
        productId: item.productId || null,
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        taxRate: parseFloat(item.taxRate || 17),
        taxAmount: Math.round(lineTax * 100) / 100,
        total: Math.round((lineTotal + lineTax) * 100) / 100,
      };
    });

    let discountAmount = 0;
    if (discount) {
      discountAmount = discountType === 'PERCENTAGE'
        ? (subtotal * parseFloat(discount)) / 100
        : parseFloat(discount);
    }

    const grandTotal = subtotal + totalTax - discountAmount;

    const invoice = await prisma.invoice.create({
      data: {
        orgId: req.orgId,
        createdById: req.userId,
        clientId,
        invoiceNumber,
        issueDate: new Date(issueDate),
        dueDate: new Date(dueDate),
        subtotal: Math.round(subtotal * 100) / 100,
        taxAmount: Math.round(totalTax * 100) / 100,
        discount: Math.round(discountAmount * 100) / 100,
        discountType: discountType || 'FIXED',
        grandTotal: Math.round(grandTotal * 100) / 100,
        notes,
        terms,
        items: { create: processedItems },
      },
      include: { client: true, items: true },
    });

    await logActivity(req, {
      action: 'CREATE',
      entity: 'Invoice',
      entityId: invoice.id,
      details: `Created invoice ${invoiceNumber}`,
    });

    res.status(201).json(invoice);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

// Update invoice (only DRAFT invoices can be edited)
router.put('/:id', requireRole('OWNER', 'MANAGER', 'ACCOUNTANT'), async (req, res) => {
  try {
    const existing = await prisma.invoice.findFirst({
      where: { id: req.params.id, orgId: req.orgId },
    });
    if (!existing) return res.status(404).json({ error: 'Invoice not found' });
    if (existing.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Only DRAFT invoices can be edited' });
    }

    const { clientId, issueDate, dueDate, items, discount, discountType, notes, terms } = req.body;

    // Validate
    if (!clientId) return res.status(400).json({ error: 'Client is required' });
    if (!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'At least one item is required' });
    for (const item of items) {
      if (!item.name || !item.name.trim()) return res.status(400).json({ error: 'All items must have a name' });
      if (!item.unitPrice || isNaN(parseFloat(item.unitPrice)) || parseFloat(item.unitPrice) < 0) return res.status(400).json({ error: 'All items must have a valid price' });
      if (!item.quantity || isNaN(parseFloat(item.quantity)) || parseFloat(item.quantity) <= 0) return res.status(400).json({ error: 'All items must have a positive quantity' });
    }

    // Recalculate
    let subtotal = 0;
    let totalTax = 0;
    const processedItems = items.map((item) => {
      const lineTotal = parseFloat(item.quantity) * parseFloat(item.unitPrice);
      const lineTax = lineTotal * (parseFloat(item.taxRate || 17) / 100);
      subtotal += lineTotal;
      totalTax += lineTax;
      return {
        name: item.name,
        description: item.description,
        productId: item.productId || null,
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        taxRate: parseFloat(item.taxRate || 17),
        taxAmount: Math.round(lineTax * 100) / 100,
        total: Math.round((lineTotal + lineTax) * 100) / 100,
      };
    });

    let discountAmount = 0;
    if (discount) {
      discountAmount = discountType === 'PERCENTAGE' ? (subtotal * parseFloat(discount)) / 100 : parseFloat(discount);
    }
    const grandTotal = subtotal + totalTax - discountAmount;

    // Transaction: update invoice + delete old items + create new items
    const invoice = await prisma.$transaction(async (tx) => {
      await tx.invoiceItem.deleteMany({ where: { invoiceId: req.params.id } });

      return tx.invoice.update({
        where: { id: req.params.id },
        data: {
          clientId,
          issueDate: new Date(issueDate),
          dueDate: new Date(dueDate),
          subtotal: Math.round(subtotal * 100) / 100,
          taxAmount: Math.round(totalTax * 100) / 100,
          discount: Math.round(discountAmount * 100) / 100,
          discountType: discountType || 'FIXED',
          grandTotal: Math.round(grandTotal * 100) / 100,
          notes,
          terms,
          items: { create: processedItems },
        },
        include: { client: true, items: true },
      });
    });

    await logActivity(req, { action: 'UPDATE', entity: 'Invoice', entityId: invoice.id, details: `Edited invoice ${invoice.invoiceNumber}` });
    res.json(invoice);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update invoice' });
  }
});

// Update invoice status
router.patch('/:id/status', requireRole('OWNER', 'MANAGER', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { status } = req.body;
    const existing = await prisma.invoice.findFirst({
      where: { id: req.params.id, orgId: req.orgId },
    });
    if (!existing) return res.status(404).json({ error: 'Invoice not found' });

    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: { status },
      include: { client: true },
    });

    await logActivity(req, {
      action: 'UPDATE',
      entity: 'Invoice',
      entityId: invoice.id,
      details: `Changed invoice ${existing.invoiceNumber || invoice.invoiceNumber} status to ${status}`,
    });

    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update invoice status' });
  }
});

// Delete invoice
router.delete('/:id', requireRole('OWNER', 'MANAGER', 'ACCOUNTANT'), async (req, res) => {
  try {
    const existing = await prisma.invoice.findFirst({
      where: { id: req.params.id, orgId: req.orgId },
    });
    if (!existing) return res.status(404).json({ error: 'Invoice not found' });

    await prisma.invoice.delete({ where: { id: req.params.id } });

    await logActivity(req, {
      action: 'DELETE',
      entity: 'Invoice',
      entityId: req.params.id,
      details: `Deleted invoice ${existing.invoiceNumber}`,
    });

    res.json({ message: 'Invoice deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete invoice' });
  }
});

// Create recurring schedule for an invoice
router.post('/:id/recurring', requireRole('OWNER', 'MANAGER'), async (req, res) => {
  try {
    const { frequency, endDate } = req.body;
    if (!['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'].includes(frequency)) {
      return res.status(400).json({ error: 'Invalid frequency' });
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, orgId: req.orgId },
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    // Check if schedule already exists
    const existing = await prisma.recurringSchedule.findUnique({ where: { invoiceId: req.params.id } });
    if (existing) return res.status(400).json({ error: 'Recurring schedule already exists for this invoice' });

    // Calculate next run date
    const nextRunDate = new Date();
    switch (frequency) {
      case 'WEEKLY': nextRunDate.setDate(nextRunDate.getDate() + 7); break;
      case 'MONTHLY': nextRunDate.setMonth(nextRunDate.getMonth() + 1); break;
      case 'QUARTERLY': nextRunDate.setMonth(nextRunDate.getMonth() + 3); break;
      case 'YEARLY': nextRunDate.setFullYear(nextRunDate.getFullYear() + 1); break;
    }

    const schedule = await prisma.recurringSchedule.create({
      data: {
        orgId: req.orgId,
        invoiceId: req.params.id,
        frequency,
        nextRunDate,
        endDate: endDate ? new Date(endDate) : null,
      },
    });

    await logActivity(req, { action: 'CREATE', entity: 'RecurringSchedule', entityId: schedule.id, details: `Set ${frequency} recurring for ${invoice.invoiceNumber}` });
    res.status(201).json(schedule);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create recurring schedule' });
  }
});

// Get recurring schedule for an invoice
router.get('/:id/recurring', async (req, res) => {
  try {
    const schedule = await prisma.recurringSchedule.findUnique({
      where: { invoiceId: req.params.id },
    });
    res.json(schedule);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

// Delete recurring schedule
router.delete('/:id/recurring', requireRole('OWNER', 'MANAGER'), async (req, res) => {
  try {
    await prisma.recurringSchedule.delete({ where: { invoiceId: req.params.id } });
    res.json({ message: 'Recurring schedule removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove schedule' });
  }
});

module.exports = router;

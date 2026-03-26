const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { resolveOrg, requireRole } = require('../middleware/org');
const { logActivity } = require('../utils/activityLog');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);
router.use(resolveOrg);

// Record payment for invoice
router.post('/', requireRole('OWNER', 'MANAGER', 'ACCOUNTANT', 'CASHIER'), async (req, res) => {
  try {
    const { invoiceId, amount, method, reference, notes } = req.body;
    if (!invoiceId) return res.status(400).json({ error: 'Invoice is required' });
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) return res.status(400).json({ error: 'Amount must be a positive number' });

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, orgId: req.orgId },
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const remaining = Number(invoice.grandTotal) - Number(invoice.amountPaid);
    if (parseFloat(amount) > remaining) return res.status(400).json({ error: `Amount exceeds remaining balance of PKR ${remaining.toFixed(2)}` });

    const payment = await prisma.payment.create({
      data: {
        orgId: req.orgId,
        recordedById: req.userId,
        invoiceId,
        amount: parseFloat(amount),
        method: method || 'CASH',
        reference,
        notes,
      },
    });

    // Update invoice paid amount and status
    const newAmountPaid = Number(invoice.amountPaid) + parseFloat(amount);
    const status = newAmountPaid >= Number(invoice.grandTotal) ? 'PAID' : invoice.status;

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { amountPaid: newAmountPaid, status },
    });

    await logActivity(req, {
      action: 'CREATE',
      entity: 'Payment',
      entityId: payment.id,
      details: `Recorded payment PKR ${parseFloat(amount)} for ${invoice.invoiceNumber}`,
    });

    res.status(201).json(payment);
  } catch (err) {
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// Get payments for an invoice
router.get('/invoice/:invoiceId', async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { invoiceId: req.params.invoiceId, orgId: req.orgId },
      orderBy: { paidAt: 'desc' },
    });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

module.exports = router;

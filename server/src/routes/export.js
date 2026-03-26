const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { resolveOrg, requireRole } = require('../middleware/org');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);
router.use(resolveOrg);

function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// Export expenses as CSV
router.get('/expenses', requireRole('OWNER', 'MANAGER', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where = { orgId: req.orgId };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: { category: true },
      orderBy: { date: 'desc' },
    });

    // Fetch creator names
    const userIds = [...new Set(expenses.map(e => e.createdById))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });
    const userMap = {};
    users.forEach(u => { userMap[u.id] = u.name; });

    const headers = ['Date', 'Category', 'Description', 'Amount', 'Payment Method', 'Notes', 'Created By'];
    const rows = expenses.map(e => [
      escapeCsv(e.date ? new Date(e.date).toISOString().split('T')[0] : ''),
      escapeCsv(e.category?.name || ''),
      escapeCsv(e.description || ''),
      escapeCsv(Number(e.amount).toFixed(2)),
      escapeCsv(e.paymentMethod || ''),
      escapeCsv(e.notes || ''),
      escapeCsv(userMap[e.createdById] || 'Unknown'),
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="expenses.csv"');
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to export expenses' });
  }
});

// Export invoices as CSV
router.get('/invoices', requireRole('OWNER', 'MANAGER', 'ACCOUNTANT'), async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      where: { orgId: req.orgId },
      include: { client: true },
      orderBy: { createdAt: 'desc' },
    });

    const headers = ['Invoice#', 'Client', 'Issue Date', 'Due Date', 'Subtotal', 'Tax', 'Discount', 'Grand Total', 'Amount Paid', 'Status'];
    const rows = invoices.map(inv => [
      escapeCsv(inv.invoiceNumber),
      escapeCsv(inv.client?.name || ''),
      escapeCsv(inv.issueDate ? new Date(inv.issueDate).toISOString().split('T')[0] : ''),
      escapeCsv(inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : ''),
      escapeCsv(Number(inv.subtotal).toFixed(2)),
      escapeCsv(Number(inv.taxAmount).toFixed(2)),
      escapeCsv(Number(inv.discount).toFixed(2)),
      escapeCsv(Number(inv.grandTotal).toFixed(2)),
      escapeCsv(Number(inv.amountPaid).toFixed(2)),
      escapeCsv(inv.status),
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="invoices.csv"');
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to export invoices' });
  }
});

module.exports = router;

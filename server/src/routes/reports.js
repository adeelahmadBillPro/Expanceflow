const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { resolveOrg } = require('../middleware/org');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);
router.use(resolveOrg);

// Monthly P&L Report
router.get('/profit-loss', async (req, res) => {
  try {
    const { year } = req.query;
    const y = parseInt(year) || new Date().getFullYear();
    const months = [];

    for (let m = 0; m < 12; m++) {
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0);

      const [expenses, invoicePaid] = await Promise.all([
        prisma.expense.aggregate({
          where: { orgId: req.orgId, date: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
        prisma.payment.aggregate({
          where: { orgId: req.orgId, paidAt: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
      ]);

      const totalExpenses = Number(expenses._sum.amount || 0);
      const totalIncome = Number(invoicePaid._sum.amount || 0);

      months.push({
        month: start.toLocaleString('default', { month: 'short' }),
        monthNum: m + 1,
        year: y,
        income: totalIncome,
        expenses: totalExpenses,
        profit: totalIncome - totalExpenses,
      });
    }

    const totals = months.reduce((acc, m) => ({
      income: acc.income + m.income,
      expenses: acc.expenses + m.expenses,
      profit: acc.profit + m.profit,
    }), { income: 0, expenses: 0, profit: 0 });

    res.json({ year: y, months, totals });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate P&L report' });
  }
});

// GST Summary Report (for FBR)
router.get('/gst-summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate) : new Date();

    const invoices = await prisma.invoice.findMany({
      where: {
        orgId: req.orgId,
        issueDate: { gte: start, lte: end },
        status: { in: ['SENT', 'PAID'] },
      },
      include: { items: true, client: true },
      orderBy: { issueDate: 'asc' },
    });

    let totalSales = 0;
    let totalGST = 0;
    const invoiceSummary = invoices.map((inv) => {
      const subtotal = Number(inv.subtotal);
      const tax = Number(inv.taxAmount);
      totalSales += subtotal;
      totalGST += tax;
      return {
        invoiceNumber: inv.invoiceNumber,
        date: inv.issueDate,
        client: inv.client?.name,
        clientNTN: inv.client?.ntn,
        subtotal,
        gstAmount: tax,
        total: Number(inv.grandTotal),
      };
    });

    res.json({
      period: { start, end },
      totalSales,
      totalGST,
      totalWithGST: totalSales + totalGST,
      invoiceCount: invoices.length,
      invoices: invoiceSummary,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate GST report' });
  }
});

// Expense Summary by Category
router.get('/expense-summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();

    const grouped = await prisma.expense.groupBy({
      by: ['categoryId'],
      where: { orgId: req.orgId, date: { gte: start, lte: end } },
      _sum: { amount: true },
      _count: true,
    });

    const categoryIds = grouped.map((g) => g.categoryId);
    const categories = await prisma.category.findMany({ where: { id: { in: categoryIds } } });

    const summary = grouped.map((g) => {
      const cat = categories.find((c) => c.id === g.categoryId);
      return {
        category: cat?.name || 'Unknown',
        icon: cat?.icon,
        color: cat?.color,
        total: Number(g._sum.amount),
        count: g._count,
      };
    }).sort((a, b) => b.total - a.total);

    const grandTotal = summary.reduce((s, c) => s + c.total, 0);

    res.json({ period: { start, end }, categories: summary, grandTotal });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate expense summary' });
  }
});

module.exports = router;

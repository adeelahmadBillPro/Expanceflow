const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { resolveOrg, requireRole } = require('../middleware/org');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);
router.use(resolveOrg);

// Dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [totalExpenses, monthlyExpenses, totalInvoices, unpaidInvoices, recentExpenses] = await Promise.all([
      // Total expenses this month
      prisma.expense.aggregate({
        where: { orgId: req.orgId, date: { gte: startOfMonth, lte: endOfMonth } },
        _sum: { amount: true },
      }),
      // Monthly expenses by category
      prisma.expense.groupBy({
        by: ['categoryId'],
        where: { orgId: req.orgId, date: { gte: startOfMonth, lte: endOfMonth } },
        _sum: { amount: true },
      }),
      // Total invoices
      prisma.invoice.count({ where: { orgId: req.orgId } }),
      // Unpaid invoices total
      prisma.invoice.aggregate({
        where: { orgId: req.orgId, status: { in: ['SENT', 'OVERDUE'] } },
        _sum: { grandTotal: true },
        _count: true,
      }),
      // Recent expenses
      prisma.expense.findMany({
        where: { orgId: req.orgId },
        include: { category: true },
        orderBy: { date: 'desc' },
        take: 5,
      }),
    ]);

    // Get category names for the grouped expenses
    const categoryIds = monthlyExpenses.map((e) => e.categoryId);
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
    });

    const expensesByCategory = monthlyExpenses.map((e) => {
      const cat = categories.find((c) => c.id === e.categoryId);
      return {
        category: cat?.name || 'Unknown',
        color: cat?.color || '#6B7280',
        icon: cat?.icon || '📌',
        amount: Number(e._sum.amount),
      };
    }).sort((a, b) => b.amount - a.amount);

    res.json({
      totalSpentThisMonth: Number(totalExpenses._sum.amount || 0),
      expensesByCategory,
      totalInvoices,
      unpaidInvoicesCount: unpaidInvoices._count || 0,
      unpaidInvoicesAmount: Number(unpaidInvoices._sum.grandTotal || 0),
      recentExpenses,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Chart: Monthly expenses (last 12 months)
router.get('/chart/monthly', async (req, res) => {
  try {
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const result = await prisma.expense.aggregate({
        where: { orgId: req.orgId, date: { gte: start, lte: end } },
        _sum: { amount: true },
      });

      months.push({
        month: start.toLocaleString('default', { month: 'short' }),
        year: start.getFullYear(),
        amount: Number(result._sum.amount || 0),
      });
    }
    res.json(months);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch monthly chart' });
  }
});

// Chart: Daily expenses (current month)
router.get('/chart/daily', async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const expenses = await prisma.expense.findMany({
      where: { orgId: req.orgId, date: { gte: startOfMonth, lte: endOfMonth } },
      select: { date: true, amount: true },
      orderBy: { date: 'asc' },
    });

    const dailyMap = {};
    for (let d = 1; d <= endOfMonth.getDate(); d++) {
      const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      dailyMap[key] = 0;
    }

    expenses.forEach((e) => {
      const key = e.date.toISOString().split('T')[0];
      dailyMap[key] = (dailyMap[key] || 0) + Number(e.amount);
    });

    const daily = Object.entries(dailyMap).map(([date, amount]) => ({
      date,
      day: parseInt(date.split('-')[2]),
      amount,
    }));

    res.json(daily);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch daily chart' });
  }
});

module.exports = router;

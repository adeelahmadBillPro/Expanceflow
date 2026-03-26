const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { resolveOrg, requireRole } = require('../middleware/org');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);
router.use(resolveOrg);

// Get budgets for a month/year
router.get('/', async (req, res) => {
  try {
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const budgets = await prisma.budget.findMany({
      where: { orgId: req.orgId, month, year },
      include: { category: true },
    });

    // Get actual spending for each budgeted category
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const budgetsWithSpent = await Promise.all(
      budgets.map(async (budget) => {
        const spent = await prisma.expense.aggregate({
          where: {
            orgId: req.orgId,
            categoryId: budget.categoryId,
            date: { gte: startDate, lte: endDate },
          },
          _sum: { amount: true },
        });
        return {
          ...budget,
          spent: spent._sum.amount || 0,
          percentage: budget.amount > 0
            ? Math.round((Number(spent._sum.amount || 0) / Number(budget.amount)) * 100)
            : 0,
        };
      })
    );

    res.json(budgetsWithSpent);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch budgets' });
  }
});

// Set/update budget
router.post('/', requireRole('OWNER', 'MANAGER', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { categoryId, amount, month, year } = req.body;
    if (!categoryId) return res.status(400).json({ error: 'Category is required' });
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) return res.status(400).json({ error: 'Budget amount must be a positive number' });
    if (!month || !year) return res.status(400).json({ error: 'Month and year are required' });

    const budget = await prisma.budget.upsert({
      where: {
        orgId_categoryId_month_year: {
          orgId: req.orgId,
          categoryId,
          month: parseInt(month),
          year: parseInt(year),
        },
      },
      update: { amount: parseFloat(amount) },
      create: {
        orgId: req.orgId,
        categoryId,
        amount: parseFloat(amount),
        month: parseInt(month),
        year: parseInt(year),
      },
      include: { category: true },
    });

    res.json(budget);
  } catch (err) {
    res.status(500).json({ error: 'Failed to set budget' });
  }
});

// Delete budget
router.delete('/:id', requireRole('OWNER', 'MANAGER', 'ACCOUNTANT'), async (req, res) => {
  try {
    const existing = await prisma.budget.findFirst({
      where: { id: req.params.id, orgId: req.orgId },
    });
    if (!existing) return res.status(404).json({ error: 'Budget not found' });

    await prisma.budget.delete({ where: { id: req.params.id } });
    res.json({ message: 'Budget deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete budget' });
  }
});

module.exports = router;

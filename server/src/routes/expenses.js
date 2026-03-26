const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { resolveOrg, requireRole } = require('../middleware/org');
const upload = require('../middleware/upload');
const { checkPlanLimit } = require('../middleware/billing');
const { logActivity } = require('../utils/activityLog');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);
router.use(resolveOrg);

// Get all expenses with filters
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, category, startDate, endDate, paymentMethod, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { orgId: req.orgId };
    if (category) where.categoryId = category;
    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }
    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: { category: true },
        orderBy: { date: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.expense.count({ where }),
    ]);

    res.json({ expenses, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

// Get single expense
router.get('/:id', async (req, res) => {
  try {
    const expense = await prisma.expense.findFirst({
      where: { id: req.params.id, orgId: req.orgId },
      include: { category: true },
    });
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    res.json(expense);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch expense' });
  }
});

// Create expense
router.post('/', requireRole('OWNER', 'MANAGER', 'ACCOUNTANT', 'CASHIER'), checkPlanLimit('expenses'), upload.single('receipt'), async (req, res) => {
  try {
    const { categoryId, amount, description, notes, date, paymentMethod } = req.body;
    if (!categoryId) return res.status(400).json({ error: 'Category is required' });
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) return res.status(400).json({ error: 'Amount must be a positive number' });
    if (!date) return res.status(400).json({ error: 'Date is required' });
    if (parseFloat(amount) > 99999999) return res.status(400).json({ error: 'Amount is too large' });
    const expense = await prisma.expense.create({
      data: {
        orgId: req.orgId,
        createdById: req.userId,
        categoryId,
        amount: parseFloat(amount),
        description,
        notes,
        date: new Date(date),
        paymentMethod: paymentMethod || 'CASH',
        receiptUrl: req.file ? (req.file.path || '/uploads/' + req.file.filename) : null,
      },
      include: { category: true },
    });
    await logActivity(req, {
      action: 'CREATE',
      entity: 'Expense',
      entityId: expense.id,
      details: `Added expense: ${description || 'N/A'} - PKR ${parseFloat(amount)}`,
    });

    // Check budget alert
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const budget = await prisma.budget.findFirst({
        where: { orgId: req.orgId, categoryId, month: now.getMonth() + 1, year: now.getFullYear() },
        include: { category: true },
      });

      if (budget) {
        const spent = await prisma.expense.aggregate({
          where: { orgId: req.orgId, categoryId, date: { gte: startOfMonth, lte: endOfMonth } },
          _sum: { amount: true },
        });
        const totalSpent = Number(spent._sum.amount || 0);
        const pct = Math.round((totalSpent / Number(budget.amount)) * 100);

        if (pct >= 100) {
          await prisma.notification.create({
            data: {
              orgId: req.orgId,
              type: 'budget_warning',
              title: `Budget Exceeded: ${budget.category.name}`,
              message: `You've spent PKR ${totalSpent.toLocaleString()} of PKR ${Number(budget.amount).toLocaleString()} (${pct}%) on ${budget.category.name} this month.`,
            },
          });
        } else if (pct >= 80) {
          // Check if we already sent an 80% alert this month
          const existingAlert = await prisma.notification.findFirst({
            where: { orgId: req.orgId, type: 'budget_warning', title: { contains: budget.category.name }, createdAt: { gte: startOfMonth } },
          });
          if (!existingAlert) {
            await prisma.notification.create({
              data: {
                orgId: req.orgId,
                type: 'budget_warning',
                title: `Budget Warning: ${budget.category.name}`,
                message: `You've used ${pct}% of your ${budget.category.name} budget (PKR ${totalSpent.toLocaleString()} of PKR ${Number(budget.amount).toLocaleString()}).`,
              },
            });
          }
        }
      }
    } catch {} // Don't fail expense creation on notification error

    res.status(201).json(expense);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

// Update expense
router.put('/:id', requireRole('OWNER', 'MANAGER', 'ACCOUNTANT'), upload.single('receipt'), async (req, res) => {
  try {
    const existing = await prisma.expense.findFirst({
      where: { id: req.params.id, orgId: req.orgId },
    });
    if (!existing) return res.status(404).json({ error: 'Expense not found' });

    const { categoryId, amount, description, notes, date, paymentMethod } = req.body;
    if (amount && (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0)) return res.status(400).json({ error: 'Amount must be a positive number' });
    const data = {};
    if (categoryId) data.categoryId = categoryId;
    if (amount) data.amount = parseFloat(amount);
    if (description !== undefined) data.description = description;
    if (notes !== undefined) data.notes = notes;
    if (date) data.date = new Date(date);
    if (paymentMethod) data.paymentMethod = paymentMethod;
    if (req.file) data.receiptUrl = req.file.path || '/uploads/' + req.file.filename;

    const expense = await prisma.expense.update({
      where: { id: req.params.id },
      data,
      include: { category: true },
    });
    res.json(expense);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

// Delete expense
router.delete('/:id', requireRole('OWNER', 'MANAGER', 'ACCOUNTANT'), async (req, res) => {
  try {
    const existing = await prisma.expense.findFirst({
      where: { id: req.params.id, orgId: req.orgId },
    });
    if (!existing) return res.status(404).json({ error: 'Expense not found' });

    await prisma.expense.delete({ where: { id: req.params.id } });

    await logActivity(req, {
      action: 'DELETE',
      entity: 'Expense',
      entityId: req.params.id,
      details: 'Deleted expense',
    });

    res.json({ message: 'Expense deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

module.exports = router;

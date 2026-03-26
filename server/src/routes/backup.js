const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { resolveOrg, requireRole } = require('../middleware/org');
const { logActivity } = require('../utils/activityLog');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);
router.use(resolveOrg);

// Download full backup as JSON (Owner only)
router.get('/download', requireRole('OWNER'), async (req, res) => {
  try {
    const [org, members, categories, expenses, budgets, clients, products, invoices, payments] = await Promise.all([
      prisma.organization.findUnique({ where: { id: req.orgId } }),
      prisma.teamMember.findMany({
        where: { orgId: req.orgId },
        include: { user: { select: { name: true, email: true, phone: true } } },
      }),
      prisma.category.findMany({ where: { OR: [{ orgId: req.orgId }, { isDefault: true }] } }),
      prisma.expense.findMany({ where: { orgId: req.orgId }, include: { category: true }, orderBy: { date: 'desc' } }),
      prisma.budget.findMany({ where: { orgId: req.orgId }, include: { category: true } }),
      prisma.client.findMany({ where: { orgId: req.orgId } }),
      prisma.product.findMany({ where: { orgId: req.orgId } }),
      prisma.invoice.findMany({
        where: { orgId: req.orgId },
        include: { client: true, items: true, payments: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.payment.findMany({ where: { orgId: req.orgId }, orderBy: { paidAt: 'desc' } }),
    ]);

    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      organization: org,
      summary: {
        members: members.length,
        categories: categories.filter((c) => c.orgId === req.orgId).length,
        expenses: expenses.length,
        budgets: budgets.length,
        clients: clients.length,
        products: products.length,
        invoices: invoices.length,
        payments: payments.length,
      },
      data: {
        members: members.map((m) => ({
          name: m.user.name,
          email: m.user.email,
          phone: m.user.phone,
          role: m.teamRole,
          isActive: m.isActive,
        })),
        categories: categories.filter((c) => c.orgId === req.orgId).map((c) => ({
          name: c.name, icon: c.icon, color: c.color, type: c.type,
        })),
        expenses: expenses.map((e) => ({
          amount: Number(e.amount), date: e.date, category: e.category?.name,
          description: e.description, notes: e.notes, paymentMethod: e.paymentMethod,
        })),
        budgets: budgets.map((b) => ({
          category: b.category?.name, amount: Number(b.amount), month: b.month, year: b.year,
        })),
        clients,
        products,
        invoices: invoices.map((inv) => ({
          ...inv,
          items: inv.items,
          payments: inv.payments,
          grandTotal: Number(inv.grandTotal),
          amountPaid: Number(inv.amountPaid),
        })),
      },
    };

    await logActivity(req, { action: 'BACKUP', entity: 'Organization', details: 'Full backup downloaded' });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=expenseflow-backup-${new Date().toISOString().split('T')[0]}.json`);
    res.json(backup);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

// Get backup stats (what would be backed up)
router.get('/stats', requireRole('OWNER', 'MANAGER'), async (req, res) => {
  try {
    const [expenses, invoices, clients, products, members] = await Promise.all([
      prisma.expense.count({ where: { orgId: req.orgId } }),
      prisma.invoice.count({ where: { orgId: req.orgId } }),
      prisma.client.count({ where: { orgId: req.orgId } }),
      prisma.product.count({ where: { orgId: req.orgId } }),
      prisma.teamMember.count({ where: { orgId: req.orgId } }),
    ]);

    // Check last backup from activity log
    const lastBackup = await prisma.activityLog.findFirst({
      where: { orgId: req.orgId, action: 'BACKUP' },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      counts: { expenses, invoices, clients, products, members },
      lastBackupAt: lastBackup?.createdAt || null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch backup stats' });
  }
});

module.exports = router;

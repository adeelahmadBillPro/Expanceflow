const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { resolveOrg, requireRole } = require('../middleware/org');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);
router.use(resolveOrg);

const PLAN_LIMITS = {
  FREE: { expenses: 50, invoices: 5, clients: 5, members: 2 },
  PRO: { expenses: -1, invoices: -1, clients: 50, members: 10 },
  BUSINESS: { expenses: -1, invoices: -1, clients: -1, members: -1 },
};

// Get current plan info + usage + pending request
router.get('/plan', async (req, res) => {
  try {
    const owner = await prisma.user.findUnique({
      where: { id: req.org.ownerId },
      select: { plan: true, trialEndsAt: true, planExpiresAt: true },
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [expenseCount, invoiceCount, clientCount, memberCount, pendingRequest] = await Promise.all([
      prisma.expense.count({ where: { orgId: req.orgId, createdAt: { gte: startOfMonth, lte: endOfMonth } } }),
      prisma.invoice.count({ where: { orgId: req.orgId, createdAt: { gte: startOfMonth, lte: endOfMonth } } }),
      prisma.client.count({ where: { orgId: req.orgId } }),
      prisma.teamMember.count({ where: { orgId: req.orgId, isActive: true } }),
      prisma.planRequest.findFirst({
        where: { orgId: req.orgId, status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const limits = PLAN_LIMITS[owner.plan];
    const isTrialActive = owner.trialEndsAt && new Date(owner.trialEndsAt) > now;
    const isPlanExpired = owner.planExpiresAt && new Date(owner.planExpiresAt) < now;
    const trialDaysLeft = isTrialActive ? Math.ceil((new Date(owner.trialEndsAt) - now) / 86400000) : 0;

    res.json({
      plan: owner.plan,
      teamRole: req.teamRole,
      trialEndsAt: owner.trialEndsAt,
      planExpiresAt: owner.planExpiresAt,
      isTrialActive,
      isPlanExpired: owner.plan !== 'FREE' && isPlanExpired,
      trialDaysLeft,
      usage: { expenses: expenseCount, invoices: invoiceCount, clients: clientCount, members: memberCount },
      limits,
      pendingRequest,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch plan info' });
  }
});

// Request plan upgrade (Owner only — does NOT activate, just creates request)
router.post('/request-upgrade', requireRole('OWNER'), async (req, res) => {
  try {
    const { plan } = req.body;
    if (!['PRO', 'BUSINESS'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan. Choose PRO or BUSINESS.' });
    }

    const owner = await prisma.user.findUnique({ where: { id: req.org.ownerId } });
    if (owner.plan === plan) {
      return res.status(400).json({ error: 'You are already on this plan' });
    }

    // Check for existing pending request
    const existing = await prisma.planRequest.findFirst({
      where: { orgId: req.orgId, status: 'PENDING' },
    });
    if (existing) {
      return res.status(400).json({ error: 'You already have a pending upgrade request. Please wait for admin approval.' });
    }

    const request = await prisma.planRequest.create({
      data: {
        orgId: req.orgId,
        userId: req.userId,
        requestedPlan: plan,
        currentPlan: owner.plan,
      },
    });

    res.status(201).json({ message: 'Upgrade request submitted. Admin will review and approve.', request });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit upgrade request' });
  }
});

// Cancel pending request (Owner only)
router.delete('/cancel-request/:id', requireRole('OWNER'), async (req, res) => {
  try {
    const request = await prisma.planRequest.findFirst({
      where: { id: req.params.id, orgId: req.orgId, status: 'PENDING' },
    });
    if (!request) return res.status(404).json({ error: 'Request not found' });

    await prisma.planRequest.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED', adminNote: 'Cancelled by owner' },
    });
    res.json({ message: 'Request cancelled' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel request' });
  }
});

// Get request history
router.get('/requests', async (req, res) => {
  try {
    const requests = await prisma.planRequest.findMany({
      where: { orgId: req.orgId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

module.exports = router;

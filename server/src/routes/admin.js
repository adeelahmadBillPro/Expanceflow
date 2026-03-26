const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);
router.use(requireAdmin);

// Get all users with stats
router.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, email: true, name: true, role: true, isActive: true, createdAt: true,
        _count: { select: { teamMembers: true, ownedOrgs: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get admin dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const [totalUsers, totalExpenses, totalInvoices, activeUsers] = await Promise.all([
      prisma.user.count(),
      prisma.expense.count(),
      prisma.invoice.count(),
      prisma.user.count({ where: { isActive: true } }),
    ]);

    // Users registered per month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const recentUsers = await prisma.user.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true },
    });

    const monthlySignups = {};
    recentUsers.forEach((u) => {
      const key = `${u.createdAt.getFullYear()}-${String(u.createdAt.getMonth() + 1).padStart(2, '0')}`;
      monthlySignups[key] = (monthlySignups[key] || 0) + 1;
    });

    res.json({ totalUsers, totalExpenses, totalInvoices, activeUsers, monthlySignups });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

// Toggle user active status
router.patch('/users/:id/toggle', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: !user.isActive },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Change user role
router.patch('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['USER', 'ADMIN'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    if (req.params.id === req.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ========================
// PLAN REQUEST MANAGEMENT
// ========================

// Get all pending plan requests
router.get('/plan-requests', async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status) where.status = status;

    const requests = await prisma.planRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Enrich with user and org info
    const enriched = await Promise.all(requests.map(async (r) => {
      const user = await prisma.user.findUnique({ where: { id: r.userId }, select: { name: true, email: true, phone: true } });
      const org = await prisma.organization.findUnique({ where: { id: r.orgId }, select: { name: true } });
      return { ...r, userName: user?.name, userEmail: user?.email, userPhone: user?.phone, orgName: org?.name };
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch plan requests' });
  }
});

// Approve plan request
router.patch('/plan-requests/:id/approve', async (req, res) => {
  try {
    const { durationMonths } = req.body; // How many months to activate
    const months = parseInt(durationMonths) || 1;

    const request = await prisma.planRequest.findUnique({ where: { id: req.params.id } });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'PENDING') return res.status(400).json({ error: 'Request already processed' });

    // Activate the plan on the org owner
    const org = await prisma.organization.findUnique({ where: { id: request.orgId } });
    const planExpiresAt = new Date();
    planExpiresAt.setMonth(planExpiresAt.getMonth() + months);

    await prisma.user.update({
      where: { id: org.ownerId },
      data: {
        plan: request.requestedPlan,
        planExpiresAt,
        trialEndsAt: null,
      },
    });

    // Update request status
    const updated = await prisma.planRequest.update({
      where: { id: req.params.id },
      data: {
        status: 'APPROVED',
        reviewedBy: req.userId,
        reviewedAt: new Date(),
        adminNote: req.body.adminNote || `Approved for ${months} month(s)`,
      },
    });

    // Notify the owner
    await prisma.notification.create({
      data: {
        orgId: request.orgId,
        userId: request.userId,
        type: 'plan_approved',
        title: 'Plan Upgrade Approved',
        message: `Your upgrade to ${request.requestedPlan} has been approved! Active until ${planExpiresAt.toLocaleDateString()}.`,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to approve request' });
  }
});

// Reject plan request
router.patch('/plan-requests/:id/reject', async (req, res) => {
  try {
    const request = await prisma.planRequest.findUnique({ where: { id: req.params.id } });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'PENDING') return res.status(400).json({ error: 'Request already processed' });

    const updated = await prisma.planRequest.update({
      where: { id: req.params.id },
      data: {
        status: 'REJECTED',
        reviewedBy: req.userId,
        reviewedAt: new Date(),
        adminNote: req.body.adminNote || 'Rejected by admin',
      },
    });

    // Notify the owner
    await prisma.notification.create({
      data: {
        orgId: request.orgId,
        userId: request.userId,
        type: 'plan_rejected',
        title: 'Plan Upgrade Rejected',
        message: `Your upgrade request to ${request.requestedPlan} was not approved. ${req.body.adminNote || ''}`,
      },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject request' });
  }
});

module.exports = router;

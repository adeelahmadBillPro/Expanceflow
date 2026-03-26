const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { resolveOrg, requireRole } = require('../middleware/org');
const { logActivity } = require('../utils/activityLog');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);
router.use(resolveOrg);

// Get all team members
router.get('/', async (req, res) => {
  try {
    const members = await prisma.teamMember.findMany({
      where: { orgId: req.orgId },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, avatar: true, createdAt: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

// Add team member (invite by email or phone)
router.post('/', requireRole('OWNER', 'MANAGER'), async (req, res) => {
  try {
    const { name, email, phone, password, teamRole } = req.body;

    if (!name || !password) {
      return res.status(400).json({ error: 'Name and password are required' });
    }
    if (!email && !phone) {
      return res.status(400).json({ error: 'Email or phone is required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    if (!['MANAGER', 'ACCOUNTANT', 'CASHIER', 'VIEWER'].includes(teamRole)) {
      return res.status(400).json({ error: 'Invalid role. Choose: MANAGER, ACCOUNTANT, CASHIER, or VIEWER' });
    }

    // Check if user exists
    let user;
    if (email) {
      user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    }
    if (!user && phone) {
      user = await prisma.user.findUnique({ where: { phone: phone.replace(/[\s-]/g, '') } });
    }

    if (user) {
      // Check if already a member
      const existing = await prisma.teamMember.findUnique({
        where: { orgId_userId: { orgId: req.orgId, userId: user.id } },
      });
      if (existing) {
        return res.status(400).json({ error: 'This person is already a team member' });
      }
    } else {
      // Create new user account for the employee
      const hashedPassword = await bcrypt.hash(password, 12);
      user = await prisma.user.create({
        data: {
          name: name.trim(),
          email: email ? email.toLowerCase().trim() : null,
          phone: phone ? phone.replace(/[\s-]/g, '') : null,
          password: hashedPassword,
        },
      });
    }

    // Add as team member
    const member = await prisma.teamMember.create({
      data: {
        orgId: req.orgId,
        userId: user.id,
        teamRole,
      },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, avatar: true } },
      },
    });

    await logActivity(req, {
      action: 'CREATE',
      entity: 'TeamMember',
      entityId: member.id,
      details: `Added ${name} as ${teamRole}`,
    });

    res.status(201).json(member);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add team member' });
  }
});

// Update team member role
router.patch('/:id/role', requireRole('OWNER', 'MANAGER'), async (req, res) => {
  try {
    const { teamRole } = req.body;
    if (!['MANAGER', 'ACCOUNTANT', 'CASHIER', 'VIEWER'].includes(teamRole)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const member = await prisma.teamMember.findFirst({
      where: { id: req.params.id, orgId: req.orgId },
    });
    if (!member) return res.status(404).json({ error: 'Member not found' });
    if (member.teamRole === 'OWNER') {
      return res.status(400).json({ error: 'Cannot change owner role' });
    }

    const updated = await prisma.teamMember.update({
      where: { id: req.params.id },
      data: { teamRole },
      include: { user: { select: { id: true, name: true, email: true, phone: true } } },
    });

    await logActivity(req, {
      action: 'UPDATE',
      entity: 'TeamMember',
      entityId: updated.id,
      details: `Changed ${updated.user?.name || 'member'} role to ${teamRole}`,
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// Toggle team member active/inactive
router.patch('/:id/toggle', requireRole('OWNER', 'MANAGER'), async (req, res) => {
  try {
    const member = await prisma.teamMember.findFirst({
      where: { id: req.params.id, orgId: req.orgId },
    });
    if (!member) return res.status(404).json({ error: 'Member not found' });
    if (member.teamRole === 'OWNER') {
      return res.status(400).json({ error: 'Cannot disable owner' });
    }

    const updated = await prisma.teamMember.update({
      where: { id: req.params.id },
      data: { isActive: !member.isActive },
      include: { user: { select: { id: true, name: true, email: true, phone: true } } },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle member' });
  }
});

// Remove team member
router.delete('/:id', requireRole('OWNER', 'MANAGER'), async (req, res) => {
  try {
    const member = await prisma.teamMember.findFirst({
      where: { id: req.params.id, orgId: req.orgId },
    });
    if (!member) return res.status(404).json({ error: 'Member not found' });
    if (member.teamRole === 'OWNER') {
      return res.status(400).json({ error: 'Cannot remove owner' });
    }

    // Fetch user name before deleting
    const memberWithUser = await prisma.teamMember.findFirst({
      where: { id: req.params.id },
      include: { user: { select: { name: true } } },
    });

    await prisma.teamMember.delete({ where: { id: req.params.id } });

    await logActivity(req, {
      action: 'DELETE',
      entity: 'TeamMember',
      entityId: req.params.id,
      details: `Removed ${memberWithUser?.user?.name || 'member'} from team`,
    });

    res.json({ message: 'Member removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

module.exports = router;

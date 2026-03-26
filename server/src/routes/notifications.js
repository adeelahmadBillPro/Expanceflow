const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { resolveOrg } = require('../middleware/org');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);
router.use(resolveOrg);

// Get notifications for the user
router.get('/', async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        orgId: req.orgId,
        OR: [
          { userId: req.userId },
          { userId: null },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Get unread count
router.get('/unread-count', async (req, res) => {
  try {
    const count = await prisma.notification.count({
      where: {
        orgId: req.orgId,
        isRead: false,
        OR: [
          { userId: req.userId },
          { userId: null },
        ],
      },
    });

    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// Mark all notifications as read (MUST be before /:id/read)
router.patch('/read-all', async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: {
        orgId: req.orgId,
        isRead: false,
        OR: [
          { userId: req.userId },
          { userId: null },
        ],
      },
      data: { isRead: true },
    });

    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

// Mark single notification as read
router.patch('/:id/read', async (req, res) => {
  try {
    const notification = await prisma.notification.findFirst({
      where: {
        id: req.params.id,
        orgId: req.orgId,
        OR: [{ userId: req.userId }, { userId: null }],
      },
    });
    if (!notification) return res.status(404).json({ error: 'Notification not found' });

    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

module.exports = router;

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function logActivity(req, { action, entity, entityId, details }) {
  try {
    await prisma.activityLog.create({
      data: {
        orgId: req.orgId,
        userId: req.userId,
        userName: req.userName || 'Unknown',
        action,
        entity,
        entityId,
        details,
        ipAddress: req.ip || req.connection?.remoteAddress,
      },
    });
  } catch (err) {
    console.error('Failed to log activity:', err.message);
  }
}
module.exports = { logActivity };

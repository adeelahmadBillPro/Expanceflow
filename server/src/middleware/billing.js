const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PLAN_LIMITS = {
  FREE: { expenses: 50, invoices: 5, clients: 5, members: 2 },
  PRO: { expenses: -1, invoices: -1, clients: 50, members: 10 },
  BUSINESS: { expenses: -1, invoices: -1, clients: -1, members: -1 },
};

function checkPlanLimit(resource) {
  return async (req, res, next) => {
    try {
      const owner = await prisma.user.findUnique({
        where: { id: req.org.ownerId },
        select: { plan: true, trialEndsAt: true },
      });

      const plan = owner.plan;
      const limit = PLAN_LIMITS[plan]?.[resource];

      // No limit or unlimited
      if (!limit || limit === -1) return next();

      // Check trial - during trial, allow unlimited
      if (owner.trialEndsAt && new Date(owner.trialEndsAt) > new Date()) return next();

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      let count;
      switch (resource) {
        case 'expenses':
          count = await prisma.expense.count({ where: { orgId: req.orgId, createdAt: { gte: startOfMonth, lte: endOfMonth } } });
          break;
        case 'invoices':
          count = await prisma.invoice.count({ where: { orgId: req.orgId, createdAt: { gte: startOfMonth, lte: endOfMonth } } });
          break;
        case 'clients':
          count = await prisma.client.count({ where: { orgId: req.orgId } });
          break;
        case 'members':
          count = await prisma.teamMember.count({ where: { orgId: req.orgId, isActive: true } });
          break;
        default:
          return next();
      }

      if (count >= limit) {
        return res.status(403).json({
          error: `${plan} plan limit reached: ${limit} ${resource}/month. Upgrade to add more.`,
          limit,
          current: count,
          resource,
        });
      }

      next();
    } catch (err) {
      next(); // Don't block on billing check errors
    }
  };
}

module.exports = { checkPlanLimit };

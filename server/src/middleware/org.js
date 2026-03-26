const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Resolves the user's active organization and team role
// Attaches req.orgId, req.teamRole, req.org to the request
async function resolveOrg(req, res, next) {
  try {
    // Check if user has a team membership
    const membership = await prisma.teamMember.findFirst({
      where: { userId: req.userId, isActive: true },
      include: { organization: true },
      orderBy: { joinedAt: 'asc' }, // First org they joined
    });

    if (!membership) {
      return res.status(403).json({ error: 'No organization found. Please create or join one.' });
    }

    req.orgId = membership.orgId;
    req.teamRole = membership.teamRole;
    req.org = membership.organization;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Failed to resolve organization' });
  }
}

// Permission check middleware factory
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.teamRole)) {
      return res.status(403).json({
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${req.teamRole}`,
      });
    }
    next();
  };
}

// Role permission map for reference:
// OWNER:      Everything + billing + delete org + manage all members
// MANAGER:    Everything + manage members (except billing, delete org)
// ACCOUNTANT: Expenses, invoices, reports, clients, products, budgets
// CASHIER:    Add expenses, record payments (read-only for rest)
// VIEWER:     Read-only dashboard

module.exports = { resolveOrg, requireRole };

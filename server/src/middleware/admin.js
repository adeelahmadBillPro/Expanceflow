const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function requireAdmin(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: 'Authorization failed' });
  }
}

module.exports = { requireAdmin };

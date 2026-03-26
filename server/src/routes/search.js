const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { resolveOrg } = require('../middleware/org');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);
router.use(resolveOrg);

router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const query = q.trim();

    const [expenses, invoices, clients, products] = await Promise.all([
      prisma.expense.findMany({
        where: {
          orgId: req.orgId,
          OR: [
            { description: { contains: query, mode: 'insensitive' } },
            { notes: { contains: query, mode: 'insensitive' } },
          ],
        },
        include: { category: true },
        take: 5,
        orderBy: { date: 'desc' },
      }),
      prisma.invoice.findMany({
        where: {
          orgId: req.orgId,
          OR: [
            { invoiceNumber: { contains: query, mode: 'insensitive' } },
            { notes: { contains: query, mode: 'insensitive' } },
          ],
        },
        include: { client: true },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.client.findMany({
        where: {
          orgId: req.orgId,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { phone: { contains: query, mode: 'insensitive' } },
            { company: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 5,
      }),
      prisma.product.findMany({
        where: {
          orgId: req.orgId,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { barcode: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 5,
      }),
    ]);

    res.json({ expenses, invoices, clients, products });
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;

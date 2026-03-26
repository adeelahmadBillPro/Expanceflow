const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { resolveOrg, requireRole } = require('../middleware/org');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);
router.use(resolveOrg);

// Get all clients
router.get('/', async (req, res) => {
  try {
    const clients = await prisma.client.findMany({
      where: { orgId: req.orgId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { invoices: true } } },
    });
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

// Get single client
router.get('/:id', async (req, res) => {
  try {
    const client = await prisma.client.findFirst({
      where: { id: req.params.id, orgId: req.orgId },
      include: { invoices: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(client);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch client' });
  }
});

// Create client
router.post('/', requireRole('OWNER', 'MANAGER', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { name, email, phone, company, address, city, ntn, notes } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Client name is required' });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email format' });
    const client = await prisma.client.create({
      data: { orgId: req.orgId, name, email, phone, company, address, city, ntn, notes },
    });
    res.status(201).json(client);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create client' });
  }
});

// Import clients from CSV data
router.post('/import', requireRole('OWNER', 'MANAGER', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { clients } = req.body;
    const created = await prisma.client.createMany({
      data: clients.map((c) => ({ ...c, orgId: req.orgId })),
    });
    res.status(201).json({ count: created.count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to import clients' });
  }
});

// Update client
router.put('/:id', requireRole('OWNER', 'MANAGER', 'ACCOUNTANT'), async (req, res) => {
  try {
    const existing = await prisma.client.findFirst({
      where: { id: req.params.id, orgId: req.orgId },
    });
    if (!existing) return res.status(404).json({ error: 'Client not found' });

    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(client);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update client' });
  }
});

// Delete client
router.delete('/:id', requireRole('OWNER', 'MANAGER', 'ACCOUNTANT'), async (req, res) => {
  try {
    const existing = await prisma.client.findFirst({
      where: { id: req.params.id, orgId: req.orgId },
    });
    if (!existing) return res.status(404).json({ error: 'Client not found' });

    await prisma.client.delete({ where: { id: req.params.id } });
    res.json({ message: 'Client deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

// Client Statement - all invoices and payments for a client
router.get('/:id/statement', async (req, res) => {
  try {
    const client = await prisma.client.findFirst({
      where: { id: req.params.id, orgId: req.orgId },
    });
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const invoices = await prisma.invoice.findMany({
      where: { clientId: req.params.id, orgId: req.orgId },
      include: { items: true, payments: true },
      orderBy: { issueDate: 'desc' },
    });

    const totalBilled = invoices.reduce((s, i) => s + Number(i.grandTotal), 0);
    const totalPaid = invoices.reduce((s, i) => s + Number(i.amountPaid), 0);
    const totalOutstanding = totalBilled - totalPaid;

    res.json({
      client,
      invoices,
      summary: { totalBilled, totalPaid, totalOutstanding, invoiceCount: invoices.length },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate statement' });
  }
});

module.exports = router;

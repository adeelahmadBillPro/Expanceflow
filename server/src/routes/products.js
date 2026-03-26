const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { resolveOrg, requireRole } = require('../middleware/org');
const { logActivity } = require('../utils/activityLog');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);
router.use(resolveOrg);

// Get all products
router.get('/', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { orgId: req.orgId },
      orderBy: { name: 'asc' },
    });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Lookup product by barcode (org-scoped)
router.get('/barcode/:code', async (req, res) => {
  try {
    const product = await prisma.product.findFirst({
      where: { orgId: req.orgId, barcode: req.params.code, isActive: true },
    });
    if (!product) return res.status(404).json({ error: 'No product found with this barcode in your catalog' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Barcode lookup failed' });
  }
});

// Assign barcode to product
router.patch('/:id/barcode', requireRole('OWNER', 'MANAGER', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { barcode } = req.body;
    if (!barcode) return res.status(400).json({ error: 'Barcode is required' });

    const existing = await prisma.product.findFirst({
      where: { id: req.params.id, orgId: req.orgId },
    });
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    // Check duplicate barcode within same org
    const duplicate = await prisma.product.findFirst({
      where: { orgId: req.orgId, barcode, id: { not: req.params.id } },
    });
    if (duplicate) return res.status(400).json({ error: `Barcode already assigned to "${duplicate.name}"` });

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { barcode },
    });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Failed to assign barcode' });
  }
});

// Create product
router.post('/', requireRole('OWNER', 'MANAGER', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { name, description, price, unit, taxRate, barcode } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Product name is required' });
    if (!price || isNaN(parseFloat(price)) || parseFloat(price) < 0) return res.status(400).json({ error: 'Price must be zero or positive' });
    if (taxRate !== undefined && (isNaN(parseFloat(taxRate)) || parseFloat(taxRate) < 0 || parseFloat(taxRate) > 100)) return res.status(400).json({ error: 'Tax rate must be between 0 and 100' });

    if (barcode) {
      const dup = await prisma.product.findFirst({ where: { orgId: req.orgId, barcode } });
      if (dup) return res.status(400).json({ error: `Barcode already assigned to "${dup.name}"` });
    }

    const product = await prisma.product.create({
      data: {
        orgId: req.orgId,
        name,
        description,
        price: parseFloat(price),
        unit: unit || 'piece',
        taxRate: taxRate !== undefined ? parseFloat(taxRate) : 17,
        barcode: barcode || null,
      },
    });
    await logActivity(req, { action: 'CREATE', entity: 'Product', entityId: product.id, details: 'Added product: ' + name });
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update product
router.put('/:id', requireRole('OWNER', 'MANAGER', 'ACCOUNTANT'), async (req, res) => {
  try {
    const existing = await prisma.product.findFirst({
      where: { id: req.params.id, orgId: req.orgId },
    });
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    const { name, description, price, unit, taxRate, isActive } = req.body;
    const data = {};
    if (name) data.name = name;
    if (description !== undefined) data.description = description;
    if (price !== undefined) data.price = parseFloat(price);
    if (unit) data.unit = unit;
    if (taxRate !== undefined) data.taxRate = parseFloat(taxRate);
    if (isActive !== undefined) data.isActive = isActive;

    const product = await prisma.product.update({ where: { id: req.params.id }, data });
    await logActivity(req, { action: 'UPDATE', entity: 'Product', entityId: product.id, details: 'Updated product: ' + product.name });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product
router.delete('/:id', requireRole('OWNER', 'MANAGER', 'ACCOUNTANT'), async (req, res) => {
  try {
    const existing = await prisma.product.findFirst({
      where: { id: req.params.id, orgId: req.orgId },
    });
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    await prisma.product.delete({ where: { id: req.params.id } });
    await logActivity(req, { action: 'DELETE', entity: 'Product', entityId: req.params.id, details: 'Deleted product' });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router;

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { resolveOrg, requireRole } = require('../middleware/org');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);
router.use(resolveOrg);

// Get all categories (defaults + org's custom)
router.get('/', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { OR: [{ isDefault: true, orgId: null }, { orgId: req.orgId }] },
      orderBy: { name: 'asc' },
    });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Create custom category
router.post('/', requireRole('OWNER', 'MANAGER', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { name, icon, color, type } = req.body;
    const category = await prisma.category.create({
      data: { name, icon, color, type: type || 'EXPENSE', orgId: req.orgId },
    });
    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update custom category
router.put('/:id', requireRole('OWNER', 'MANAGER', 'ACCOUNTANT'), async (req, res) => {
  try {
    const existing = await prisma.category.findFirst({
      where: { id: req.params.id, orgId: req.orgId, isDefault: false },
    });
    if (!existing) return res.status(404).json({ error: 'Category not found or is a default' });

    const { name, icon, color } = req.body;
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: { name, icon, color },
    });
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete custom category
router.delete('/:id', requireRole('OWNER', 'MANAGER', 'ACCOUNTANT'), async (req, res) => {
  try {
    const existing = await prisma.category.findFirst({
      where: { id: req.params.id, orgId: req.orgId, isDefault: false },
    });
    if (!existing) return res.status(404).json({ error: 'Category not found or is a default' });

    await prisma.category.delete({ where: { id: req.params.id } });
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

module.exports = router;

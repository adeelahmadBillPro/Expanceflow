const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { resolveOrg, requireRole } = require('../middleware/org');
const upload = require('../middleware/upload');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);
router.use(resolveOrg);

// Get business profile (organization data)
router.get('/', async (req, res) => {
  try {
    const organization = await prisma.organization.findUnique({ where: { id: req.orgId } });
    if (!organization) return res.status(404).json({ error: 'Organization not found' });
    res.json(organization);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch business profile' });
  }
});

// Update business profile (organization data)
router.put('/', requireRole('OWNER', 'MANAGER'), upload.single('logo'), async (req, res) => {
  try {
    const { name, email, phone, address, city, ntn, bankName, bankAccount, bankIban, gstRate } = req.body;
    const data = {
      name, email, phone, address, city, ntn,
      bankName, bankAccount, bankIban,
      gstRate: gstRate ? parseFloat(gstRate) : 17,
    };
    if (req.file) data.logo = `/uploads/${req.file.filename}`;

    const organization = await prisma.organization.update({
      where: { id: req.orgId },
      data,
    });
    res.json(organization);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update business profile' });
  }
});

module.exports = router;

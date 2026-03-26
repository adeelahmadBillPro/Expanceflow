const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { resolveOrg, requireRole } = require('../middleware/org');
const { logActivity } = require('../utils/activityLog');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);
router.use(resolveOrg);

// Valid payment methods
const VALID_PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'JAZZCASH', 'EASYPAISA', 'CHEQUE', 'OTHER'];

// Helper: parse CSV text into array of objects
function parseCSV(text) {
  const lines = text.split('\n').map((l) => l.replace(/\r$/, '')).filter((l) => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const rows = lines.slice(1).map((line) => {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; continue; }
      if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; continue; }
      current += char;
    }
    values.push(current.trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i] || ''; });
    return obj;
  });
  return { headers, rows };
}

// ========================
// IMPORT CLIENTS
// ========================
router.post('/clients', requireRole('OWNER', 'MANAGER', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { csvData } = req.body;
    if (!csvData) return res.status(400).json({ error: 'CSV data is required' });

    const { headers, rows } = parseCSV(csvData);
    if (!headers.includes('name')) {
      return res.status(400).json({ error: 'CSV must have a "name" column. Required: name. Optional: email, phone, company, address, city, ntn' });
    }

    const results = { success: 0, failed: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 for header row + 0-index

      if (!row.name || !row.name.trim()) {
        results.failed++;
        results.errors.push({ row: rowNum, error: 'Name is empty' });
        continue;
      }
      if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
        results.failed++;
        results.errors.push({ row: rowNum, error: `Invalid email: ${row.email}` });
        continue;
      }

      try {
        await prisma.client.create({
          data: {
            orgId: req.orgId,
            name: row.name.trim(),
            email: row.email || null,
            phone: row.phone || null,
            company: row.company || null,
            address: row.address || null,
            city: row.city || null,
            ntn: row.ntn || null,
            notes: row.notes || null,
          },
        });
        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push({ row: rowNum, error: 'Database error: ' + err.message });
      }
    }

    await logActivity(req, { action: 'IMPORT', entity: 'Client', details: `Imported ${results.success} clients (${results.failed} failed)` });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Import failed' });
  }
});

// ========================
// IMPORT PRODUCTS
// ========================
router.post('/products', requireRole('OWNER', 'MANAGER', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { csvData } = req.body;
    if (!csvData) return res.status(400).json({ error: 'CSV data is required' });

    const { headers, rows } = parseCSV(csvData);
    if (!headers.includes('name') || !headers.includes('price')) {
      return res.status(400).json({ error: 'CSV must have "name" and "price" columns. Optional: description, unit, tax_rate' });
    }

    const results = { success: 0, failed: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      if (!row.name?.trim()) { results.failed++; results.errors.push({ row: rowNum, error: 'Name is empty' }); continue; }
      const price = parseFloat(row.price);
      if (isNaN(price) || price < 0) { results.failed++; results.errors.push({ row: rowNum, error: `Invalid price: ${row.price}` }); continue; }
      const taxRate = row.tax_rate ? parseFloat(row.tax_rate) : 17;
      if (isNaN(taxRate) || taxRate < 0 || taxRate > 100) { results.failed++; results.errors.push({ row: rowNum, error: `Invalid tax rate: ${row.tax_rate}` }); continue; }

      try {
        await prisma.product.create({
          data: {
            orgId: req.orgId,
            name: row.name.trim(),
            description: row.description || null,
            price,
            unit: row.unit || 'piece',
            taxRate,
          },
        });
        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push({ row: rowNum, error: 'Database error' });
      }
    }

    await logActivity(req, { action: 'IMPORT', entity: 'Product', details: `Imported ${results.success} products (${results.failed} failed)` });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Import failed' });
  }
});

// ========================
// IMPORT EXPENSES
// ========================
router.post('/expenses', requireRole('OWNER', 'MANAGER', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { csvData } = req.body;
    if (!csvData) return res.status(400).json({ error: 'CSV data is required' });

    const { headers, rows } = parseCSV(csvData);
    if (!headers.includes('amount') || !headers.includes('date') || !headers.includes('category')) {
      return res.status(400).json({ error: 'CSV must have "amount", "date", "category" columns. Optional: description, notes, payment_method' });
    }

    // Get all categories to match by name
    const categories = await prisma.category.findMany({
      where: { OR: [{ isDefault: true, orgId: null }, { orgId: req.orgId }] },
    });
    const catMap = {};
    categories.forEach((c) => { catMap[c.name.toLowerCase()] = c.id; });

    const results = { success: 0, failed: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      const amount = parseFloat(row.amount);
      if (isNaN(amount) || amount <= 0) { results.failed++; results.errors.push({ row: rowNum, error: `Invalid amount: ${row.amount}` }); continue; }

      const date = new Date(row.date);
      if (isNaN(date.getTime())) { results.failed++; results.errors.push({ row: rowNum, error: `Invalid date: ${row.date}. Use YYYY-MM-DD format` }); continue; }

      const categoryId = catMap[(row.category || '').toLowerCase()];
      if (!categoryId) {
        results.failed++;
        results.errors.push({ row: rowNum, error: `Category not found: "${row.category}". Available: ${Object.keys(catMap).join(', ')}` });
        continue;
      }

      let paymentMethod = 'CASH';
      if (row.payment_method) {
        const pm = row.payment_method.toUpperCase().replace(/\s+/g, '_');
        if (VALID_PAYMENT_METHODS.includes(pm)) paymentMethod = pm;
      }

      try {
        await prisma.expense.create({
          data: {
            orgId: req.orgId,
            createdById: req.userId,
            categoryId,
            amount,
            description: row.description || null,
            notes: row.notes || null,
            date,
            paymentMethod,
          },
        });
        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push({ row: rowNum, error: 'Database error' });
      }
    }

    await logActivity(req, { action: 'IMPORT', entity: 'Expense', details: `Imported ${results.success} expenses (${results.failed} failed)` });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Import failed' });
  }
});

// ========================
// IMPORT TEAM MEMBERS
// ========================
const bcrypt = require('bcryptjs');

router.post('/team', requireRole('OWNER', 'MANAGER'), async (req, res) => {
  try {
    const { csvData } = req.body;
    if (!csvData) return res.status(400).json({ error: 'CSV data is required' });

    const { headers, rows } = parseCSV(csvData);
    if (!headers.includes('name') || !headers.includes('role')) {
      return res.status(400).json({ error: 'CSV must have "name" and "role" columns. Optional: email, phone, password' });
    }

    const VALID_ROLES = ['MANAGER', 'ACCOUNTANT', 'CASHIER', 'VIEWER'];
    const results = { success: 0, failed: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      if (!row.name?.trim()) { results.failed++; results.errors.push({ row: rowNum, error: 'Name is empty' }); continue; }
      if (!row.email && !row.phone) { results.failed++; results.errors.push({ row: rowNum, error: 'Email or phone is required' }); continue; }

      const role = (row.role || '').toUpperCase();
      if (!VALID_ROLES.includes(role)) {
        results.failed++;
        results.errors.push({ row: rowNum, error: `Invalid role: "${row.role}". Use: MANAGER, ACCOUNTANT, CASHIER, or VIEWER` });
        continue;
      }

      const password = row.password || 'Default123';

      try {
        // Check if user exists
        let user;
        if (row.email) user = await prisma.user.findUnique({ where: { email: row.email.toLowerCase().trim() } });
        if (!user && row.phone) user = await prisma.user.findUnique({ where: { phone: row.phone.replace(/[\s-]/g, '') } });

        if (!user) {
          const hashed = await bcrypt.hash(password, 12);
          user = await prisma.user.create({
            data: {
              name: row.name.trim(),
              email: row.email ? row.email.toLowerCase().trim() : null,
              phone: row.phone ? row.phone.replace(/[\s-]/g, '') : null,
              password: hashed,
            },
          });
        }

        // Check if already member
        const existing = await prisma.teamMember.findUnique({
          where: { orgId_userId: { orgId: req.orgId, userId: user.id } },
        });
        if (existing) {
          results.failed++;
          results.errors.push({ row: rowNum, error: `${row.name} is already a team member` });
          continue;
        }

        await prisma.teamMember.create({
          data: { orgId: req.orgId, userId: user.id, teamRole: role },
        });
        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push({ row: rowNum, error: 'Database error: ' + err.message });
      }
    }

    await logActivity(req, { action: 'IMPORT', entity: 'TeamMember', details: `Imported ${results.success} team members (${results.failed} failed)` });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Import failed' });
  }
});

// ========================
// DOWNLOAD TEMPLATES
// ========================
router.get('/template/:type', (req, res) => {
  const templates = {
    clients: `name,email,phone,company,address,city,ntn
ABC Trading,abc@trading.com,03001234567,ABC Trading Co,Main Bazaar,Lahore,1234567-8
Ali Store,,03119876543,Ali General Store,GT Road,Karachi,
Sara Boutique,sara@gmail.com,,Sara Fashion,,Islamabad,7654321-0`,

    products: `name,price,unit,description,tax_rate
Web Development,50000,project,Full website development,17
Logo Design,15000,piece,Professional logo design,17
Monthly Hosting,2000,month,Website hosting service,17
Consulting,5000,hour,Business consulting,17
Mobile App,150000,project,React Native mobile app,17`,

    expenses: `amount,date,category,description,payment_method,notes
5000,2026-03-01,Food & Dining,Team lunch,CASH,Monthly team lunch
25000,2026-03-05,Rent,Office rent March,BANK_TRANSFER,Shop #23
1500,2026-03-10,Transportation,Fuel for delivery,JAZZCASH,
3000,2026-03-15,Utilities,Electricity bill,EASYPAISA,March bill
800,2026-03-20,Internet & Phone,WiFi monthly,BANK_TRANSFER,PTCL`,

    team: `name,email,phone,role,password
Ali Khan,,03001112222,CASHIER,Ali123456
Sara Ahmed,sara@company.com,,ACCOUNTANT,Sara123456
Ahmed Manager,,03009998888,MANAGER,Ahmed123456
Fatima Viewer,fatima@company.com,03005556666,VIEWER,Fatima123456`,
  };

  const template = templates[req.params.type];
  if (!template) return res.status(404).json({ error: 'Template not found. Use: clients, products, expenses, team' });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=${req.params.type}_template.csv`);
  res.send(template);
});

module.exports = router;

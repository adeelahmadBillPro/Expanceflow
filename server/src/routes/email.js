const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { Resend } = require('resend');
const { authenticate } = require('../middleware/auth');
const { resolveOrg, requireRole } = require('../middleware/org');
const { logActivity } = require('../utils/activityLog');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);
router.use(resolveOrg);

// Send invoice via email
router.post('/send-invoice', requireRole('OWNER', 'MANAGER', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { invoiceId, recipientEmail } = req.body;

    if (!invoiceId || !recipientEmail) {
      return res.status(400).json({ error: 'invoiceId and recipientEmail are required' });
    }

    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({ error: 'Email service is not configured. Please set RESEND_API_KEY.' });
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, orgId: req.orgId },
      include: { client: true },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Invoice ${invoice.invoiceNumber}</h2>
        <p>Dear ${invoice.client?.name || 'Customer'},</p>
        <p>Please find your invoice details below:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Invoice Number</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${invoice.invoiceNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Amount Due</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">PKR ${Number(invoice.grandTotal).toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Due Date</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${new Date(invoice.dueDate).toLocaleDateString()}</td>
          </tr>
        </table>
        <p>
          <a href="${frontendUrl}/invoices/${invoice.id}"
             style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Invoice
          </a>
        </p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          This email was sent from ${req.org?.name || 'ExpenseTracker'}.
        </p>
      </div>
    `;

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'invoices@resend.dev',
      to: recipientEmail,
      subject: `Invoice ${invoice.invoiceNumber} from ${req.org?.name || 'ExpenseTracker'}`,
      html: htmlContent,
    });

    await logActivity(req, {
      action: 'EMAILED',
      entity: 'Invoice',
      entityId: invoice.id,
      details: `Emailed invoice ${invoice.invoiceNumber} to ${recipientEmail}`,
    });

    res.json({ message: `Invoice ${invoice.invoiceNumber} sent to ${recipientEmail}` });
  } catch (err) {
    console.error('Email send error:', err);
    res.status(500).json({ error: 'Failed to send invoice email' });
  }
});

module.exports = router;

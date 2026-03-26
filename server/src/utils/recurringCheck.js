const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function processRecurringInvoices() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const schedules = await prisma.recurringSchedule.findMany({
      where: {
        isActive: true,
        nextRunDate: { lte: today },
      },
      include: {
        invoice: {
          include: {
            items: true,
            client: true,
          },
        },
        organization: true,
      },
    });

    for (const schedule of schedules) {
      try {
        const templateInvoice = schedule.invoice;

        // Generate new invoice number
        const count = await prisma.invoice.count({ where: { orgId: schedule.orgId } });
        const invoiceNumber = `INV-${String(count + 1).padStart(5, '0')}`;

        // Calculate new dates
        const issueDate = new Date();
        const dueDate = new Date();
        // Same gap between issue and due as original
        const originalGap = new Date(templateInvoice.dueDate).getTime() - new Date(templateInvoice.issueDate).getTime();
        dueDate.setTime(issueDate.getTime() + originalGap);

        // Create new invoice from template
        const newInvoice = await prisma.invoice.create({
          data: {
            orgId: schedule.orgId,
            createdById: templateInvoice.createdById,
            clientId: templateInvoice.clientId,
            invoiceNumber,
            issueDate,
            dueDate,
            subtotal: templateInvoice.subtotal,
            taxAmount: templateInvoice.taxAmount,
            discount: templateInvoice.discount,
            discountType: templateInvoice.discountType,
            grandTotal: templateInvoice.grandTotal,
            notes: templateInvoice.notes,
            terms: templateInvoice.terms,
            items: {
              create: templateInvoice.items.map(item => ({
                name: item.name,
                description: item.description,
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                taxRate: item.taxRate,
                taxAmount: item.taxAmount,
                total: item.total,
              })),
            },
          },
        });

        // Calculate next run date based on frequency
        const nextRunDate = new Date(schedule.nextRunDate);
        switch (schedule.frequency) {
          case 'WEEKLY':
            nextRunDate.setDate(nextRunDate.getDate() + 7);
            break;
          case 'MONTHLY':
            nextRunDate.setMonth(nextRunDate.getMonth() + 1);
            break;
          case 'QUARTERLY':
            nextRunDate.setMonth(nextRunDate.getMonth() + 3);
            break;
          case 'YEARLY':
            nextRunDate.setFullYear(nextRunDate.getFullYear() + 1);
            break;
        }

        // Deactivate if past end date
        const isActive = !schedule.endDate || nextRunDate <= new Date(schedule.endDate);

        await prisma.recurringSchedule.update({
          where: { id: schedule.id },
          data: { nextRunDate, isActive },
        });

        // Notify org owner
        await prisma.notification.create({
          data: {
            orgId: schedule.orgId,
            userId: schedule.organization.ownerId,
            type: 'RECURRING_INVOICE',
            title: 'Recurring Invoice Created',
            message: `Invoice ${invoiceNumber} has been automatically created for ${templateInvoice.client?.name || 'a client'}.`,
            data: JSON.stringify({ invoiceId: newInvoice.id }),
          },
        });

        console.log(`Recurring invoice created: ${invoiceNumber} for org ${schedule.orgId}`);
      } catch (err) {
        console.error(`Failed to process recurring schedule ${schedule.id}:`, err.message);
      }
    }

    if (schedules.length > 0) {
      console.log(`Processed ${schedules.length} recurring invoice(s)`);
    }
  } catch (err) {
    console.error('Failed to process recurring invoices:', err.message);
  }
}

module.exports = { processRecurringInvoices };

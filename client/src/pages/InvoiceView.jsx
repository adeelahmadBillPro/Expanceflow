import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiOutlineArrowLeft, HiOutlineArrowDownTray, HiOutlineShare, HiOutlineEnvelope, HiOutlinePrinter } from 'react-icons/hi2';
import api from '../lib/api';
import { formatCurrency, formatDate, invoiceStatuses, paymentMethods } from '../lib/utils';
import { PageHeader, Card, Button, Badge, Spinner } from '../components/UI';
import toast from 'react-hot-toast';

export default function InvoiceView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/invoices/${id}`).then((res) => setInvoice(res.data))
      .catch(() => toast.error('Failed to load invoice'))
      .finally(() => setLoading(false));
  }, [id]);

  const generatePDF = async () => {
    try {
      const pdfMake = (await import('pdfmake/build/pdfmake')).default;
      const pdfFonts = (await import('pdfmake/build/vfs_fonts')).default;
      pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs;

      const inv = invoice;
      const biz = inv.business;

      const dd = {
        pageSize: 'A4',
        pageMargins: [40, 40, 40, 60],
        content: [
          {
            columns: [
              {
                width: '*',
                stack: [
                  { text: biz?.name || 'Your Business', fontSize: 18, bold: true, color: '#1e293b' },
                  ...(biz?.address ? [{ text: biz.address, fontSize: 9, color: '#64748b', margin: [0, 2, 0, 0] }] : []),
                  ...(biz?.city ? [{ text: biz.city, fontSize: 9, color: '#64748b' }] : []),
                  ...(biz?.phone ? [{ text: 'Phone: ' + biz.phone, fontSize: 9, color: '#64748b' }] : []),
                  ...(biz?.email ? [{ text: 'Email: ' + biz.email, fontSize: 9, color: '#64748b' }] : []),
                  ...(biz?.ntn ? [{ text: 'NTN: ' + biz.ntn, fontSize: 9, color: '#4f46e5', bold: true, margin: [0, 3, 0, 0] }] : []),
                ],
              },
              {
                width: 'auto',
                stack: [
                  { text: 'INVOICE', fontSize: 26, bold: true, color: '#4f46e5', alignment: 'right' },
                  { text: inv.invoiceNumber, fontSize: 11, color: '#64748b', alignment: 'right', margin: [0, 4, 0, 0] },
                  { text: 'Status: ' + inv.status, fontSize: 9, color: '#64748b', alignment: 'right', margin: [0, 2, 0, 0] },
                ],
              },
            ],
          },
          { canvas: [{ type: 'line', x1: 0, y1: 10, x2: 515, y2: 10, lineWidth: 1.5, lineColor: '#4f46e5' }] },
          {
            columns: [
              {
                width: '*',
                stack: [
                  { text: 'BILL TO', fontSize: 9, bold: true, color: '#4f46e5', margin: [0, 18, 0, 4] },
                  { text: inv.client?.name || '', fontSize: 13, bold: true, color: '#1e293b' },
                  ...(inv.client?.company ? [{ text: inv.client.company, fontSize: 9, color: '#64748b' }] : []),
                  ...(inv.client?.address ? [{ text: inv.client.address, fontSize: 9, color: '#64748b' }] : []),
                  ...(inv.client?.email ? [{ text: inv.client.email, fontSize: 9, color: '#64748b' }] : []),
                  ...(inv.client?.phone ? [{ text: inv.client.phone, fontSize: 9, color: '#64748b' }] : []),
                  ...(inv.client?.ntn ? [{ text: 'NTN: ' + inv.client.ntn, fontSize: 9, color: '#64748b' }] : []),
                ],
              },
              {
                width: 'auto',
                stack: [
                  { text: 'DETAILS', fontSize: 9, bold: true, color: '#4f46e5', margin: [0, 18, 0, 4], alignment: 'right' },
                  { text: 'Issue: ' + formatDate(inv.issueDate), fontSize: 10, color: '#475569', alignment: 'right' },
                  { text: 'Due: ' + formatDate(inv.dueDate), fontSize: 10, color: '#475569', alignment: 'right', margin: [0, 2, 0, 0] },
                ],
              },
            ],
          },
          {
            margin: [0, 22, 0, 0],
            table: {
              headerRows: 1,
              widths: ['*', 50, 75, 40, 60, 75],
              body: [
                [
                  { text: 'Item', fillColor: '#4f46e5', color: '#fff', fontSize: 9, bold: true, margin: [4, 4, 4, 4] },
                  { text: 'Qty', fillColor: '#4f46e5', color: '#fff', fontSize: 9, bold: true, alignment: 'center', margin: [0, 4, 0, 4] },
                  { text: 'Price', fillColor: '#4f46e5', color: '#fff', fontSize: 9, bold: true, alignment: 'right', margin: [0, 4, 4, 4] },
                  { text: 'Tax', fillColor: '#4f46e5', color: '#fff', fontSize: 9, bold: true, alignment: 'center', margin: [0, 4, 0, 4] },
                  { text: 'Tax Amt', fillColor: '#4f46e5', color: '#fff', fontSize: 9, bold: true, alignment: 'right', margin: [0, 4, 0, 4] },
                  { text: 'Total', fillColor: '#4f46e5', color: '#fff', fontSize: 9, bold: true, alignment: 'right', margin: [0, 4, 4, 4] },
                ],
                ...inv.items.map((item, i) => {
                  const bg = i % 2 ? '#f8fafc' : null;
                  return [
                    { text: item.name + (item.description ? '\n' + item.description : ''), fontSize: 9, color: '#475569', fillColor: bg, margin: [4, 4, 4, 4] },
                    { text: String(item.quantity), fontSize: 9, color: '#475569', alignment: 'center', fillColor: bg, margin: [0, 4, 0, 4] },
                    { text: formatCurrency(item.unitPrice), fontSize: 9, color: '#475569', alignment: 'right', fillColor: bg, margin: [0, 4, 4, 4] },
                    { text: item.taxRate + '%', fontSize: 9, color: '#475569', alignment: 'center', fillColor: bg, margin: [0, 4, 0, 4] },
                    { text: formatCurrency(item.taxAmount), fontSize: 9, color: '#475569', alignment: 'right', fillColor: bg, margin: [0, 4, 0, 4] },
                    { text: formatCurrency(item.total), fontSize: 9, color: '#1e293b', bold: true, alignment: 'right', fillColor: bg, margin: [0, 4, 4, 4] },
                  ];
                }),
              ],
            },
            layout: { hLineWidth: () => 0.5, vLineWidth: () => 0, hLineColor: () => '#e2e8f0', paddingTop: () => 0, paddingBottom: () => 0, paddingLeft: () => 0, paddingRight: () => 0 },
          },
          {
            margin: [280, 12, 0, 0],
            table: {
              widths: ['*', 90],
              body: [
                [{ text: 'Subtotal', fontSize: 10, color: '#64748b' }, { text: formatCurrency(inv.subtotal), fontSize: 10, alignment: 'right' }],
                [{ text: 'GST / Tax', fontSize: 10, color: '#64748b' }, { text: formatCurrency(inv.taxAmount), fontSize: 10, alignment: 'right' }],
                ...(Number(inv.discount) > 0 ? [[{ text: 'Discount', fontSize: 10, color: '#64748b' }, { text: '-' + formatCurrency(inv.discount), fontSize: 10, alignment: 'right', color: '#ef4444' }]] : []),
                [
                  { text: 'Grand Total', fontSize: 12, bold: true, color: '#fff', fillColor: '#4f46e5', margin: [4, 4, 4, 4] },
                  { text: formatCurrency(inv.grandTotal), fontSize: 12, bold: true, color: '#fff', fillColor: '#4f46e5', alignment: 'right', margin: [0, 4, 4, 4] },
                ],
                ...(Number(inv.amountPaid) > 0 ? [[{ text: 'Paid', fontSize: 10, color: '#10b981' }, { text: formatCurrency(inv.amountPaid), fontSize: 10, alignment: 'right', color: '#10b981' }]] : []),
              ],
            },
            layout: { hLineWidth: () => 0.5, vLineWidth: () => 0, hLineColor: () => '#e2e8f0' },
          },
          ...(biz?.bankName ? [{
            margin: [0, 25, 0, 0],
            stack: [
              { text: 'BANK DETAILS', fontSize: 9, bold: true, color: '#4f46e5', margin: [0, 0, 0, 4] },
              { text: 'Bank: ' + biz.bankName, fontSize: 9, color: '#475569' },
              ...(biz.bankAccount ? [{ text: 'Account: ' + biz.bankAccount, fontSize: 9, color: '#475569' }] : []),
              ...(biz.bankIban ? [{ text: 'IBAN: ' + biz.bankIban, fontSize: 9, color: '#475569' }] : []),
            ],
          }] : []),
          ...(inv.notes ? [{ text: 'Notes', fontSize: 9, bold: true, color: '#64748b', margin: [0, 18, 0, 3] }, { text: inv.notes, fontSize: 9, color: '#64748b' }] : []),
          ...(inv.terms ? [{ text: 'Terms & Conditions', fontSize: 9, bold: true, color: '#64748b', margin: [0, 12, 0, 3] }, { text: inv.terms, fontSize: 9, color: '#64748b' }] : []),
        ],
        footer: { text: 'Thank you for your business!', alignment: 'center', fontSize: 9, color: '#94a3b8', italics: true, margin: [0, 15, 0, 0] },
      };

      pdfMake.createPdf(dd).download(inv.invoiceNumber + '.pdf');
      toast.success('PDF downloaded!');
    } catch (err) {
      console.error(err);
      toast.error('PDF generation failed');
    }
  };

  const sendEmail = async () => {
    const email = window.prompt('Enter recipient email address:');
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error('Invalid email'); return; }
    try {
      await api.post('/email/send-invoice', { invoiceId: id, recipientEmail: email });
      toast.success('Invoice emailed!');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to send email'); }
  };

  const shareWhatsApp = () => {
    const text = `Invoice ${invoice.invoiceNumber}\nAmount: ${formatCurrency(invoice.grandTotal)}\nDue: ${formatDate(invoice.dueDate)}\nClient: ${invoice.client?.name}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (loading) return <Spinner />;
  if (!invoice) return <p className="text-center text-slate-400 py-20">Invoice not found</p>;

  const statusMap = { DRAFT: 'gray', SENT: 'blue', PAID: 'green', OVERDUE: 'red', CANCELLED: 'amber' };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={() => navigate('/invoices')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors">
          <HiOutlineArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex gap-2">
          <Button onClick={generatePDF}>
            <HiOutlineArrowDownTray className="w-4 h-4" /> Download PDF
          </Button>
          <Button variant="secondary" onClick={sendEmail}>
            <HiOutlineEnvelope className="w-4 h-4" /> Email
          </Button>
          <Button variant="secondary" onClick={() => window.print()}>
            <HiOutlinePrinter className="w-4 h-4" /> Print
          </Button>
          <Button variant="success" onClick={shareWhatsApp}>
            <HiOutlineShare className="w-4 h-4" /> WhatsApp
          </Button>
        </div>
      </div>

      {/* Invoice Preview */}
      <Card>
        {/* Top accent */}
        <div className="h-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-t-xl" />

        <div className="p-6 lg:p-10">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between gap-6 mb-8">
            <div>
              {invoice.business?.logo && (
                <img src={invoice.business.logo} alt="Logo" className="h-14 mb-3 rounded-lg" />
              )}
              <h2 className="text-xl font-bold text-slate-800">{invoice.business?.name || 'Your Business'}</h2>
              {invoice.business?.address && <p className="text-xs text-slate-500">{invoice.business.address}</p>}
              {invoice.business?.city && <p className="text-xs text-slate-500">{invoice.business.city}</p>}
              {invoice.business?.phone && <p className="text-xs text-slate-500">Phone: {invoice.business.phone}</p>}
              {invoice.business?.email && <p className="text-xs text-slate-500">Email: {invoice.business.email}</p>}
              {invoice.business?.ntn && <p className="text-xs font-semibold text-indigo-600 mt-1">NTN: {invoice.business.ntn}</p>}
            </div>
            <div className="sm:text-right">
              <h1 className="text-3xl font-extrabold text-indigo-600 tracking-tight">INVOICE</h1>
              <p className="text-sm text-slate-500 mt-1">{invoice.invoiceNumber}</p>
              <Badge color={statusMap[invoice.status]}>{invoice.status}</Badge>
            </div>
          </div>

          {/* Client & Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8 pb-6 border-b border-slate-100">
            <div>
              <p className="text-[10px] font-bold text-indigo-600 tracking-widest uppercase mb-2">Bill To</p>
              <p className="text-base font-semibold text-slate-800">{invoice.client?.name}</p>
              {invoice.client?.company && <p className="text-xs text-slate-500">{invoice.client.company}</p>}
              {invoice.client?.address && <p className="text-xs text-slate-500">{invoice.client.address}</p>}
              {invoice.client?.email && <p className="text-xs text-slate-500">{invoice.client.email}</p>}
              {invoice.client?.phone && <p className="text-xs text-slate-500">{invoice.client.phone}</p>}
              {invoice.client?.ntn && <p className="text-xs text-slate-500">NTN: {invoice.client.ntn}</p>}
            </div>
            <div className="sm:text-right space-y-1.5">
              <div>
                <p className="text-[10px] font-bold text-indigo-600 tracking-widest uppercase">Issue Date</p>
                <p className="text-sm text-slate-700">{formatDate(invoice.issueDate)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-indigo-600 tracking-widest uppercase">Due Date</p>
                <p className="text-sm text-slate-700">{formatDate(invoice.dueDate)}</p>
              </div>
            </div>
          </div>

          {/* Items */}
          <table className="w-full mb-6">
            <thead>
              <tr className="bg-indigo-600 text-white">
                <th className="text-left py-2.5 px-3 rounded-l-lg text-xs font-semibold">Item</th>
                <th className="text-center py-2.5 px-2 text-xs font-semibold">Qty</th>
                <th className="text-right py-2.5 px-2 text-xs font-semibold">Price</th>
                <th className="text-center py-2.5 px-2 text-xs font-semibold">Tax</th>
                <th className="text-right py-2.5 px-2 text-xs font-semibold">Tax Amt</th>
                <th className="text-right py-2.5 px-3 rounded-r-lg text-xs font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map((item, i) => (
                <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                  className={i % 2 === 0 ? 'bg-slate-50/50' : ''}>
                  <td className="py-3 px-3">
                    <p className="text-sm font-medium text-slate-700">{item.name}</p>
                    {item.description && <p className="text-[11px] text-slate-400">{item.description}</p>}
                  </td>
                  <td className="py-3 px-2 text-center text-sm text-slate-600">{item.quantity}</td>
                  <td className="py-3 px-2 text-right text-sm text-slate-600">{formatCurrency(item.unitPrice)}</td>
                  <td className="py-3 px-2 text-center text-sm text-slate-600">{item.taxRate}%</td>
                  <td className="py-3 px-2 text-right text-sm text-slate-600">{formatCurrency(item.taxAmount)}</td>
                  <td className="py-3 px-3 text-right text-sm font-semibold text-slate-800">{formatCurrency(item.total)}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-1.5">
              <div className="flex justify-between text-sm py-1">
                <span className="text-slate-500">Subtotal</span>
                <span className="text-slate-800">{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm py-1">
                <span className="text-slate-500">GST / Tax</span>
                <span className="text-slate-800">{formatCurrency(invoice.taxAmount)}</span>
              </div>
              {Number(invoice.discount) > 0 && (
                <div className="flex justify-between text-sm py-1">
                  <span className="text-slate-500">Discount</span>
                  <span className="text-red-500">-{formatCurrency(invoice.discount)}</span>
                </div>
              )}
              <div className="border-t border-indigo-200 pt-2 flex justify-between">
                <span className="text-base font-bold text-slate-800">Grand Total</span>
                <span className="text-xl font-extrabold text-indigo-600">{formatCurrency(invoice.grandTotal)}</span>
              </div>
              {Number(invoice.amountPaid) > 0 && (
                <>
                  <div className="flex justify-between text-sm py-1">
                    <span className="text-slate-500">Paid</span>
                    <span className="text-emerald-600 font-medium">{formatCurrency(invoice.amountPaid)}</span>
                  </div>
                  {Number(invoice.amountPaid) < Number(invoice.grandTotal) && (
                    <div className="flex justify-between text-sm py-1.5 bg-red-50 px-3 rounded-md">
                      <span className="font-medium text-red-600">Balance Due</span>
                      <span className="font-bold text-red-600">{formatCurrency(Number(invoice.grandTotal) - Number(invoice.amountPaid))}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Bank Details */}
          {invoice.business?.bankName && (
            <div className="mt-8 p-4 bg-indigo-50/50 rounded-lg border border-indigo-100">
              <p className="text-[10px] font-bold text-indigo-600 tracking-widest uppercase mb-2">Bank Details</p>
              <p className="text-xs text-slate-600">Bank: {invoice.business.bankName}</p>
              {invoice.business.bankAccount && <p className="text-xs text-slate-600">Account: {invoice.business.bankAccount}</p>}
              {invoice.business.bankIban && <p className="text-xs text-slate-600">IBAN: {invoice.business.bankIban}</p>}
            </div>
          )}

          {invoice.notes && (
            <div className="mt-5">
              <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-1">Notes</p>
              <p className="text-xs text-slate-500">{invoice.notes}</p>
            </div>
          )}
          {invoice.terms && (
            <div className="mt-3">
              <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-1">Terms & Conditions</p>
              <p className="text-xs text-slate-500">{invoice.terms}</p>
            </div>
          )}

          <div className="mt-8 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 italic">Thank you for your business!</p>
          </div>
        </div>
      </Card>

      {/* Payments */}
      {invoice.payments?.length > 0 && (
        <Card delay={0.2}>
          <div className="p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Payment History</h3>
            <div className="space-y-2">
              {invoice.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{formatCurrency(p.amount)}</p>
                    <p className="text-[11px] text-slate-400">{formatDate(p.paidAt)} | {paymentMethods.find((m) => m.value === p.method)?.label}</p>
                  </div>
                  {p.reference && <span className="text-[11px] text-slate-400">Ref: {p.reference}</span>}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

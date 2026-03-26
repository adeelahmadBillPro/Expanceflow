export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateInput(date) {
  return new Date(date).toISOString().split('T')[0];
}

export const paymentMethods = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CREDIT_CARD', label: 'Credit Card' },
  { value: 'DEBIT_CARD', label: 'Debit Card' },
  { value: 'JAZZCASH', label: 'JazzCash' },
  { value: 'EASYPAISA', label: 'EasyPaisa' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'OTHER', label: 'Other' },
];

export const preventNegativeInput = (e) => {
  if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
};

export const invoiceStatuses = [
  { value: 'DRAFT', label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  { value: 'SENT', label: 'Sent', color: 'bg-blue-100 text-blue-700' },
  { value: 'PAID', label: 'Paid', color: 'bg-green-100 text-green-700' },
  { value: 'OVERDUE', label: 'Overdue', color: 'bg-red-100 text-red-700' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'bg-yellow-100 text-yellow-700' },
];

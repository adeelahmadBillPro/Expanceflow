import { useState } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineChevronDown, HiOutlineRocketLaunch, HiOutlineCurrencyDollar, HiOutlineDocumentText, HiOutlineChartBar, HiOutlineUsers, HiOutlineCog6Tooth } from 'react-icons/hi2';
import { PageHeader, Card } from '../components/UI';

const sections = [
  {
    icon: HiOutlineRocketLaunch,
    title: 'Getting Started',
    color: 'indigo',
    steps: [
      { title: 'Create Your Account', desc: 'Sign up with your email. The first account automatically becomes the admin. You get a 14-day free trial with all features.' },
      { title: 'Set Up Business Profile', desc: 'Go to Business page and add your company name, logo, NTN number, bank details, and default GST rate. This info appears on all your invoices.' },
      { title: 'Add Your Products/Services', desc: 'Go to Products and add items you frequently invoice. Set prices and tax rates. These can be quickly added to invoices later.' },
      { title: 'Add Your Clients', desc: 'Go to Clients and add people/businesses you work with. You can also import clients from a CSV file.' },
    ],
  },
  {
    icon: HiOutlineCurrencyDollar,
    title: 'Tracking Expenses',
    color: 'emerald',
    steps: [
      { title: 'Add an Expense', desc: 'Click "Add Expense" on the Expenses page. Select a category, enter the amount in PKR, choose the payment method (Cash, JazzCash, EasyPaisa, Bank Transfer, etc.), and optionally attach a receipt.' },
      { title: 'Filter & Search', desc: 'Use the filter bar to search by text, category, payment method, or date range. Find any expense quickly.' },
      { title: 'Edit or Delete', desc: 'Hover over any expense to see edit and delete buttons. Click to modify or remove.' },
      { title: 'Custom Categories', desc: 'The app comes with 24 default categories. Create your own custom categories from the Categories section.' },
    ],
  },
  {
    icon: HiOutlineChartBar,
    title: 'Managing Budgets',
    color: 'amber',
    steps: [
      { title: 'Set Monthly Budgets', desc: 'Go to Budgets and click "Set Budget". Choose a category and set a monthly limit in PKR.' },
      { title: 'Track Progress', desc: 'Each budget shows a progress bar. Green = on track, Yellow (80%) = warning, Red (100%) = over budget.' },
      { title: 'Change Month/Year', desc: 'Use the month and year dropdowns to view budgets for any period.' },
    ],
  },
  {
    icon: HiOutlineDocumentText,
    title: 'Creating Invoices',
    color: 'violet',
    steps: [
      { title: 'Create Invoice', desc: 'Go to Invoices > Create Invoice. Select a client, set issue and due dates.' },
      { title: 'Add Line Items', desc: 'Add items manually or select from your product catalog. Set quantity, price, and tax rate for each item. GST is calculated automatically (17% default).' },
      { title: 'Set Discount', desc: 'Add a fixed PKR discount or percentage discount. The grand total updates in real-time.' },
      { title: 'Download PDF', desc: 'View the invoice and click "Download PDF". The PDF includes your logo, NTN, bank details, and professional formatting.' },
      { title: 'Share via WhatsApp', desc: 'Click the WhatsApp button to share invoice details directly with your client.' },
      { title: 'Record Payments', desc: 'When a client pays, click the payment icon on the invoice. Record full or partial payments. The invoice status updates automatically to "Paid" when fully paid.' },
    ],
  },
  {
    icon: HiOutlineUsers,
    title: 'Client Management',
    color: 'blue',
    steps: [
      { title: 'Add Clients', desc: 'Add clients one by one with their name, email, phone, company, NTN, and address.' },
      { title: 'Import from CSV', desc: 'Have a client list? Click "Import CSV" and upload a CSV file with columns: name, email, phone, company, city.' },
      { title: 'View Invoice History', desc: 'Each client card shows how many invoices they have. Click to see their details.' },
    ],
  },
  {
    icon: HiOutlineCog6Tooth,
    title: 'Admin & Billing',
    color: 'rose',
    steps: [
      { title: 'Admin Panel', desc: 'If you are the system admin, you can see all users across all organizations, enable/disable accounts, change roles, and manage plan upgrade requests.' },
      { title: 'Plan Upgrade Flow', desc: 'Owner clicks "Request Upgrade" on the Billing page → Admin sees the request in Admin Panel → Admin approves (sets duration) or rejects → Owner gets notified and plan is activated.' },
      { title: 'Free Trial', desc: 'New accounts get a 14-day free trial with all features. After that, request an upgrade to Pro or Business.' },
      { title: 'Plans', desc: 'Free: 50 expenses, 5 invoices, 5 clients, 2 members/month. Pro (PKR 999/mo): Unlimited expenses/invoices, 50 clients, 10 members. Business (PKR 2,499/mo): Unlimited everything.' },
      { title: 'Team Management', desc: 'Go to Team page to add employees. Set their role: Cashier (add expenses/payments), Accountant (full finance), Manager (everything + team), Viewer (read-only). Each employee gets their own login.' },
      { title: 'Activity Log', desc: 'Owner and Manager can view the Activity Log to see who did what — every expense added, invoice created, payment recorded, and team change is tracked.' },
      { title: 'Notifications', desc: 'Click the bell icon in the top bar to see notifications about budget alerts, overdue invoices, plan approvals, and team changes.' },
      { title: 'Dark Mode', desc: 'Click the sun/moon icon in the top bar to toggle dark mode. Your preference is saved.' },
      { title: 'Profile & Password', desc: 'Go to Settings to update your name. Use Forgot Password on the login page if you forget your password — you\'ll get a 6-digit reset code.' },
      { title: 'CSV Export', desc: 'On Expenses and Invoices pages, click "Export" to download your data as a CSV file for reporting.' },
      { title: 'Email Invoices', desc: 'View an invoice and click "Email" to send it directly to your client via email (Resend API).' },
    ],
  },
];

function Section({ section, index }) {
  const [open, setOpen] = useState(index === 0);
  const colorMap = {
    indigo: 'from-indigo-500 to-indigo-600',
    emerald: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-amber-600',
    violet: 'from-violet-500 to-violet-600',
    blue: 'from-blue-500 to-blue-600',
    rose: 'from-rose-500 to-rose-600',
  };

  return (
    <Card delay={index * 0.05}>
      <button onClick={() => setOpen(!open)} className="w-full p-5 flex items-center justify-between text-left">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${colorMap[section.color]} flex items-center justify-center shadow-sm`}>
            <section.icon className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">{section.title}</h3>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <HiOutlineChevronDown className="w-4 h-4 text-slate-400" />
        </motion.div>
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.25 }}
        className="overflow-hidden"
      >
        <div className="px-5 pb-5 space-y-3">
          {section.steps.map((step, i) => (
            <div key={i} className="flex gap-3">
              <div className="shrink-0 w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[11px] font-bold text-slate-500 mt-0.5">
                {i + 1}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">{step.title}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </Card>
  );
}

export default function Guide() {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <PageHeader title="User Guide" subtitle="Learn how to use ExpenseFlow step by step" />

      <Card>
        <div className="p-5 bg-gradient-to-r from-indigo-50 to-violet-50 rounded-xl">
          <h3 className="text-base font-bold text-slate-800 mb-2">Quick Start Workflow</h3>
          <div className="flex flex-wrap gap-2 text-xs">
            {['Set up Business', 'Add Products', 'Add Clients', 'Track Expenses', 'Create Invoices', 'Download PDF', 'Get Paid'].map((step, i) => (
              <div key={step} className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
                <span className="text-slate-600 font-medium">{step}</span>
                {i < 6 && <span className="text-slate-300 mx-1">→</span>}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {sections.map((section, i) => (
        <Section key={section.title} section={section} index={i} />
      ))}

      <Card>
        <div className="p-5 text-center">
          <p className="text-sm text-slate-500">Need help? Contact support or check the admin panel for system settings.</p>
        </div>
      </Card>
    </div>
  );
}

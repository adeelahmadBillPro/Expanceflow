import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiOutlineBanknotes, HiOutlineDocumentText, HiOutlineChartBar, HiOutlineDevicePhoneMobile, HiOutlineShieldCheck, HiOutlineBolt } from 'react-icons/hi2';

const features = [
  { icon: HiOutlineBanknotes, title: 'Expense Tracking', desc: 'Track every rupee with 20+ categories, receipt uploads, and payment methods including JazzCash & EasyPaisa.' },
  { icon: HiOutlineDocumentText, title: 'Invoice Generator', desc: 'Create professional GST-compliant invoices with your logo, NTN, and bank details. Download PDF or share via WhatsApp.' },
  { icon: HiOutlineChartBar, title: 'Smart Analytics', desc: 'Beautiful charts showing spending trends, category breakdowns, and budget progress with alerts.' },
  { icon: HiOutlineDevicePhoneMobile, title: 'Mobile Ready', desc: 'Works perfectly on phones. Add to home screen for app-like experience. No download needed.' },
  { icon: HiOutlineShieldCheck, title: 'FBR Compliant', desc: 'NTN on invoices, customizable GST rates (17% default), and professional formatting for tax compliance.' },
  { icon: HiOutlineBolt, title: 'Budget Alerts', desc: 'Set monthly budgets per category. Get warnings at 80% and alerts when you exceed your limit.' },
];

const pricing = [
  { name: 'Free', price: '0', features: ['50 expenses/month', '5 invoices/month', 'Basic dashboard', 'Default categories'], cta: 'Start Free', popular: false },
  { name: 'Pro', price: '999', features: ['Unlimited expenses', 'Unlimited invoices', 'Custom categories', 'Receipt uploads', 'PDF downloads', 'Email invoices'], cta: 'Get Pro', popular: true },
  { name: 'Business', price: '2,499', features: ['Everything in Pro', 'Recurring invoices', 'Multiple businesses', 'CSV import/export', 'Priority support', 'API access'], cta: 'Go Business', popular: false },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-slate-900/50 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold">E</span>
            </div>
            <span className="text-lg font-bold text-white">ExpenseFlow</span>
          </div>
          <div className="flex gap-3">
            <Link to="/login" className="px-5 py-2 text-gray-300 hover:text-white text-sm font-medium transition-colors">Login</Link>
            <Link to="/register" className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-indigo-500/30 transition-all">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="absolute inset-0 overflow-hidden">
          <motion.div animate={{ x: [0, 80, 0], y: [0, -40, 0] }} transition={{ duration: 20, repeat: Infinity }}
            className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-indigo-500/15 rounded-full blur-3xl" />
          <motion.div animate={{ x: [0, -60, 0], y: [0, 60, 0] }} transition={{ duration: 25, repeat: Infinity }}
            className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-500/15 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-300 text-sm mb-8">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Made for Pakistan
            </div>
            <h1 className="text-5xl lg:text-7xl font-bold text-white leading-tight mb-6">
              Track Expenses.
              <br />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Send Invoices.
              </span>
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              The all-in-one finance tool for Pakistani businesses. Track expenses in PKR,
              create GST-compliant invoices, and manage budgets — all from your phone.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link to="/register" className="inline-block px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold rounded-2xl shadow-xl shadow-indigo-500/25 text-lg">
                  Start Free Trial
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <a href="#features" className="inline-block px-8 py-4 bg-white/5 border border-white/10 text-white font-semibold rounded-2xl text-lg hover:bg-white/10 transition-colors">
                  See Features
                </a>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">Everything You Need</h2>
            <p className="text-gray-400 max-w-xl mx-auto">Powerful features designed specifically for Pakistani freelancers, shops, and small businesses.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div key={f.title}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-indigo-500/30 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center mb-4 group-hover:shadow-lg group-hover:shadow-indigo-500/20 transition-all">
                  <f.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">Simple Pricing</h2>
            <p className="text-gray-400">Start free, upgrade when you need more.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pricing.map((plan, i) => (
              <motion.div key={plan.name}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`rounded-2xl p-8 ${plan.popular
                  ? 'bg-gradient-to-b from-indigo-500/20 to-purple-500/20 border-2 border-indigo-500/50 relative'
                  : 'bg-white/5 border border-white/10'}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full text-xs font-bold text-white">
                    MOST POPULAR
                  </div>
                )}
                <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">PKR {plan.price}</span>
                  {plan.price !== '0' && <span className="text-gray-400">/month</span>}
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-gray-300 text-sm">
                      <span className="text-green-400">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link to="/register"
                  className={`block text-center py-3 rounded-xl font-semibold transition-all ${plan.popular
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25'
                    : 'bg-white/10 text-white hover:bg-white/20'}`}>
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">E</span>
            </div>
            <span className="text-sm font-medium text-gray-400">ExpenseFlow</span>
          </div>
          <p className="text-sm text-gray-500">© 2026 ExpenseFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

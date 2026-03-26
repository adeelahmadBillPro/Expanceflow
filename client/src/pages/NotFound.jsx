import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f1f5f9] p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="text-center">
        <p className="text-8xl font-extrabold text-indigo-600 mb-4">404</p>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Page not found</h2>
        <p className="text-sm text-slate-500 mb-6">The page you're looking for doesn't exist.</p>
        <Link to="/dashboard" className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 inline-block">
          Go to Dashboard
        </Link>
      </motion.div>
    </div>
  );
}

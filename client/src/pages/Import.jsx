import { useState } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineArrowUpTray, HiOutlineDocumentArrowDown, HiOutlineCheckCircle, HiOutlineExclamationTriangle, HiOutlineUsers, HiOutlineCube, HiOutlineCurrencyDollar, HiOutlineUserGroup } from 'react-icons/hi2';
import api from '../lib/api';
import { PageHeader, Card, Button, Badge, Spinner } from '../components/UI';
import toast from 'react-hot-toast';

const importTypes = [
  {
    key: 'clients', label: 'Clients', icon: HiOutlineUsers, color: 'indigo',
    desc: 'Import your client/customer list',
    columns: 'name (required), email, phone, company, address, city, ntn',
    example: 'ABC Trading, abc@email.com, 03001234567, ABC Co, Main Bazaar, Lahore, 1234567-8',
  },
  {
    key: 'products', label: 'Products & Services', icon: HiOutlineCube, color: 'violet',
    desc: 'Import your product/service catalog with prices',
    columns: 'name (required), price (required), unit, description, tax_rate',
    example: 'Web Development, 50000, project, Full website, 17',
  },
  {
    key: 'expenses', label: 'Expenses', icon: HiOutlineCurrencyDollar, color: 'emerald',
    desc: 'Import your expense history',
    columns: 'amount (required), date (required, YYYY-MM-DD), category (required, must match existing), description, payment_method, notes',
    example: '5000, 2026-03-01, Food & Dining, Team lunch, CASH, Monthly lunch',
  },
  {
    key: 'team', label: 'Team Members', icon: HiOutlineUserGroup, color: 'amber',
    desc: 'Import your employee list with roles',
    columns: 'name (required), role (required: MANAGER/ACCOUNTANT/CASHIER/VIEWER), email, phone, password',
    example: 'Ali Khan, CASHIER, , 03001234567, Ali123456',
  },
];

export default function Import() {
  const [selected, setSelected] = useState(null);
  const [csvText, setCsvText] = useState('');
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [importing, setImporting] = useState(false);

  const downloadTemplate = async (type) => {
    try {
      const res = await api.get(`/import/template/${type}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_template.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(`${type} template downloaded`);
    } catch { toast.error('Download failed'); }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      setCsvText(text);
      parsePreview(text);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const parsePreview = (text) => {
    const lines = text.split('\n').map((l) => l.replace(/\r$/, '')).filter((l) => l.trim());
    if (lines.length < 2) { toast.error('CSV must have at least a header row and one data row'); return; }
    const headers = lines[0].split(',').map((h) => h.trim());
    const rows = lines.slice(1, 6).map((line) => line.split(',').map((v) => v.trim()));
    setPreview({ headers, rows, totalRows: lines.length - 1 });
    setResult(null);
  };

  const handleImport = async () => {
    if (!selected || !csvText) { toast.error('Select a type and upload a CSV file'); return; }
    setImporting(true);
    try {
      const res = await api.post(`/import/${selected}`, { csvData: csvText });
      setResult(res.data);
      if (res.data.success > 0) toast.success(`Imported ${res.data.success} records!`);
      if (res.data.failed > 0) toast.error(`${res.data.failed} rows had errors`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Import failed');
    } finally { setImporting(false); }
  };

  const resetImport = () => {
    setCsvText('');
    setPreview(null);
    setResult(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <PageHeader title="Import Data" subtitle="Migrate your existing business data into ExpenseFlow" />

      {/* How it works */}
      <Card>
        <div className="p-5 bg-gradient-to-r from-indigo-50 to-violet-50 rounded-xl">
          <h3 className="text-sm font-bold text-slate-800 mb-2">How to Import Your Data</h3>
          <div className="flex flex-wrap gap-2 text-xs">
            {['Download Template', 'Fill in Excel/Google Sheets', 'Save as CSV', 'Upload Here', 'Review & Import'].map((step, i) => (
              <div key={step} className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
                <span className="text-slate-600 font-medium">{step}</span>
                {i < 4 && <span className="text-slate-300 mx-1">→</span>}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Select import type */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {importTypes.map((type, i) => (
          <Card key={type.key} delay={i * 0.05} hover>
            <button onClick={() => { setSelected(type.key); resetImport(); }}
              className={`w-full p-5 text-left rounded-xl transition-all ${selected === type.key ? 'ring-2 ring-indigo-500' : ''}`}>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br from-${type.color}-500 to-${type.color}-600 flex items-center justify-center shrink-0`}>
                  <type.icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800">{type.label}</p>
                    {selected === type.key && <Badge color="indigo">Selected</Badge>}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{type.desc}</p>
                </div>
              </div>
            </button>
          </Card>
        ))}
      </div>

      {/* Import Area */}
      {selected && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">
                  Import {importTypes.find((t) => t.key === selected)?.label}
                </h3>
                <Button variant="secondary" size="sm" onClick={() => downloadTemplate(selected)}>
                  <HiOutlineDocumentArrowDown className="w-4 h-4" /> Download Template
                </Button>
              </div>

              {/* Column info */}
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs font-medium text-slate-600 mb-1">Required CSV Columns:</p>
                <p className="text-xs text-slate-500">{importTypes.find((t) => t.key === selected)?.columns}</p>
                <p className="text-xs text-slate-400 mt-2">Example row: {importTypes.find((t) => t.key === selected)?.example}</p>
              </div>

              {/* Upload */}
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-indigo-300 transition-colors">
                <HiOutlineArrowUpTray className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-600 mb-2">Drop your CSV file here or click to browse</p>
                <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" id="csv-upload" />
                <label htmlFor="csv-upload">
                  <Button variant="secondary" size="sm" as="span" className="cursor-pointer">
                    Choose CSV File
                  </Button>
                </label>
                <p className="text-[10px] text-slate-400 mt-2">Save your Excel file as CSV (Comma Separated Values) before uploading</p>
              </div>

              {/* Preview */}
              {preview && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-slate-700">Preview ({preview.totalRows} rows found)</p>
                    <button onClick={resetImport} className="text-xs text-red-500 hover:text-red-700">Clear</button>
                  </div>
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="px-3 py-2 text-left text-slate-500 font-semibold">#</th>
                          {preview.headers.map((h) => (
                            <th key={h} className="px-3 py-2 text-left text-slate-500 font-semibold">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.rows.map((row, i) => (
                          <tr key={i} className="border-t border-slate-100">
                            <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                            {row.map((cell, j) => (
                              <td key={j} className="px-3 py-2 text-slate-700">{cell || <span className="text-slate-300">—</span>}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {preview.totalRows > 5 && (
                      <p className="text-[10px] text-slate-400 text-center py-2">Showing first 5 of {preview.totalRows} rows</p>
                    )}
                  </div>

                  {/* Import button */}
                  <Button className="w-full mt-4" onClick={handleImport} disabled={importing}>
                    {importing ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Importing {preview.totalRows} rows...
                      </span>
                    ) : (
                      <>
                        <HiOutlineArrowUpTray className="w-4 h-4" /> Import {preview.totalRows} Records
                      </>
                    )}
                  </Button>
                </motion.div>
              )}

              {/* Result */}
              {result && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <HiOutlineCheckCircle className="w-5 h-5 text-emerald-500" />
                      <span className="font-medium text-emerald-700">{result.success} imported</span>
                    </div>
                    {result.failed > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <HiOutlineExclamationTriangle className="w-5 h-5 text-red-500" />
                        <span className="font-medium text-red-700">{result.failed} failed</span>
                      </div>
                    )}
                  </div>

                  {result.errors?.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                      <p className="text-xs font-semibold text-red-700 mb-2">Errors:</p>
                      {result.errors.map((err, i) => (
                        <p key={i} className="text-xs text-red-600">Row {err.row}: {err.error}</p>
                      ))}
                    </div>
                  )}

                  <Button variant="secondary" onClick={resetImport}>Import More Data</Button>
                </motion.div>
              )}
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

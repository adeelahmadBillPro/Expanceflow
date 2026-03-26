import { useState } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineCamera, HiOutlineDocumentText, HiOutlineUsers, HiOutlineCurrencyDollar, HiOutlineCheckCircle, HiOutlineExclamationTriangle } from 'react-icons/hi2';
import api from '../lib/api';
import { PageHeader, Card, Button, Badge, Spinner } from '../components/UI';
import toast from 'react-hot-toast';

const scanTypes = [
  { key: 'clients', label: 'Client List', icon: HiOutlineUsers, desc: 'Notebook page with client names, phones, addresses' },
  { key: 'expenses', label: 'Expense Records', icon: HiOutlineCurrencyDollar, desc: 'Written expense entries with amounts and dates' },
  { key: 'invoice', label: 'Invoice / Bill', icon: HiOutlineDocumentText, desc: 'Handwritten or printed invoice/bill' },
];

function parseClientsFromText(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 3);
  const clients = [];

  for (const line of lines) {
    // Try to extract phone numbers
    const phoneMatch = line.match(/(03\d{9}|\+92\d{10}|\d{3,4}[-\s]?\d{7})/);
    // Remove phone from line to get name
    let name = phoneMatch ? line.replace(phoneMatch[0], '').trim() : line;
    // Clean up separators
    name = name.replace(/[,\-|:;]+$/, '').replace(/^[\d.)\-]+\s*/, '').trim();

    if (name.length > 1) {
      clients.push({
        name,
        phone: phoneMatch ? phoneMatch[0].replace(/[\s-]/g, '') : '',
        company: '',
        city: '',
      });
    }
  }
  return clients;
}

function parseExpensesFromText(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 2);
  const expenses = [];

  for (const line of lines) {
    // Try to find amounts (numbers with Rs, PKR, or standalone large numbers)
    const amountMatch = line.match(/(?:Rs\.?|PKR|₨)?\s*([0-9,]+\.?\d*)/i);
    // Try to find dates
    const dateMatch = line.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);

    if (amountMatch) {
      const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
      if (amount > 0 && amount < 99999999) {
        let description = line
          .replace(amountMatch[0], '')
          .replace(dateMatch ? dateMatch[0] : '', '')
          .replace(/[Rs\.PKR₨,\-|:;]+/gi, '')
          .replace(/^\d+[.)]\s*/, '')
          .trim();

        let date = new Date();
        if (dateMatch) {
          const d = new Date(dateMatch[0].replace(/\./g, '-'));
          if (!isNaN(d.getTime())) date = d;
        }

        expenses.push({
          amount: String(amount),
          date: date.toISOString().split('T')[0],
          description: description || 'Notebook entry',
          category: 'Other',
          payment_method: 'CASH',
        });
      }
    }
  }
  return expenses;
}

function parseInvoiceFromText(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const result = { clientName: '', items: [], total: null };

  // First few lines likely have client/business name
  if (lines.length > 0) result.clientName = lines[0].replace(/^[\d.)\-]+\s*/, '').substring(0, 100);

  // Find items with amounts
  for (const line of lines) {
    const amountMatch = line.match(/([0-9,]+\.?\d*)\s*$/);
    if (amountMatch) {
      const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
      if (amount > 0) {
        const name = line.replace(amountMatch[0], '').replace(/[,\-|:;]+$/, '').replace(/^\d+[.)]\s*/, '').trim();
        if (name.length > 1) {
          result.items.push({ name, amount: String(amount) });
        }
      }
    }
  }

  // Total is usually the largest amount
  const amounts = result.items.map((i) => parseFloat(i.amount));
  if (amounts.length > 0) {
    result.total = String(Math.max(...amounts));
  }

  return result;
}

export default function NotebookScanner() {
  const [scanType, setScanType] = useState(null);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [rawText, setRawText] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
    setParsedData(null);
    setRawText('');
    setSaved(false);
  };

  const processImage = async () => {
    if (!image || !scanType) return;
    setProcessing(true);
    setProgress(0);

    try {
      const Tesseract = await import('tesseract.js');
      const { data: { text } } = await Tesseract.recognize(image, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') setProgress(Math.round(m.progress * 100));
        },
      });

      setRawText(text);

      // Parse based on type
      let data;
      if (scanType === 'clients') {
        data = parseClientsFromText(text);
      } else if (scanType === 'expenses') {
        data = parseExpensesFromText(text);
      } else {
        data = parseInvoiceFromText(text);
      }

      setParsedData(data);

      if ((Array.isArray(data) && data.length === 0) || (!Array.isArray(data) && data.items?.length === 0)) {
        toast.error('Could not extract structured data. Try a clearer photo or edit the raw text.');
      } else {
        toast.success('Data extracted! Review below and save.');
      }
    } catch {
      toast.error('OCR processing failed. Try a clearer photo.');
    } finally {
      setProcessing(false);
    }
  };

  const saveData = async () => {
    setSaving(true);
    try {
      if (scanType === 'clients' && Array.isArray(parsedData)) {
        const csvLines = ['name,phone,company,city'];
        parsedData.forEach((c) => csvLines.push(`${c.name},${c.phone},${c.company},${c.city}`));
        const res = await api.post('/import/clients', { csvData: csvLines.join('\n') });
        toast.success(`Saved ${res.data.success} clients!`);
      } else if (scanType === 'expenses' && Array.isArray(parsedData)) {
        const csvLines = ['amount,date,category,description,payment_method'];
        parsedData.forEach((e) => csvLines.push(`${e.amount},${e.date},${e.category},${e.description},${e.payment_method}`));
        const res = await api.post('/import/expenses', { csvData: csvLines.join('\n') });
        toast.success(`Saved ${res.data.success} expenses!`);
      } else if (scanType === 'invoice' && parsedData) {
        toast.success('Invoice data extracted. Use "Create Invoice" to build it with this data.');
      }
      setSaved(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setImage(null);
    setImagePreview(null);
    setParsedData(null);
    setRawText('');
    setProgress(0);
    setSaved(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <PageHeader title="Notebook Scanner" subtitle="Scan your notebook pages to digitize business data" />

      {/* How it works */}
      <Card>
        <div className="p-4 bg-gradient-to-r from-indigo-50 to-violet-50 rounded-xl">
          <p className="text-xs font-bold text-slate-700 mb-1">How it works</p>
          <p className="text-xs text-slate-500">
            Take a photo of your notebook page → Our OCR reads the text → We parse it into clients, expenses, or invoice data → You review and save.
          </p>
        </div>
      </Card>

      {/* Select scan type */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {scanTypes.map((type) => (
          <Card key={type.key} hover>
            <button onClick={() => { setScanType(type.key); reset(); }}
              className={`w-full p-4 text-left rounded-xl transition-all ${scanType === type.key ? 'ring-2 ring-indigo-500' : ''}`}>
              <type.icon className={`w-6 h-6 mb-2 ${scanType === type.key ? 'text-indigo-600' : 'text-slate-400'}`} />
              <p className="text-sm font-semibold text-slate-800">{type.label}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{type.desc}</p>
            </button>
          </Card>
        ))}
      </div>

      {/* Scan area */}
      {scanType && (
        <Card>
          <div className="p-5 space-y-4">
            {!imagePreview ? (
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center">
                <HiOutlineCamera className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-600 mb-3">Take a photo of your notebook page</p>
                <div className="flex justify-center gap-2">
                  <label className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg cursor-pointer hover:bg-indigo-700">
                    Camera
                    <input type="file" accept="image/*" capture="environment" onChange={handleImage} className="hidden" />
                  </label>
                  <label className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg cursor-pointer hover:bg-slate-50">
                    Upload Photo
                    <input type="file" accept="image/*" onChange={handleImage} className="hidden" />
                  </label>
                </div>
                <p className="text-[10px] text-slate-400 mt-3">Tips: Use good lighting, keep text flat, avoid shadows</p>
              </div>
            ) : (
              <>
                <img src={imagePreview} alt="Notebook" className="w-full max-h-72 object-contain rounded-lg border border-slate-200" />

                {processing ? (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">Reading text from image...</span>
                      <span className="font-semibold text-indigo-600">{progress}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div animate={{ width: `${progress}%` }} className="h-full bg-indigo-500 rounded-full" />
                    </div>
                  </div>
                ) : !parsedData ? (
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={processImage}>
                      <HiOutlineDocumentText className="w-4 h-4" /> Extract Data
                    </Button>
                    <Button variant="secondary" onClick={reset}>Retake</Button>
                  </div>
                ) : null}
              </>
            )}

            {/* Raw text */}
            {rawText && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Raw OCR Text:</p>
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:border-indigo-500 resize-none bg-slate-50"
                />
              </div>
            )}

            {/* Parsed data preview */}
            {parsedData && scanType === 'clients' && Array.isArray(parsedData) && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-slate-800">Extracted Clients ({parsedData.length})</p>
                  <Badge color={parsedData.length > 0 ? 'green' : 'red'}>{parsedData.length} found</Badge>
                </div>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-slate-50">
                      <th className="px-3 py-2 text-left text-slate-500">#</th>
                      <th className="px-3 py-2 text-left text-slate-500">Name</th>
                      <th className="px-3 py-2 text-left text-slate-500">Phone</th>
                    </tr></thead>
                    <tbody>
                      {parsedData.map((c, i) => (
                        <tr key={i} className="border-t border-slate-100">
                          <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                          <td className="px-3 py-2 text-slate-700">{c.name}</td>
                          <td className="px-3 py-2 text-slate-500">{c.phone || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {parsedData && scanType === 'expenses' && Array.isArray(parsedData) && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-slate-800">Extracted Expenses ({parsedData.length})</p>
                  <Badge color={parsedData.length > 0 ? 'green' : 'red'}>{parsedData.length} found</Badge>
                </div>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-slate-50">
                      <th className="px-3 py-2 text-left text-slate-500">#</th>
                      <th className="px-3 py-2 text-left text-slate-500">Description</th>
                      <th className="px-3 py-2 text-right text-slate-500">Amount</th>
                      <th className="px-3 py-2 text-left text-slate-500">Date</th>
                    </tr></thead>
                    <tbody>
                      {parsedData.map((e, i) => (
                        <tr key={i} className="border-t border-slate-100">
                          <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                          <td className="px-3 py-2 text-slate-700">{e.description}</td>
                          <td className="px-3 py-2 text-right text-slate-700 font-medium">PKR {e.amount}</td>
                          <td className="px-3 py-2 text-slate-500">{e.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {parsedData && scanType === 'invoice' && !Array.isArray(parsedData) && (
              <div>
                <p className="text-sm font-semibold text-slate-800 mb-2">Extracted Invoice Data</p>
                <div className="bg-slate-50 rounded-lg p-3 space-y-2 text-sm">
                  <p className="text-slate-600">Client: <span className="font-medium text-slate-800">{parsedData.clientName || 'N/A'}</span></p>
                  {parsedData.items?.map((item, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="text-slate-600">{item.name}</span>
                      <span className="font-medium text-slate-800">PKR {item.amount}</span>
                    </div>
                  ))}
                  {parsedData.total && (
                    <div className="flex justify-between border-t border-slate-200 pt-2 font-bold">
                      <span>Total</span>
                      <span className="text-indigo-600">PKR {parsedData.total}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Save button */}
            {parsedData && !saved && (
              <div className="flex gap-2">
                <Button className="flex-1" onClick={saveData} disabled={saving}>
                  {saving ? 'Saving...' : (
                    <><HiOutlineCheckCircle className="w-4 h-4" /> Save to App</>
                  )}
                </Button>
                <Button variant="secondary" onClick={reset}>Scan Another</Button>
              </div>
            )}

            {saved && (
              <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 p-3 rounded-lg">
                <HiOutlineCheckCircle className="w-5 h-5" />
                Data saved successfully!
                <Button variant="secondary" size="sm" onClick={reset} className="ml-auto">Scan Another Page</Button>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

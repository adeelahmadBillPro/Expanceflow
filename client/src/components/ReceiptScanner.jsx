import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineXMark, HiOutlineCamera } from 'react-icons/hi2';

export default function ReceiptScanner({ open, onClose, onExtract }) {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const extractData = async () => {
    if (!image) return;
    setProcessing(true);
    setProgress(0);

    try {
      const Tesseract = await import('tesseract.js');
      const { data: { text } } = await Tesseract.recognize(image, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      // Parse the receipt text
      const result = parseReceipt(text);
      onExtract(result);
      onClose();
      resetState();
    } catch (err) {
      console.error('OCR failed:', err);
    } finally {
      setProcessing(false);
    }
  };

  const parseReceipt = (text) => {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    let amount = null;
    let date = null;
    let description = '';

    // Extract amount - look for largest number (likely the total)
    const amountPatterns = [
      /(?:total|amount|grand\s*total|net|bill|due)[:\s]*(?:rs\.?|pkr|₨)?\s*([0-9,]+\.?\d*)/i,
      /(?:rs\.?|pkr|₨)\s*([0-9,]+\.?\d*)/i,
      /([0-9,]+\.\d{2})/,
    ];

    for (const pattern of amountPatterns) {
      for (const line of lines) {
        const match = line.match(pattern);
        if (match) {
          const val = parseFloat(match[1].replace(/,/g, ''));
          if (val > 0 && (!amount || val > amount)) {
            amount = val;
          }
        }
      }
      if (amount) break;
    }

    // Extract date
    const datePatterns = [
      /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/,
      /(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/,
    ];
    for (const pattern of datePatterns) {
      for (const line of lines) {
        const match = line.match(pattern);
        if (match) {
          const d = new Date(match[0].replace(/\./g, '-'));
          if (!isNaN(d.getTime())) {
            date = d;
            break;
          }
        }
      }
      if (date) break;
    }

    // First line is usually the store name (description)
    if (lines.length > 0) {
      description = lines[0].substring(0, 100);
    }

    return {
      amount: amount ? String(amount) : '',
      date: date || new Date(),
      description,
      rawText: text,
    };
  };

  const resetState = () => {
    setImage(null);
    setImagePreview(null);
    setProgress(0);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={() => { onClose(); resetState(); }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800">Scan Receipt</h3>
            <button onClick={() => { onClose(); resetState(); }} className="p-1 hover:bg-slate-100 rounded-lg">
              <HiOutlineXMark className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {!imagePreview ? (
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
                <HiOutlineCamera className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-600 mb-3">Take a photo or upload receipt</p>
                <div className="flex justify-center gap-2">
                  <label className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg cursor-pointer hover:bg-indigo-700">
                    Camera
                    <input type="file" accept="image/*" capture="environment" onChange={handleImage} className="hidden" />
                  </label>
                  <label className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg cursor-pointer hover:bg-slate-50">
                    Gallery
                    <input type="file" accept="image/*" onChange={handleImage} className="hidden" />
                  </label>
                </div>
              </div>
            ) : (
              <>
                <img src={imagePreview} alt="Receipt" className="w-full max-h-64 object-contain rounded-lg border border-slate-200" />

                {processing ? (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">Reading receipt...</span>
                      <span className="font-semibold text-indigo-600">{progress}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-indigo-500 rounded-full"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={extractData}
                      className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700">
                      Extract Data
                    </button>
                    <button onClick={resetState}
                      className="px-4 py-2.5 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-200">
                      Retake
                    </button>
                  </div>
                )}
              </>
            )}

            <p className="text-[10px] text-slate-400 text-center">
              OCR will extract amount, date, and description from the receipt. Works best with clear, well-lit photos.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

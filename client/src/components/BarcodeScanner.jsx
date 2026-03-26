import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineXMark, HiOutlineQrCode } from 'react-icons/hi2';

export default function BarcodeScanner({ open, onClose, onScan }) {
  const [error, setError] = useState('');
  const [manualCode, setManualCode] = useState('');
  const html5QrRef = useRef(null);
  const mountedRef = useRef(false);

  const stopScanner = useCallback(async () => {
    try {
      if (html5QrRef.current) {
        const state = html5QrRef.current.getState?.();
        if (state === 2) { // SCANNING state
          await html5QrRef.current.stop();
        }
        html5QrRef.current.clear();
        html5QrRef.current = null;
      }
    } catch {
      // Ignore cleanup errors
      html5QrRef.current = null;
    }
  }, []);

  const handleClose = useCallback(async () => {
    await stopScanner();
    setError('');
    setManualCode('');
    onClose();
  }, [stopScanner, onClose]);

  useEffect(() => {
    if (!open) return;
    mountedRef.current = true;

    const startScanner = async () => {
      // Wait for DOM to render
      await new Promise((r) => setTimeout(r, 300));
      if (!mountedRef.current) return;

      const el = document.getElementById('barcode-reader');
      if (!el) return;

      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        const scanner = new Html5Qrcode('barcode-reader');
        html5QrRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 150 }, aspectRatio: 1.5 },
          (decodedText) => {
            if (mountedRef.current) {
              onScan(decodedText);
              handleClose();
            }
          },
          () => {}
        );
      } catch {
        if (mountedRef.current) {
          setError('Camera not available. Use the manual input below or upload an image.');
        }
      }
    };

    startScanner();

    return () => {
      mountedRef.current = false;
      stopScanner();
    };
  }, [open]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('barcode-file-temp');
      const result = await scanner.scanFile(file, true);
      scanner.clear();
      onScan(result);
      handleClose();
    } catch {
      setError('Could not read barcode from image.');
    }
    e.target.value = '';
  };

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      onScan(manualCode.trim());
      handleClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <HiOutlineQrCode className="w-4 h-4 text-indigo-500" /> Scan Barcode
              </h3>
              <button onClick={handleClose} className="p-1 hover:bg-slate-100 rounded-lg">
                <HiOutlineXMark className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Camera scanner area */}
              <div id="barcode-reader" className="rounded-lg overflow-hidden" style={{ minHeight: 200 }} />
              <div id="barcode-file-temp" className="hidden" />

              {error && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs text-amber-700">{error}</p>
                </div>
              )}

              {/* Manual barcode input */}
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1.5">Or type barcode number:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleManualSubmit(); }}
                    placeholder="Enter barcode number"
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500"
                    autoFocus={!!error}
                  />
                  <button onClick={handleManualSubmit} disabled={!manualCode.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                    Lookup
                  </button>
                </div>
              </div>

              {/* File upload */}
              <div className="text-center pt-2 border-t border-slate-100">
                <p className="text-xs text-slate-400 mb-2">Or upload barcode image:</p>
                <input type="file" accept="image/*" onChange={handleFileUpload}
                  className="text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-indigo-50 file:text-indigo-600 file:font-medium file:text-xs file:cursor-pointer" />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

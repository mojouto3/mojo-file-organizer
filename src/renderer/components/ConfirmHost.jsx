import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TriangleAlert } from 'lucide-react';
import { subscribeConfirm } from '../lib/confirm.js';

export default function ConfirmHost() {
  const [request, setRequest] = useState(null);

  useEffect(() => subscribeConfirm(setRequest), []);

  const resolve = (value) => {
    request?.resolve(value);
    setRequest(null);
  };

  return (
    <AnimatePresence>
      {request && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="glass-card w-full max-w-sm rounded-2xl p-5"
          >
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
                <TriangleAlert size={16} />
              </span>
              <p className="text-[13px] font-medium text-mfo-text">{request.message}</p>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => resolve(false)}
                className="rounded-lg border border-mfo-border px-3.5 py-1.5 text-xs text-mfo-text transition-colors hover:bg-mfo-surface2"
              >
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => resolve(true)}
                className="rounded-lg border border-mfo-danger/40 bg-mfo-danger/15 px-3.5 py-1.5 text-xs font-medium text-mfo-danger transition-colors hover:bg-mfo-danger/25"
              >
                {request.confirmLabel || 'Confirm'}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, subtitle, children }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="glass-card flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl"
          >
            <div className="flex items-center gap-3 border-b border-mfo-border px-4 py-3">
              <div className="flex-1">
                <p className="text-[13px] font-medium text-mfo-text">{title}</p>
                {subtitle && <p className="text-[11px] text-mfo-text-dim">{subtitle}</p>}
              </div>
              <button onClick={onClose} className="text-mfo-text-dim hover:text-mfo-text" aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto p-4">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

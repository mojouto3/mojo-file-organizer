import { motion } from 'framer-motion';

export default function SegmentedControl({ options, value, onChange, layoutId }) {
  return (
    <div className="glass-surface inline-flex flex-wrap gap-1 rounded-lg p-1">
      {options.map((opt) => {
        const active = String(opt.value) === String(value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`relative flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              active ? 'text-black' : 'text-mfo-text-dim hover:text-mfo-text'
            }`}
          >
            {active && (
              <motion.div
                layoutId={layoutId}
                className="absolute inset-0 rounded-md bg-mfo-green"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5 whitespace-nowrap">
              {opt.icon && <opt.icon size={13} />}
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

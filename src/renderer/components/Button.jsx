import { motion } from 'framer-motion';

const variants = {
  primary: 'bg-mfo-green text-black font-medium hover:bg-mfo-green-hover',
  outline: 'border border-mfo-border text-mfo-text hover:bg-mfo-surface2',
  danger: 'border border-mfo-danger/40 text-mfo-danger hover:bg-mfo-danger/10'
};

export default function Button({ children, variant = 'primary', className = '', disabled, ...props }) {
  return (
    <motion.button
      whileHover={disabled ? undefined : { scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.15 }}
      disabled={disabled}
      className={`flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}

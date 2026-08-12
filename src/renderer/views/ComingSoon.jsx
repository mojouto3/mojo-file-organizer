import { motion } from 'framer-motion';

export default function ComingSoon({ label }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex h-full flex-col items-center justify-center gap-2 text-mfo-text-dim"
    >
      <p className="text-sm">{label} is being redesigned.</p>
      <p className="text-xs">Use the current released app for this tab for now.</p>
    </motion.div>
  );
}

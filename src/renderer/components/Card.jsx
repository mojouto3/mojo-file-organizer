import { motion } from 'framer-motion';

export default function Card({ children, className = '', hover = true, delay = 0, ...props }) {
  return (
    <motion.div
      className={`glass-card rounded-2xl ${className}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay }}
      whileHover={
        hover
          ? {
              y: -3,
              borderColor: 'rgba(61, 219, 61, 0.3)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(61,219,61,0.15)',
              transition: { duration: 0.2 }
            }
          : undefined
      }
      {...props}
    >
      {children}
    </motion.div>
  );
}

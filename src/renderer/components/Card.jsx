import { motion } from 'framer-motion';

export default function Card({ children, className = '', hover = true, ...props }) {
  return (
    <motion.div
      className={`glass-card rounded-2xl ${className}`}
      whileHover={
        hover
          ? {
              y: -3,
              borderColor: 'rgba(61, 219, 61, 0.3)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(61,219,61,0.15)'
            }
          : undefined
      }
      transition={{ duration: 0.2 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

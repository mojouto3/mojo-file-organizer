import { useEffect, useRef } from 'react';
import { animate } from 'framer-motion';

export default function CountUp({ value, className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const controls = animate(0, value, {
      duration: 0.7,
      ease: [0.33, 1, 0.68, 1],
      onUpdate(v) {
        node.textContent = Math.round(v).toLocaleString();
      }
    });
    return () => controls.stop();
  }, [value]);

  return <span ref={ref} className={className}>0</span>;
}

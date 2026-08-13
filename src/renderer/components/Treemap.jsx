import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatSize } from '../lib/format.js';

const GRADIENTS = [
  ['#3b82f6', '#2563eb'],
  ['#8b5cf6', '#7c3aed'],
  ['#ec4899', '#db2777'],
  ['#f59e0b', '#d97706'],
  ['#06b6d4', '#0891b2'],
  ['#ef4444', '#dc2626']
];

export default function Treemap({ sections, totalSize }) {
  const { t } = useTranslation();
  const [hover, setHover] = useState(null);
  const sized = sections.filter((s) => s.size > 0);
  if (!sized.length) return null;

  return (
    <div className="relative">
      {hover && (
        <div className="absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-lg border border-mfo-border bg-mfo-surface px-3 py-1.5 text-center shadow-lg">
          <p className="text-[12px] font-medium text-mfo-text">{hover.label}</p>
          <p className="text-[11px] text-mfo-text-dim">{t('treemap.ofTotal', { size: formatSize(hover.size), pct: hover.pct })}</p>
        </div>
      )}
      <div className="flex h-[140px] gap-[3px]">
        {sized.map((s, i) => {
          const pct = Math.max((s.size / totalSize) * 100, 4);
          const isSmall = pct < 8;
          const [c1, c2] = GRADIENTS[i % GRADIENTS.length];
          return (
            <div
              key={s.id}
              onMouseEnter={() => setHover({ label: s.label, size: s.size, pct: pct.toFixed(1) })}
              onMouseLeave={() => setHover(null)}
              onClick={() => document.getElementById(`cleanup-section-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })}
              style={{ flex: pct, background: `linear-gradient(135deg, ${c1}, ${c2})` }}
              className="relative flex cursor-pointer flex-col justify-end overflow-hidden rounded-md p-2"
            >
              {!isSmall && (
                <>
                  <span className="truncate text-[11px] font-medium text-white/90">{s.label}</span>
                  <span className="text-[10px] text-white/70">{formatSize(s.size)}</span>
                </>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {sized.map((s, i) => {
          const pct = ((s.size / totalSize) * 100).toFixed(1);
          const [c1] = GRADIENTS[i % GRADIENTS.length];
          return (
            <div key={s.id} className="flex items-center gap-1.5 text-[10.5px] text-mfo-text-dim">
              <span className="h-2 w-2 rounded-full" style={{ background: c1 }} />
              {s.label} {pct}%
            </div>
          );
        })}
      </div>
    </div>
  );
}

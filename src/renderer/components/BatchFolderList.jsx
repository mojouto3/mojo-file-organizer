import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

const STATUS_STYLE = {
  done: 'text-mfo-green',
  error: 'text-mfo-danger',
  active: 'text-mfo-text-dim'
};

export default function BatchFolderList({ folders, statuses = {}, onRemove }) {
  const { t } = useTranslation();
  if (folders.length === 0) {
    return <p className="px-1 py-2 text-[11px] text-mfo-text-dim">{t('batchFolderList.noFoldersYet')}</p>;
  }

  return (
    <div className="flex flex-col gap-1">
      {folders.map((f, i) => (
        <div key={f} className="flex items-center gap-2 rounded-lg border border-mfo-border px-2.5 py-1.5">
          <span className="min-w-0 flex-1 truncate text-[12px] text-mfo-text" title={f}>{f}</span>
          {statuses[i] && (
            <span className={`shrink-0 text-[11px] ${STATUS_STYLE[statuses[i].type] || 'text-mfo-text-dim'}`}>
              {statuses[i].text}
            </span>
          )}
          <button
            onClick={() => onRemove(i)}
            className="shrink-0 text-mfo-text-dim hover:text-mfo-danger"
            aria-label={t('batchFolderList.removeFolder')}
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}

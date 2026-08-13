import { useTranslation } from 'react-i18next';
import Modal from './Modal.jsx';

const NAV_SHORTCUTS = [
  ['Ctrl+1', 'nav.home'], ['Ctrl+2', 'nav.organize'], ['Ctrl+3', 'nav.duplicates'], ['Ctrl+4', 'nav.cleanup'],
  ['Ctrl+5', 'nav.activity'], ['Ctrl+6', 'nav.smartGroup'], ['Ctrl+7', 'nav.rules'], ['Ctrl+8', 'nav.watcher'], ['Ctrl+9', 'nav.settings']
];

const GENERAL_SHORTCUTS = [
  ['?', 'shortcuts.showDialog'],
  ['Esc', 'shortcuts.closeDialogs']
];

function Row({ keys, labelKey }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[12px] text-mfo-text-dim">{t(labelKey)}</span>
      <kbd className="rounded-md border border-mfo-border bg-mfo-surface2 px-2 py-0.5 text-[11px] text-mfo-text">{keys}</kbd>
    </div>
  );
}

export default function ShortcutsModal({ open, onClose }) {
  const { t } = useTranslation();
  return (
    <Modal open={open} onClose={onClose} title={t('shortcuts.title')} subtitle={t('shortcuts.subtitle')}>
      <div className="flex flex-col gap-4">
        <div>
          <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-mfo-text-dim">{t('shortcuts.navigation')}</p>
          <div className="flex flex-col divide-y divide-mfo-border">
            {NAV_SHORTCUTS.map(([keys, labelKey]) => <Row key={keys} keys={keys} labelKey={labelKey} />)}
          </div>
        </div>
        <div>
          <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-mfo-text-dim">{t('shortcuts.general')}</p>
          <div className="flex flex-col divide-y divide-mfo-border">
            {GENERAL_SHORTCUTS.map(([keys, labelKey]) => <Row key={keys} keys={keys} labelKey={labelKey} />)}
          </div>
        </div>
      </div>
    </Modal>
  );
}

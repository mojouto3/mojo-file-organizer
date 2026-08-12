import Modal from './Modal.jsx';

const NAV_SHORTCUTS = [
  ['Ctrl+1', 'Home'], ['Ctrl+2', 'Organize'], ['Ctrl+3', 'Duplicates'], ['Ctrl+4', 'Cleanup'],
  ['Ctrl+5', 'Activity'], ['Ctrl+6', 'Smart Group'], ['Ctrl+7', 'Rules'], ['Ctrl+8', 'Watcher'], ['Ctrl+9', 'Settings']
];

const GENERAL_SHORTCUTS = [
  ['?', 'Show this dialog'],
  ['Esc', 'Close dialogs']
];

function Row({ keys, label }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[12px] text-mfo-text-dim">{label}</span>
      <kbd className="rounded-md border border-mfo-border bg-mfo-surface2 px-2 py-0.5 text-[11px] text-mfo-text">{keys}</kbd>
    </div>
  );
}

export default function ShortcutsModal({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Keyboard shortcuts" subtitle="Press ? to show this dialog">
      <div className="flex flex-col gap-4">
        <div>
          <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-mfo-text-dim">Navigation</p>
          <div className="flex flex-col divide-y divide-mfo-border">
            {NAV_SHORTCUTS.map(([keys, label]) => <Row key={keys} keys={keys} label={label} />)}
          </div>
        </div>
        <div>
          <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-mfo-text-dim">General</p>
          <div className="flex flex-col divide-y divide-mfo-border">
            {GENERAL_SHORTCUTS.map(([keys, label]) => <Row key={keys} keys={keys} label={label} />)}
          </div>
        </div>
      </div>
    </Modal>
  );
}

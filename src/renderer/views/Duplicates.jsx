import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, CheckCircle2, Copy, FolderSearch, Trash2, Undo2 } from 'lucide-react';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import SegmentedControl from '../components/SegmentedControl.jsx';
import FolderPicker from '../components/FolderPicker.jsx';
import { formatSize } from '../lib/format.js';
import { showToast } from '../lib/toast.js';
import { confirm } from '../lib/confirm.js';

function keepIndex(group) {
  return group.reduce((best, f, i) => (f.mtime > group[best].mtime ? i : best), 0);
}

export default function Duplicates() {
  const { t } = useTranslation();
  const [folder, setFolder] = useState(null);
  const [mode, setMode] = useState('content');
  const [scanning, setScanning] = useState(false);
  const [groups, setGroups] = useState([]);
  const [totals, setTotals] = useState({ totalGroups: 0, totalFiles: 0 });
  const [selected, setSelected] = useState(new Set());
  const [lastDeleted, setLastDeleted] = useState([]);

  const runScan = async (scanMode) => {
    if (!folder) { showToast(t('common.selectFolderFirst')); return; }
    setMode(scanMode);
    setScanning(true);
    showToast(t('duplicates.scanning'));
    const result = await window.api.scanDuplicates({ folderPath: folder, mode: scanMode });
    setScanning(false);
    setGroups(result.duplicates || []);
    setTotals({ totalGroups: result.totalGroups || 0, totalFiles: result.totalFiles || 0 });
    setSelected(new Set());
  };

  const toggleSelect = (path, isKeep) => {
    if (isKeep) return;
    setSelected((s) => {
      const next = new Set(s);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  };

  const handleDeleteSelected = async () => {
    const files = groups.flat()
      .filter((f) => selected.has(f.path))
      .map((f) => ({ path: f.path, name: f.name, size: f.size }));
    if (!files.length) { showToast(t('duplicates.selectFilesToDelete')); return; }
    const ok = await confirm(t('duplicates.confirmDelete', { count: files.length }), { confirmLabel: t('common.delete') });
    if (!ok) return;
    const result = await window.api.deleteDuplicates(files);
    setLastDeleted(result.deleted);
    showToast(t('duplicates.filesDeleted', { count: result.deleted.length }));
    runScan(mode);
  };

  const handleUndo = async () => {
    if (!lastDeleted.length) return;
    const r = await window.api.restoreDuplicates(lastDeleted);
    setLastDeleted([]);
    showToast(t('organize.restoredFiles', { count: r.restored.length }));
    runScan(mode);
  };

  return (
    <div className="flex flex-col gap-3">
      <Card className="p-3.5">
        <div className="mb-2 flex items-center gap-2">
          <FolderSearch size={15} className="text-mfo-green" />
          <span className="text-[13px] font-medium text-mfo-text">{t('duplicates.selectFolder')}</span>
        </div>
        <FolderPicker value={folder} onPick={setFolder} />
        <div className="mt-3">
          <SegmentedControl
            layoutId="duplicates-mode"
            value={mode}
            onChange={runScan}
            options={[
              { value: 'content', label: t('duplicates.scanByContent') },
              { value: 'name', label: t('duplicates.scanByName') }
            ]}
          />
        </div>
      </Card>

      {scanning && (
        <p className="px-1 text-[12px] text-mfo-text-dim">{t('duplicates.scanning')}</p>
      )}

      {!scanning && groups.length === 0 && (
        <Card className="flex flex-col items-center gap-2 px-6 py-14 text-center">
          <CheckCircle2 size={28} className="text-mfo-green" />
          <p className="text-sm font-medium text-mfo-text">{t('duplicates.noneFound')}</p>
          <p className="text-xs text-mfo-text-dim">{t('duplicates.noneFoundHint')}</p>
        </Card>
      )}

      {!scanning && groups.length > 0 && (
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-mfo-border px-3.5 py-2.5">
            <span className="text-[13px] font-medium text-mfo-text">{t('duplicates.found')}</span>
            <span className="rounded-full bg-mfo-green/10 px-2 py-0.5 text-[10.5px] font-medium text-mfo-green">
              {t('duplicates.groupsFiles', { groups: totals.totalGroups, files: totals.totalFiles })}
            </span>
            <Button
              variant="danger"
              onClick={handleDeleteSelected}
              disabled={selected.size === 0}
              className="ml-auto"
            >
              <Trash2 size={13} />{t('duplicates.deleteSelected')}
            </Button>
          </div>

          <div className="flex flex-col divide-y divide-mfo-border">
            {groups.map((group, gi) => {
              const keepIdx = keepIndex(group);
              return (
                <div key={gi} className="p-3.5">
                  <div className="mb-2 flex items-center gap-1.5 text-[11px] text-mfo-text-dim">
                    <Copy size={12} />
                    {t('duplicates.duplicateFilesEach', { count: group.length, size: formatSize(group[0].size) })}
                  </div>
                  <div className="flex flex-col gap-1">
                    {group.map((f, fi) => {
                      const isKeep = fi === keepIdx;
                      const isSelected = selected.has(f.path);
                      return (
                        <div
                          key={f.path}
                          onClick={() => toggleSelect(f.path, isKeep)}
                          className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-1.5 transition-colors ${
                            isKeep
                              ? 'border-mfo-border/60 cursor-default'
                              : isSelected
                                ? 'cursor-pointer border-mfo-danger bg-mfo-danger/15'
                                : 'cursor-pointer border-mfo-border hover:border-mfo-danger/30 hover:bg-mfo-danger/5'
                          }`}
                        >
                          {isKeep ? (
                            <span className="shrink-0 rounded bg-mfo-green/10 px-1.5 py-0.5 text-[10px] font-medium uppercase text-mfo-green">
                              {t('duplicates.keep')} <span className="text-mfo-text-dim normal-case">{t('duplicates.newest')}</span>
                            </span>
                          ) : (
                            <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                              isSelected ? 'border-mfo-danger bg-mfo-danger' : 'border-mfo-border'
                            }`}>
                              {isSelected && <Check size={11} className="text-white" />}
                            </span>
                          )}
                          <span className="min-w-0 flex-1 truncate text-[12px] text-mfo-text" title={f.name}>{f.name}</span>
                          <span className="hidden max-w-[240px] truncate text-[10.5px] text-mfo-text-dim sm:block" title={f.path}>{f.path}</span>
                          <span className="shrink-0 text-[10.5px] text-mfo-text-dim">{formatSize(f.size)}</span>
                          {f.mtime && (
                            <span className="shrink-0 text-[10.5px] text-mfo-text-dim">
                              {new Date(f.mtime).toLocaleDateString()}
                            </span>
                          )}
                          {!isKeep && isSelected && (
                            <span className="shrink-0 text-[10px] font-medium uppercase text-mfo-danger">{t('common.delete')}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {lastDeleted.length > 0 && (
            <div className="border-t border-mfo-border p-3.5">
              <Button variant="outline" onClick={handleUndo}><Undo2 size={14} />{t('common.undo')}</Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

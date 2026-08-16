import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight, CheckCircle2, Download, FolderSearch, Layers, Plus, Undo2, Upload, X
} from 'lucide-react';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import FolderPicker from '../components/FolderPicker.jsx';
import { showToast } from '../lib/toast.js';
import { confirmBulkCloudOperation } from '../lib/cloudSync.js';

function groupByGroup(items) {
  const groups = {};
  for (const item of items) (groups[item.group] = groups[item.group] || []).push(item);
  return groups;
}

export default function SmartGroup() {
  const { t } = useTranslation();
  const [folder, setFolder] = useState(null);
  const [groups, setGroups] = useState([]);
  const [nameInput, setNameInput] = useState('');
  const [phase, setPhase] = useState('idle');
  const [previewFiles, setPreviewFiles] = useState([]);
  const [movedFiles, setMovedFiles] = useState([]);
  const [lastMoves, setLastMoves] = useState([]);
  const [organizing, setOrganizing] = useState(false);

  useEffect(() => { window.api.getGroups().then(setGroups); }, []);

  const addGroup = () => {
    const name = nameInput.trim();
    if (!name) return;
    if (groups.some((g) => g.name.toLowerCase() === name.toLowerCase())) { showToast(t('smartGroup.alreadyExists')); return; }
    const next = [...groups, { name }];
    setGroups(next);
    window.api.saveGroups(next);
    setNameInput('');
    showToast(t('smartGroup.groupAdded', { name }));
  };

  const removeGroup = (i) => {
    const removed = groups[i];
    const next = groups.filter((_, idx) => idx !== i);
    setGroups(next);
    window.api.saveGroups(next);
    showToast(t('smartGroup.groupRemoved', { name: removed.name }));
  };

  const runPreview = async (targetFolder) => {
    if (groups.length === 0) { showToast(t('smartGroup.addGroupFirst')); return; }
    const files = await window.api.previewGroups(targetFolder);
    if (!files.length) { showToast(t('smartGroup.noMatchingFiles')); return; }
    setPreviewFiles(files);
    setPhase('preview');
  };

  const handleSetFolder = (f) => {
    setFolder(f);
    runPreview(f);
  };

  const reset = () => {
    setFolder(null);
    setLastMoves([]);
    setPhase('idle');
  };

  const handleOrganize = async () => {
    if (!folder) return;
    if (!await confirmBulkCloudOperation(t, folder, previewFiles.length)) return;
    setOrganizing(true);
    const result = await window.api.organizeGroups(folder);
    setOrganizing(false);
    setLastMoves(result.moved);
    setMovedFiles(result.moved);
    setPhase('results');
    if (result.errors?.length) showToast(t('organize.errorCount', { count: result.errors.length }));
  };

  const handleUndo = async () => {
    const r = await window.api.undo(lastMoves);
    showToast(t('organize.restoredFiles', { count: r.restored.length }));
    reset();
  };

  const handleExport = async () => {
    const result = await window.api.exportGroups();
    if (result.cancelled) return;
    showToast(result.ok ? t('smartGroup.groupsExported') : `${result.error}`);
  };

  const handleImport = async () => {
    const result = await window.api.importGroups();
    if (result.cancelled) return;
    if (result.ok) {
      window.api.getGroups().then(setGroups);
      showToast(t('smartGroup.groupsImported', { count: result.added }));
    } else {
      showToast(`${result.error}`);
    }
  };

  const resultGroups = groupByGroup(movedFiles);

  return (
    <div className="flex flex-col gap-3">
      <Card className="p-3.5">
        <div className="mb-2 flex items-center gap-2">
          <FolderSearch size={15} className="text-mfo-green" />
          <span className="text-[13px] font-medium text-mfo-text">{t('duplicates.selectFolder')}</span>
        </div>
        <FolderPicker value={folder} onPick={handleSetFolder} />
      </Card>

      <Card className="p-3.5">
        <div className="mb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers size={15} className="text-mfo-green" />
            <span className="text-[13px] font-medium text-mfo-text">{t('smartGroup.groups')}</span>
            <span className="rounded-full bg-mfo-green/10 px-2 py-0.5 text-[10.5px] font-medium text-mfo-green">{groups.length}</span>
          </div>
          <div className="flex gap-1.5">
            <Button variant="outline" onClick={handleExport} className="px-2.5 py-1 text-[11px]"><Download size={12} />{t('common.export')}</Button>
            <Button variant="outline" onClick={handleImport} className="px-2.5 py-1 text-[11px]"><Upload size={12} />{t('common.import')}</Button>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addGroup()}
            placeholder={t('smartGroup.namePlaceholder')}
            className="flex-1 rounded-lg border border-mfo-border bg-transparent px-2.5 py-1.5 text-[12.5px] text-mfo-text outline-none placeholder:text-mfo-text-dim"
          />
          <Button onClick={addGroup} className="px-3"><Plus size={14} />{t('common.add')}</Button>
        </div>

        {groups.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {groups.map((g, i) => (
              <span key={g.name} className="flex items-center gap-1.5 rounded-full border border-mfo-border px-2.5 py-1 text-[11.5px] text-mfo-text">
                {g.name}
                <button onClick={() => removeGroup(i)} className="text-mfo-text-dim hover:text-mfo-danger" aria-label={t('smartGroup.removeGroup')}>
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}
      </Card>

      {phase === 'preview' && (
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-mfo-border px-3.5 py-2.5">
            <span className="text-[13px] font-medium text-mfo-text">{t('common.preview')}</span>
            <span className="rounded-full bg-mfo-green/10 px-2 py-0.5 text-[10.5px] font-medium text-mfo-green">{t('organize.file', { count: previewFiles.length })}</span>
          </div>
          <div className="flex flex-col divide-y divide-mfo-border">
            {previewFiles.map((f) => (
              <div key={f.name} className="flex items-center gap-2.5 px-3.5 py-1.5">
                <span className="min-w-0 flex-1 truncate text-[12px] text-mfo-text" title={f.name}>{f.name}</span>
                <ArrowRight size={12} className="shrink-0 text-mfo-text-dim" />
                <span className="shrink-0 text-[12px] font-medium text-mfo-green">{f.group}/</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2 border-t border-mfo-border p-3.5">
            <Button onClick={handleOrganize} disabled={organizing}>{organizing ? t('smartGroup.organizing') : t('organize.organizeNow')}</Button>
            <Button variant="outline" onClick={reset}>{t('common.cancel')}</Button>
          </div>
        </Card>
      )}

      {phase === 'results' && (
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-mfo-border px-3.5 py-2.5">
            <CheckCircle2 size={15} className="text-mfo-green" />
            <span className="text-[13px] font-medium text-mfo-text">{t('organize.done')}</span>
            <span className="ml-auto text-[11px] text-mfo-text-dim">{t('organize.moved', { count: movedFiles.length })}</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 p-3.5">
            {Object.entries(resultGroups).map(([group, items]) => (
              <div key={group} className="glass-card rounded-xl p-3">
                <div className="mb-1.5 flex items-center gap-2">
                  <Layers size={15} className="text-mfo-green" />
                  <span className="text-[12.5px] font-medium text-mfo-text">{group}</span>
                  <span className="ml-auto text-[11px] text-mfo-text-dim">{t('organize.file', { count: items.length })}</span>
                </div>
                <p className="text-[11px] text-mfo-text-dim">{t('organize.fileMoved', { count: items.length })}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2 border-t border-mfo-border p-3.5">
            <Button variant="outline" onClick={handleUndo}><Undo2 size={14} />{t('common.undo')}</Button>
            <Button variant="primary" onClick={reset}>{t('organize.organizeAnother')}</Button>
          </div>
        </Card>
      )}
    </div>
  );
}

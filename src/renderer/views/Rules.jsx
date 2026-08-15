import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Archive, ArrowRight, Calendar, CalendarCheck, CalendarX, Check, CheckCircle2, Circle, Code2,
  Download, Eye, FileText, FolderOpen, FolderPlus, GripVertical, Image, List,
  LayoutTemplate, Package, Pencil, Play, Plus, Search, Shield, Trash2, Undo2, Upload, Video, X, Zap
} from 'lucide-react';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import SegmentedControl from '../components/SegmentedControl.jsx';
import FolderPicker from '../components/FolderPicker.jsx';
import BatchFolderList from '../components/BatchFolderList.jsx';
import RuleEditorModal from '../components/RuleEditorModal.jsx';
import Checkbox from '../components/Checkbox.jsx';
import { formatSize, basename } from '../lib/format.js';
import { summarizeRule } from '../lib/ruleFields.js';
import { showToast } from '../lib/toast.js';
import { confirm } from '../lib/confirm.js';
import { getSettings, updateSettings } from '../lib/settingsStore.js';
import { useDebouncedValue } from '../lib/useDebouncedValue.js';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const PRESET_RULES = [
  { id: 'preset-1', nameKey: 'rules.preset1Name', descKey: 'rules.preset1Desc', icon: Package,
    conditions: [{ field: 'age', op: 'gt', value: 180, unit: 'days' }, { field: 'extension', value: 'exe' }], logic: 'AND', action: { type: 'delete' } },
  { id: 'preset-2', nameKey: 'rules.preset2Name', descKey: 'rules.preset2Desc', icon: Trash2,
    conditions: [{ field: 'extension', value: 'tmp' }], logic: 'OR', action: { type: 'delete' } },
  { id: 'preset-3', nameKey: 'rules.preset3Name', descKey: 'rules.preset3Desc', icon: Video,
    conditions: [{ field: 'size', op: 'gt', value: 500, unit: 'MB' }, { field: 'extension', value: 'mp4' }], logic: 'AND', action: { type: 'move', dest: '' } },
  { id: 'preset-4', nameKey: 'rules.preset4Name', descKey: 'rules.preset4Desc', icon: Archive,
    conditions: [{ field: 'age', op: 'gt', value: 90, unit: 'days' }], logic: 'AND', action: { type: 'move', dest: '' } },
  { id: 'preset-5', nameKey: 'rules.preset5Name', descKey: 'rules.preset5Desc', icon: Shield,
    conditions: [{ field: 'name', op: 'contains', value: 'backup' }, { field: 'age', op: 'gt', value: 30, unit: 'days' }], logic: 'AND', action: { type: 'delete' } },
  { id: 'preset-6', nameKey: 'rules.preset6Name', descKey: 'rules.preset6Desc', icon: FileText,
    conditions: [{ field: 'age', op: 'gt', value: 365, unit: 'days' }, { field: 'extension', value: 'pdf' }], logic: 'AND', action: { type: 'move', dest: '' } }
];

const RULE_TEMPLATES = [
  { id: 'tpl-downloads', nameKey: 'rules.tplDownloadsName', icon: Download, descKey: 'rules.tplDownloadsDesc', rules: [
    { name: 'Delete old installers', conditions: [{ field: 'age', op: 'gt', value: 180, unit: 'days' }, { field: 'extension', value: 'exe' }], logic: 'AND', action: { type: 'delete' }, enabled: true },
    { name: 'Clean temp files', conditions: [{ field: 'extension', value: 'tmp' }], logic: 'OR', action: { type: 'delete' }, enabled: true },
    { name: 'Archive old downloads', conditions: [{ field: 'age', op: 'gt', value: 90, unit: 'days' }], logic: 'AND', action: { type: 'move', dest: '' }, enabled: true }
  ] },
  { id: 'tpl-dev', nameKey: 'rules.tplDevName', icon: Code2, descKey: 'rules.tplDevDesc', rules: [
    { name: 'Delete log files', conditions: [{ field: 'extension', value: 'log' }], logic: 'OR', action: { type: 'delete' }, enabled: true },
    { name: 'Delete temp files', conditions: [{ field: 'extension', value: 'tmp' }], logic: 'OR', action: { type: 'delete' }, enabled: true },
    { name: 'Remove old backups', conditions: [{ field: 'name', op: 'contains', value: 'backup' }, { field: 'age', op: 'gt', value: 30, unit: 'days' }], logic: 'AND', action: { type: 'delete' }, enabled: true }
  ] },
  { id: 'tpl-photo', nameKey: 'rules.tplPhotoName', icon: Image, descKey: 'rules.tplPhotoDesc', rules: [
    { name: 'Archive large photos', conditions: [{ field: 'size', op: 'gt', value: 5, unit: 'MB' }, { field: 'extension', value: 'jpg' }], logic: 'AND', action: { type: 'move', dest: '' }, enabled: true },
    { name: 'Move screenshots', conditions: [{ field: 'name', op: 'starts', value: 'Screenshot' }], logic: 'AND', action: { type: 'move', dest: '' }, enabled: true }
  ] },
  { id: 'tpl-archiver', nameKey: 'rules.tplArchiverName', icon: Archive, descKey: 'rules.tplArchiverDesc', rules: [
    { name: 'Archive old documents', conditions: [{ field: 'age', op: 'gt', value: 365, unit: 'days' }, { field: 'extension', value: 'pdf' }], logic: 'AND', action: { type: 'move', dest: '' }, enabled: true },
    { name: 'Archive old files', conditions: [{ field: 'age', op: 'gt', value: 365, unit: 'days' }], logic: 'AND', action: { type: 'move', dest: '' }, enabled: true }
  ] }
];

function actionText(t, r) {
  if (r.action === 'delete') return t('common.delete');
  if (r.action === 'rename') return t('rules.renameTo', { name: r.newName || '' });
  if (r.action === 'dateTaken') return t('rules.moveByDateTakenTo', { name: r.dest ? basename(r.dest) : '?' });
  return t('rules.moveTo', { name: r.dest ? basename(r.dest) : '?' });
}

function ResultRow({ r, isPreview }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2.5 border-b border-mfo-border px-3.5 py-1.5 last:border-0">
      {isPreview
        ? <Eye size={13} className="shrink-0 text-mfo-text-dim" />
        : r.ok ? <Check size={13} className="shrink-0 text-mfo-green" /> : <X size={13} className="shrink-0 text-mfo-danger" />}
      <span className="min-w-0 flex-1 truncate text-[12px] text-mfo-text" title={r.file}>{r.file}</span>
      <ArrowRight size={11} className="shrink-0 text-mfo-text-dim" />
      <span className="shrink-0 text-[11px] text-mfo-text-dim">{actionText(t, r)}</span>
      {r.conflict && <span className="shrink-0 text-[10px] text-amber-400">{t('rules.conflict')}</span>}
      {r.rule && <span className="shrink-0 rounded bg-mfo-surface2 px-1.5 py-0.5 text-[10px] text-mfo-text-dim">{r.rule}</span>}
      {r.error && <span className="shrink-0 text-[10px] text-mfo-danger">{r.error}</span>}
    </div>
  );
}

function RecycleBinCard() {
  const { t } = useTranslation();
  const [info, setInfo] = useState(null);

  const load = () => window.api.getRecycleBinSize().then((r) => setInfo(r.ok ? r : { size: 0, count: 0 }));
  useEffect(() => { load(); }, []);

  const empty = async () => {
    const ok = await confirm(t('rules.recycleBinEmptyConfirm', { size: formatSize(info?.size || 0) }), { confirmLabel: t('rules.empty') });
    if (!ok) return;
    const r = await window.api.emptyRecycleBin();
    showToast(r.ok ? t('rules.recycleBinEmptied') : t('rules.recycleBinEmptyFailed'));
    load();
  };

  if (!info) return null;
  const isEmpty = !info.size;

  return (
    <Card className="p-3.5">
      <div className="mb-1 flex items-center gap-2">
        <Trash2 size={15} className="text-mfo-green" />
        <span className="text-[13px] font-medium text-mfo-text">{t('rules.recycleBin')}</span>
      </div>
      <p className="mb-2.5 text-[11.5px] text-mfo-text-dim">
        {isEmpty ? t('rules.recycleBinEmpty') : t('rules.recycleBinInfo', { size: formatSize(info.size), count: info.count })}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => window.api.openRecycleBin()} className="px-2.5 py-1 text-[11px]">{t('rules.open')}</Button>
        <Button variant="danger" onClick={empty} disabled={isEmpty} className="px-2.5 py-1 text-[11px]">{t('rules.empty')}</Button>
      </div>
    </Card>
  );
}

function ScheduleCard() {
  const { t } = useTranslation();
  const [folder, setFolder] = useState(null);
  const [days, setDays] = useState([]);
  const [time, setTime] = useState('10:00');
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    getSettings().then((settings) => {
      const s = settings.rulesSchedule || {};
      setFolder(s.folder || null);
      setDays(s.days || []);
      setTime(s.time || '10:00');
    });
  }, []);

  const pickFolder = () => window.api.pickFolder().then((f) => f && setFolder(f));
  const toggleDay = (day) => setDays((d) => (d.includes(day) ? d.filter((x) => x !== day) : [...d, day]));

  const enable = async () => {
    if (!days.length) { showToast(t('organize.selectDayFirst')); return; }
    if (!folder) { showToast(t('common.selectFolderFirst')); return; }
    const settings = await getSettings();
    updateSettings({ rulesSchedule: { ...settings.rulesSchedule, enabled: true, days, time, folder } });
    const result = await window.api.scheduleRules({ days, time, folder });
    setMsg(result.ok ? { ok: true, text: t('rules.scheduledPlain') } : { ok: false, text: t('organize.scheduleFailed') });
  };

  const disable = async () => {
    await window.api.unscheduleRules();
    const settings = await getSettings();
    updateSettings({ rulesSchedule: { ...settings.rulesSchedule, enabled: false } });
    setMsg({ ok: true, text: t('organize.autoRunDisabled') });
  };

  return (
    <Card className="p-3.5">
      <div className="mb-2.5 flex items-center gap-2">
        <Calendar size={15} className="text-mfo-green" />
        <span className="text-[13px] font-medium text-mfo-text">{t('rules.scheduledRulesRun')}</span>
      </div>

      <div className="flex items-center gap-1.5 rounded-lg border border-mfo-border px-2 py-1.5">
        <input
          readOnly
          value={folder || ''}
          placeholder={t('rules.autoRunPlaceholder')}
          className="min-w-0 flex-1 bg-transparent px-1 text-[13px] text-mfo-text outline-none placeholder:text-mfo-text-dim"
        />
        <button onClick={pickFolder} className="flex items-center gap-1 rounded-md border border-mfo-border px-2 py-1 text-xs text-mfo-text-dim hover:bg-mfo-surface2 hover:text-mfo-text">
          <FolderOpen size={13} />{t('common.browse')}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {DAYS.map((d) => (
          <button
            key={d}
            onClick={() => toggleDay(d)}
            className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
              days.includes(d) ? 'border-mfo-green bg-mfo-green/10 text-mfo-green' : 'border-mfo-border text-mfo-text-dim hover:text-mfo-text'
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      <input
        type="time"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        className="mt-3 rounded-lg border border-mfo-border bg-transparent px-2.5 py-1.5 text-[13px] text-mfo-text outline-none"
      />

      <div className="mt-3 flex gap-2">
        <Button onClick={enable}><CalendarCheck size={14} />{t('common.enable')}</Button>
        <Button variant="outline" onClick={disable}><CalendarX size={14} />{t('common.disable')}</Button>
      </div>

      {msg && (
        <p className={`mt-2.5 text-[12px] ${msg.ok ? 'text-mfo-green' : 'text-mfo-danger'}`}>
          {msg.ok ? '✓' : '✗'} {msg.text}
        </p>
      )}
    </Card>
  );
}

function RunSubView({ rules }) {
  const { t } = useTranslation();
  const [multiMode, setMultiMode] = useState(false);
  const [dryRun, setDryRun] = useState(false);
  const [folder, setFolder] = useState(null);
  const [batchFolders, setBatchFolders] = useState([]);
  const [batchStatuses, setBatchStatuses] = useState({});
  const [previewResults, setPreviewResults] = useState(null);
  const [runResults, setRunResults] = useState(null);
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);
  const [running, setRunning] = useState(false);
  const [lastMoves, setLastMoves] = useState([]);
  const [showRecycleBin, setShowRecycleBin] = useState(false);

  useEffect(() => { getSettings().then((s) => setDryRun(!!s.rulesDryRun)); }, []);

  const toggleDryRun = () => {
    const next = !dryRun;
    setDryRun(next);
    updateSettings({ rulesDryRun: next });
    showToast(next ? t('rules.dryRunEnabled') : t('rules.dryRunDisabled'));
  };

  const enabledRules = rules.filter((r) => r.enabled);

  const doPreview = async () => {
    if (!folder) { showToast(t('common.selectFolderFirst')); return; }
    if (!enabledRules.length) { showToast(t('rules.noActiveRules')); return; }
    const res = await window.api.previewRules({ folderPath: folder, rules: enabledRules });
    setPreviewResults(res.results || []);
    setRunResults(null);
    setAwaitingConfirm(false);
    return res;
  };

  const executeRun = async () => {
    if (!folder) { showToast(t('common.selectFolderFirst')); return; }
    if (!enabledRules.length) { showToast(t('rules.noActiveRules')); return; }
    setRunning(true);
    const res = await window.api.runRules({ folderPath: folder, rules: enabledRules });
    setRunning(false);
    const results = res.results || [];
    setRunResults(results);
    setPreviewResults(null);
    setAwaitingConfirm(false);
    setLastMoves(results.filter((r) => r.ok && (r.action === 'move' || r.action === 'rename')).map((r) => ({ name: r.file, from: r.from, to: r.to })));
    setShowRecycleBin(results.some((r) => r.ok && r.action === 'delete'));
  };

  const handleRunClick = async () => {
    if (multiMode) return runBatch();
    if (dryRun) { await doPreview(); setAwaitingConfirm(true); return; }
    executeRun();
  };

  const runBatch = async () => {
    if (!batchFolders.length) { showToast(t('organize.noFoldersAdded')); return; }
    if (!enabledRules.length) { showToast(t('rules.noActiveRules')); return; }
    for (let i = 0; i < batchFolders.length; i++) {
      setBatchStatuses((s) => ({ ...s, [i]: { type: 'active', text: t('rules.running') } }));
      try {
        const res = await window.api.runRules({ folderPath: batchFolders[i], rules: enabledRules });
        const count = res.results?.filter((r) => r.ok).length || 0;
        setBatchStatuses((s) => ({ ...s, [i]: { type: 'done', text: t('organize.file', { count }) } }));
      } catch {
        setBatchStatuses((s) => ({ ...s, [i]: { type: 'error', text: t('rules.error') } }));
      }
      window.api.addRecentFolder(batchFolders[i]);
    }
  };

  const handleUndo = async () => {
    if (!lastMoves.length) return;
    const r = await window.api.undo(lastMoves);
    showToast(t('organize.restoredFiles', { count: r.restored.length }));
    setLastMoves([]);
    setRunResults(null);
  };

  const addBatchFolder = (f) => setBatchFolders((list) => (list.includes(f) ? list : [...list, f]));

  return (
    <div className="flex flex-col gap-3">
      <Card className="flex flex-wrap items-center justify-between gap-2 p-3.5">
        <span className="text-[13px] font-medium text-mfo-text">{t('rules.runRules')}</span>
        <div className="flex items-center gap-3">
          <div onClick={() => setMultiMode((v) => !v)} className="flex cursor-pointer select-none items-center gap-1.5 text-[11.5px] text-mfo-text-dim">
            <Checkbox checked={multiMode} onChange={setMultiMode} />
            {t('rules.multiFolder')}
          </div>
          <div onClick={toggleDryRun} className="flex cursor-pointer select-none items-center gap-1.5 text-[11.5px] text-mfo-text-dim">
            <Checkbox checked={dryRun} onChange={toggleDryRun} />
            {t('rules.dryRun')}
          </div>
        </div>
      </Card>

      {!multiMode ? (
        <Card className="p-3.5">
          <FolderPicker value={folder} onPick={setFolder} />
        </Card>
      ) : (
        <Card className="p-3.5">
          <div className="mb-2.5 flex items-center gap-2">
            <button
              onClick={() => window.api.pickFolder().then((f) => f && addBatchFolder(f))}
              className="flex items-center gap-1.5 rounded-md border border-mfo-border px-2.5 py-1.5 text-xs text-mfo-text-dim hover:bg-mfo-surface2 hover:text-mfo-text"
            >
              <FolderPlus size={14} />{t('organize.addFolder')}
            </button>
          </div>
          <BatchFolderList folders={batchFolders} statuses={batchStatuses} onRemove={(i) => setBatchFolders((f) => f.filter((_, idx) => idx !== i))} />
        </Card>
      )}

      <div className="flex gap-2">
        <Button variant="outline" onClick={doPreview}><Eye size={14} />{t('common.preview')}</Button>
        <Button onClick={handleRunClick} disabled={running}>
          <Zap size={14} />{multiMode ? t('home.runAll') : running ? t('rules.running') : t('rules.runRules')}
        </Button>
      </div>

      {(previewResults || runResults) && (
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-mfo-border px-3.5 py-2.5">
            <span className="text-[13px] font-medium text-mfo-text">{runResults ? t('rules.results') : t('common.preview')}</span>
            <span className="rounded-full bg-mfo-green/10 px-2 py-0.5 text-[10.5px] font-medium text-mfo-green">
              {t('organize.file', { count: (runResults || previewResults).length })}
            </span>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {(runResults || previewResults).map((r, i) => <ResultRow key={i} r={r} isPreview={!runResults} />)}
          </div>
          {awaitingConfirm && (
            <div className="flex gap-2 border-t border-mfo-border p-3.5">
              <Button onClick={executeRun}>{t('rules.confirmExecute')}</Button>
              <Button variant="outline" onClick={() => { setAwaitingConfirm(false); setPreviewResults(null); }}>{t('common.cancel')}</Button>
            </div>
          )}
          {runResults && lastMoves.length > 0 && (
            <div className="flex gap-2 border-t border-mfo-border p-3.5">
              <Button variant="outline" onClick={handleUndo}><Undo2 size={14} />{t('common.undo')}</Button>
            </div>
          )}
        </Card>
      )}

      {showRecycleBin && <RecycleBinCard />}
      <ScheduleCard />
    </div>
  );
}

function MyRulesSubView({ rules, onEdit, onDelete, onToggle, onReorder, goTemplates }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const dragIdRef = useRef(null);
  const filtered = rules.filter((r) => r.name.toLowerCase().includes(debouncedSearch.toLowerCase()));

  const handleDrop = (targetId) => {
    const dragId = dragIdRef.current;
    if (dragId == null || dragId === targetId) return;
    const next = [...rules];
    const dragIdx = next.findIndex((r) => r.id === dragId);
    const dropIdx = next.findIndex((r) => r.id === targetId);
    if (dragIdx === -1 || dropIdx === -1) return;
    const [moved] = next.splice(dragIdx, 1);
    next.splice(dropIdx, 0, moved);
    onReorder(next);
  };

  if (rules.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
        <List size={28} className="text-mfo-text-dim" />
        <p className="text-sm font-medium text-mfo-text">{t('rules.noRulesYet')}</p>
        <div className="flex gap-2">
          <Button onClick={() => onEdit(null)}><Plus size={14} />{t('rules.addRule')}</Button>
          <Button variant="outline" onClick={goTemplates}>{t('rules.browseTemplates')}</Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {rules.length >= 4 && (
        <div className="flex items-center gap-2 rounded-lg border border-mfo-border px-2.5 py-1.5">
          <Search size={13} className="text-mfo-text-dim" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('rules.searchRules')}
            className="flex-1 bg-transparent text-[12.5px] text-mfo-text outline-none placeholder:text-mfo-text-dim"
          />
        </div>
      )}
      <div className="flex flex-col gap-2">
        {filtered.map((r) => (
          <Card
            key={r.id}
            draggable
            onDragStart={() => { dragIdRef.current = r.id; }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(r.id)}
            className="flex items-center gap-2.5 p-3"
            hover={false}
          >
            <GripVertical size={14} className="shrink-0 cursor-grab text-mfo-text-dim" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-medium text-mfo-text">{r.name}</p>
              <p className="truncate text-[10.5px] text-mfo-text-dim">{summarizeRule(t, r)}</p>
            </div>
            <button onClick={() => onToggle(r.id)} className="shrink-0 text-mfo-text-dim hover:text-mfo-green" aria-label={t('rules.toggleEnabled')}>
              {r.enabled ? <CheckCircle2 size={16} className="text-mfo-green" /> : <Circle size={16} />}
            </button>
            <button onClick={() => onEdit(r)} className="shrink-0 rounded p-1 text-mfo-text-dim hover:bg-mfo-surface2 hover:text-mfo-text" aria-label={t('common.edit')}>
              <Pencil size={14} />
            </button>
            <button onClick={() => onDelete(r.id)} className="shrink-0 rounded p-1 text-mfo-text-dim hover:bg-mfo-danger/10 hover:text-mfo-danger" aria-label={t('common.delete')}>
              <Trash2 size={14} />
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function TemplatesSubView({ rules, onAddPreset, onImportTemplate }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-2 text-[12.5px] font-medium text-mfo-text">{t('rules.presetRules')}</p>
        <div className="grid grid-cols-2 gap-2.5">
          {PRESET_RULES.map((p) => {
            const Icon = p.icon;
            const added = rules.some((r) => r.presetId === p.id);
            return (
              <Card key={p.id} className="flex items-start gap-2.5 p-3">
                <Icon size={18} className="mt-0.5 shrink-0 text-mfo-green" />
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-medium text-mfo-text">{t(p.nameKey)}</p>
                  <p className="text-[10.5px] text-mfo-text-dim">{t(p.descKey)}</p>
                </div>
                <Button variant={added ? 'outline' : 'primary'} onClick={() => onAddPreset(p)} className="shrink-0 px-2.5 py-1 text-[11px]">
                  {added ? t('common.remove') : t('common.add')}
                </Button>
              </Card>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[12.5px] font-medium text-mfo-text">{t('rules.ruleTemplates')}</p>
        <div className="grid grid-cols-2 gap-2.5">
          {RULE_TEMPLATES.map((tpl) => {
            const Icon = tpl.icon;
            return (
              <Card key={tpl.id} className="flex items-start gap-2.5 p-3">
                <Icon size={18} className="mt-0.5 shrink-0 text-mfo-green" />
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-medium text-mfo-text">{t(tpl.nameKey)}</p>
                  <p className="text-[10.5px] text-mfo-text-dim">{t(tpl.descKey)}</p>
                  <p className="mt-0.5 text-[10px] text-mfo-text-dim">{t('rules.rule', { count: tpl.rules.length })}</p>
                </div>
                <Button variant="outline" onClick={() => onImportTemplate(tpl)} className="shrink-0 px-2.5 py-1 text-[11px]">{t('common.import')}</Button>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function Rules() {
  const { t } = useTranslation();
  const [subView, setSubView] = useState('run');
  const [rules, setRules] = useState([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);

  useEffect(() => { window.api.getRules().then(setRules); }, []);

  const persist = (next) => { setRules(next); window.api.saveRules(next); };

  const openEditor = (rule) => { setEditingRule(rule); setEditorOpen(true); };

  const handleSaveRule = (rule) => {
    const next = editingRule ? rules.map((r) => (r.id === rule.id ? rule : r)) : [...rules, rule];
    persist(next);
    setEditorOpen(false);
    showToast(t('rules.ruleSaved', { name: rule.name }));
  };

  const deleteRule = async (id) => {
    const ok = await confirm(t('rules.deleteRuleConfirm'), { confirmLabel: t('common.delete') });
    if (!ok) return;
    persist(rules.filter((r) => r.id !== id));
  };

  const toggleRule = (id) => persist(rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  const bulkToggle = (enabled) => persist(rules.map((r) => ({ ...r, enabled })));

  const handleExport = async () => {
    const r = await window.api.exportRules();
    if (r.cancelled) return;
    showToast(r.ok ? t('rules.rulesExported') : `${r.error}`);
  };

  const handleImport = async () => {
    const r = await window.api.importRules();
    if (r.cancelled) return;
    if (r.ok) { window.api.getRules().then(setRules); showToast(t('rules.rulesImported', { count: r.added })); }
    else showToast(`${r.error}`);
  };

  const addPreset = async (preset) => {
    if (rules.some((r) => r.presetId === preset.id)) {
      persist(rules.filter((r) => r.presetId !== preset.id));
      return;
    }
    let action = preset.action;
    if (action.type === 'move') {
      const dest = await window.api.pickFolder();
      if (!dest) return;
      action = { ...action, dest };
    }
    persist([...rules, { id: Date.now(), presetId: preset.id, name: t(preset.nameKey), conditions: preset.conditions, logic: preset.logic, action, enabled: true }]);
  };

  const importTemplate = (template) => {
    const existing = new Set(rules.map((r) => r.name.toLowerCase()));
    const newRules = template.rules.filter((r) => !existing.has(r.name.toLowerCase())).map((r) => ({ ...r, id: Date.now() + Math.random() }));
    if (!newRules.length) { showToast(t('rules.allTemplateRulesExist')); return; }
    persist([...rules, ...newRules]);
    showToast(t('rules.templateImported', { count: newRules.length, name: t(template.nameKey) }));
  };

  return (
    <div className="flex flex-col gap-3">
      <Card className="flex flex-wrap items-center justify-between gap-2 p-2.5">
        <SegmentedControl
          layoutId="rules-subview"
          value={subView}
          onChange={setSubView}
          options={[
            { value: 'run', label: t('rules.tabRun'), icon: Play },
            { value: 'myrules', label: t('rules.tabMyRules'), icon: List },
            { value: 'templates', label: t('rules.tabTemplates'), icon: LayoutTemplate }
          ]}
        />
        <div className="flex items-center gap-1">
          <button onClick={() => bulkToggle(true)} title={t('rules.enableAll')} className="rounded p-1.5 text-mfo-text-dim hover:bg-mfo-surface2 hover:text-mfo-green"><CheckCircle2 size={15} /></button>
          <button onClick={() => bulkToggle(false)} title={t('rules.disableAll')} className="rounded p-1.5 text-mfo-text-dim hover:bg-mfo-surface2 hover:text-mfo-text"><Circle size={15} /></button>
          <div className="mx-1 h-4 w-px bg-mfo-border" />
          <button onClick={handleExport} title={t('common.export')} className="rounded p-1.5 text-mfo-text-dim hover:bg-mfo-surface2 hover:text-mfo-text"><Download size={15} /></button>
          <button onClick={handleImport} title={t('common.import')} className="rounded p-1.5 text-mfo-text-dim hover:bg-mfo-surface2 hover:text-mfo-text"><Upload size={15} /></button>
          <div className="mx-1 h-4 w-px bg-mfo-border" />
          <Button onClick={() => openEditor(null)} className="px-2.5 py-1.5 text-[12px]"><Plus size={13} />{t('rules.addRule')}</Button>
        </div>
      </Card>

      {subView === 'run' && <RunSubView rules={rules} />}
      {subView === 'myrules' && (
        <MyRulesSubView
          rules={rules}
          onEdit={openEditor}
          onDelete={deleteRule}
          onToggle={toggleRule}
          onReorder={persist}
          goTemplates={() => setSubView('templates')}
        />
      )}
      {subView === 'templates' && <TemplatesSubView rules={rules} onAddPreset={addPreset} onImportTemplate={importTemplate} />}

      <RuleEditorModal open={editorOpen} rule={editingRule} onSave={handleSaveRule} onClose={() => setEditorOpen(false)} />
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  ArrowRight, BarChart3, ChevronDown, Download, ExternalLink, FolderOpen,
  History, Pencil, Trash2, Undo2, X
} from 'lucide-react';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import SegmentedControl from '../components/SegmentedControl.jsx';
import Checkbox from '../components/Checkbox.jsx';
import { basename } from '../lib/format.js';
import { showToast } from '../lib/toast.js';
import { confirm } from '../lib/confirm.js';

const TYPE_LABEL_KEYS = { organize: 'organize.tabOrganize', rules: 'nav.rules', watcher: 'nav.watcher', cleanup: 'nav.cleanup', 'smart-group': 'nav.smartGroup' };
const ACTION_LABEL_KEYS = { move: 'activity.actionMove', delete: 'activity.actionDelete', rename: 'activity.actionRename' };
const TYPE_COLOR = {
  organize: 'bg-mfo-green/10 text-mfo-green',
  rules: 'bg-blue-500/10 text-blue-400',
  'smart-group': 'bg-purple-500/10 text-purple-400',
  watcher: 'bg-amber-500/10 text-amber-400',
  cleanup: 'bg-mfo-danger/10 text-mfo-danger'
};
const TYPE_FILTERS = ['all', 'organize', 'rules', 'smart-group', 'watcher'];
const CHART_COLORS = ['#3ddb3d', '#378add', '#ef9f27', '#d4537e', '#7f77dd', '#1dacd6', '#f97316', '#28c840'];

function sessionFileCount(s) {
  return s.total || s.count || s.moved?.length || s.files?.length || s.results?.length || 0;
}

function groupMoved(moved) {
  const groups = {};
  for (const m of moved) (groups[m.category] = groups[m.category] || []).push(m);
  return groups;
}

function groupRuleResults(results) {
  const groups = { move: [], delete: [], rename: [] };
  for (const r of results) if (groups[r.action]) groups[r.action].push(r);
  return groups;
}

function SessionCard({ session: s, expanded, onToggle, onChanged }) {
  const { t } = useTranslation();
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(s.note || '');
  const isRules = s.type === 'rules';
  const isCleanup = s.type === 'cleanup';
  const canExport = !isRules;
  const canUndoSession = !isRules;

  const saveNote = async () => {
    try {
      await window.api.updateSessionNote({ id: s.id, note: noteDraft.slice(0, 200) });
      setEditingNote(false);
      onChanged();
    } catch {
      showToast(t('activity.couldNotSaveNote'));
    }
  };

  const handleExport = () => {
    const lines = [
      'Mojo File Organizer - Session Export',
      `Date: ${new Date(s.timestamp).toLocaleString()}`,
      `Folder: ${s.folder}`,
      `Type: ${s.type || 'organize'}`,
      `Total: ${sessionFileCount(s)}`,
      '',
      isCleanup ? t('activity.filesCleaned') : t('activity.filesMoved'),
      ...(isCleanup
        ? (s.files || []).map((f) => `  ${f.name}`)
        : (s.moved || []).map((m) => `  ${m.name} -> ${m.category}`))
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mojo-session-${s.id}.txt`;
    a.click();
  };

  const handleOpenFolder = () => window.api.openFolder(s.folder);

  const handleUndoSession = async () => {
    const ok = await confirm(t('activity.undoSessionConfirm', { count: sessionFileCount(s) }), { confirmLabel: t('common.undo') });
    if (!ok) return;
    const result = isCleanup ? await window.api.restoreCleanup(s.files) : await window.api.undo(s.moved);
    if (result.restored?.length > 0) {
      await window.api.deleteSession(s.id);
      showToast(t('cleanup.restoredItems', { count: result.restored.length }));
      onChanged();
    } else {
      showToast(t('activity.nothingRestored'));
    }
  };

  const handleDeleteSession = async () => {
    const ok = await confirm(t('activity.deleteSessionConfirm'), { confirmLabel: t('common.delete') });
    if (!ok) return;
    await window.api.deleteSession(s.id);
    onChanged();
  };

  const handleUndoFile = async (m) => {
    if (isRules) {
      await window.api.undo([{ from: m.to, to: m.from, name: m.file }]);
    } else {
      await window.api.undoSingleFile({ sessionId: s.id, fileName: m.name, from: m.from, to: m.to });
    }
    showToast(t('activity.fileRestored'));
    onChanged();
  };

  const movedGroups = !isRules && !isCleanup ? groupMoved(s.moved || []) : null;
  const ruleGroups = isRules ? groupRuleResults(s.results || []) : null;

  return (
    <Card className="overflow-hidden">
      <div onClick={onToggle} className="flex cursor-pointer items-center gap-2.5 px-3.5 py-2.5">
        <span className="w-24 shrink-0 text-[10.5px] text-mfo-text-dim">{new Date(s.timestamp).toLocaleDateString()}</span>
        <span className={`w-20 shrink-0 rounded px-1.5 py-0.5 text-center text-[10px] font-medium ${TYPE_COLOR[s.type] || TYPE_COLOR.organize}`}>
          {TYPE_LABEL_KEYS[s.type] ? t(TYPE_LABEL_KEYS[s.type]) : t('organize.tabOrganize')}
        </span>
        <span className="min-w-0 flex-1 truncate text-[12px] text-mfo-text" title={s.folder}>{basename(s.folder)}</span>
        <span className="w-16 shrink-0 text-right text-[11px] text-mfo-text-dim">{t('activity.item', { count: sessionFileCount(s) })}</span>
        <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setEditingNote((v) => !v)} className="rounded p-1 text-mfo-text-dim hover:bg-mfo-surface2 hover:text-mfo-text" title={t('activity.noteTooltip')}><Pencil size={13} /></button>
          <button
            onClick={canExport ? handleExport : undefined}
            className={`rounded p-1 text-mfo-text-dim hover:bg-mfo-surface2 hover:text-mfo-text ${canExport ? '' : 'invisible pointer-events-none'}`}
            title={t('common.export')}
          ><Download size={13} /></button>
          <button onClick={handleOpenFolder} className="rounded p-1 text-mfo-text-dim hover:bg-mfo-surface2 hover:text-mfo-text" title={t('activity.openFolderTooltip')}><FolderOpen size={13} /></button>
          <button
            onClick={canUndoSession ? handleUndoSession : undefined}
            className={`rounded p-1 text-mfo-text-dim hover:bg-mfo-surface2 hover:text-mfo-text ${canUndoSession ? '' : 'invisible pointer-events-none'}`}
            title={t('common.undo')}
          ><Undo2 size={13} /></button>
          <button onClick={handleDeleteSession} className="rounded p-1 text-mfo-text-dim hover:bg-mfo-danger/10 hover:text-mfo-danger" title={t('common.delete')}><X size={13} /></button>
        </div>
        <ChevronDown size={14} className={`shrink-0 text-mfo-text-dim transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </div>

      {editingNote && (
        <div className="flex items-center gap-2 border-t border-mfo-border px-3.5 py-2" onClick={(e) => e.stopPropagation()}>
          <input
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            maxLength={200}
            placeholder={t('activity.addNotePlaceholder')}
            className="flex-1 rounded-md border border-mfo-border bg-transparent px-2 py-1 text-[12px] text-mfo-text outline-none"
          />
          <Button variant="outline" onClick={saveNote} className="px-2.5 py-1">{t('common.save')}</Button>
        </div>
      )}
      {!editingNote && s.note && (
        <p className="border-t border-mfo-border px-3.5 py-1.5 text-[11px] italic text-mfo-text-dim">{s.note}</p>
      )}

      {expanded && (
        <div className="flex flex-col gap-2.5 border-t border-mfo-border p-3.5">
          {isCleanup && (
            <div className="flex flex-wrap gap-1.5">
              {(s.files || []).map((f) => (
                <span key={f.path} className="rounded-md border border-mfo-border px-2 py-1 text-[11px] text-mfo-text-dim">{f.name}</span>
              ))}
            </div>
          )}

          {movedGroups && Object.entries(movedGroups).map(([cat, files]) => (
            <div key={cat}>
              <p className="mb-1 text-[10.5px] font-medium uppercase tracking-wide text-mfo-text-dim">{cat}</p>
              <div className="flex flex-wrap gap-1.5">
                {files.map((f) => (
                  <span key={f.to || f.name} className="flex items-center gap-1.5 rounded-md border border-mfo-border px-2 py-1 text-[11px] text-mfo-text">
                    {f.name}
                    {f.to && (
                      <button onClick={() => window.api.openFileLocation(f.to)} className="text-mfo-text-dim hover:text-mfo-text" title={t('activity.openLocationTooltip')}>
                        <ExternalLink size={11} />
                      </button>
                    )}
                    <button onClick={() => handleUndoFile(f)} className="text-mfo-text-dim hover:text-mfo-green" title={t('activity.undoFileTooltip')}>
                      <Undo2 size={11} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ))}

          {ruleGroups && [['move', ArrowRight], ['delete', Trash2], ['rename', Pencil]].map(([action, Icon]) => (
            ruleGroups[action].length > 0 && (
              <div key={action}>
                <p className="mb-1 flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-wide text-mfo-text-dim">
                  <Icon size={11} />{t(ACTION_LABEL_KEYS[action])}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {ruleGroups[action].map((r, i) => (
                    <span key={i} className="flex items-center gap-1.5 rounded-md border border-mfo-border px-2 py-1 text-[11px] text-mfo-text">
                      {r.file}
                      {action !== 'delete' && r.from && r.to && (
                        <button onClick={() => handleUndoFile(r)} className="text-mfo-text-dim hover:text-mfo-green" title={t('activity.undoFileTooltip')}>
                          <Undo2 size={11} />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      )}
    </Card>
  );
}

function SessionsView() {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState([]);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [compact, setCompact] = useState(() => localStorage.getItem('historyCompact') === 'true');
  const [expanded, setExpanded] = useState(new Set());

  const load = () => window.api.getLog().then(setSessions);
  useEffect(() => { load(); }, []);

  useEffect(() => {
    localStorage.setItem('historyCompact', compact);
  }, [compact]);

  const filtered = useMemo(() => sessions.filter((s) => {
    const matchType = typeFilter === 'all'
      || s.type === typeFilter
      || (typeFilter === 'organize' && !s.type);
    if (!matchType) return false;
    if (search) {
      const haystack = `${s.folder} ${(s.moved || []).map((m) => m.name).join(' ')}`.toLowerCase();
      if (!haystack.includes(search.toLowerCase())) return false;
    }
    if (dateFrom && new Date(s.timestamp) < new Date(`${dateFrom}T00:00:00`)) return false;
    if (dateTo && new Date(s.timestamp) > new Date(`${dateTo}T23:59:59`)) return false;
    return true;
  }), [sessions, search, dateFrom, dateTo, typeFilter]);

  const clearFilters = () => { setSearch(''); setDateFrom(''); setDateTo(''); setTypeFilter('all'); };

  const clearAll = async () => {
    const ok = await confirm(t('activity.clearHistoryConfirm'), { confirmLabel: t('activity.clear') });
    if (!ok) return;
    await window.api.clearLog();
    showToast(t('activity.historyCleared'));
    load();
  };

  const toggleExpanded = (id) => setExpanded((e) => {
    const next = new Set(e);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('activity.searchPlaceholder')}
          className="min-w-[160px] flex-1 rounded-lg border border-mfo-border bg-transparent px-2.5 py-1.5 text-[12.5px] text-mfo-text outline-none placeholder:text-mfo-text-dim"
        />
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-lg border border-mfo-border bg-transparent px-2 py-1.5 text-[12px] text-mfo-text outline-none" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-lg border border-mfo-border bg-transparent px-2 py-1.5 text-[12px] text-mfo-text outline-none" />
        <button onClick={clearFilters} className="text-[11px] text-mfo-text-dim hover:text-mfo-text">{t('activity.clearFilters')}</button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {TYPE_FILTERS.map((filterType) => (
            <button
              key={filterType}
              onClick={() => setTypeFilter(filterType)}
              className={`rounded-md border px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                typeFilter === filterType ? 'border-mfo-green bg-mfo-green/10 text-mfo-green' : 'border-mfo-border text-mfo-text-dim hover:text-mfo-text'
              }`}
            >
              {filterType === 'all' ? t('activity.all') : (TYPE_LABEL_KEYS[filterType] ? t(TYPE_LABEL_KEYS[filterType]) : filterType)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div onClick={() => setCompact((v) => !v)} className="flex cursor-pointer select-none items-center gap-1.5 text-[11px] text-mfo-text-dim">
            <Checkbox checked={compact} onChange={setCompact} />
            {t('activity.compact')}
          </div>
          <Button variant="outline" onClick={clearAll} className="px-2.5 py-1 text-[11px]"><Trash2 size={12} />{t('common.clearAll')}</Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 px-6 py-14 text-center">
          <History size={28} className="text-mfo-text-dim" />
          <p className="text-sm font-medium text-mfo-text">{t('activity.noHistory')}</p>
          <p className="text-xs text-mfo-text-dim">{t('activity.noHistoryHint')}</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((s) => (
            <SessionCard
              key={s.id}
              session={s}
              expanded={!compact && expanded.has(s.id)}
              onToggle={() => !compact && toggleExpanded(s.id)}
              onChanged={load}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ChartRow({ label, value, max, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-28 shrink-0 truncate text-[11.5px] text-mfo-text-dim">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-mfo-surface2">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <span className="w-8 shrink-0 text-right text-[11px] text-mfo-text">{value}</span>
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div className="glass-card rounded-xl p-3 text-center">
      <p className={`text-xl font-semibold ${accent ? 'text-mfo-green' : 'text-mfo-text'}`}>{value}</p>
      <p className="mt-0.5 text-[10.5px] text-mfo-text-dim">{label}</p>
    </div>
  );
}

function weekLabel(t, i) {
  if (i === 6) return t('activity.lastWeek');
  if (i === 7) return t('activity.thisWeek');
  return t('activity.weeksAgo', { count: 7 - i });
}

function StatsView() {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);

  useEffect(() => { window.api.getStats().then(setStats); }, []);

  const handleExport = async (format) => {
    const result = await window.api.showSaveDialog({
      title: t('activity.exportStatsTitle'),
      defaultPath: `mojo-stats-${new Date().toISOString().slice(0, 10)}.${format}`,
      filters: [{ name: format.toUpperCase(), extensions: [format] }]
    });
    if (result.canceled || !result.filePath) return;
    if (format === 'csv') await window.api.exportCsv(result.filePath);
    else await window.api.exportPdf(result.filePath);
    showToast(t('activity.statsExported'));
  };

  if (!stats) return null;

  const hasOrganize = stats.totalFiles > 0;
  const hasRules = stats.rulesStats?.total > 0;
  const categories = Object.entries(stats.byCategory || {}).sort((a, b) => b[1] - a[1]);
  const maxCategory = Math.max(...categories.map(([, v]) => v), 1);
  const maxWeekly = Math.max(...(stats.weeklyTrend || []), 1);
  const hasTrend = hasOrganize && stats.weeklyTrend?.some((v) => v > 0);

  if (!hasOrganize && !hasRules) {
    return (
      <Card className="flex flex-col items-center gap-2 px-6 py-14 text-center">
        <BarChart3 size={28} className="text-mfo-text-dim" />
        <p className="text-sm font-medium text-mfo-text">{t('activity.noStats')}</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => handleExport('csv')} className="px-2.5 py-1 text-[11px]"><Download size={12} />CSV</Button>
        <Button variant="outline" onClick={() => handleExport('pdf')} className="px-2.5 py-1 text-[11px]"><Download size={12} />PDF</Button>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {hasOrganize && <StatCard label={t('home.filesOrganized')} value={stats.totalFiles} accent />}
        {hasOrganize && <StatCard label={t('activity.organizeSessions')} value={stats.totalSessions} />}
        {hasOrganize && <StatCard label={t('activity.categoriesUsed')} value={categories.length} />}
        {hasRules && <StatCard label={t('activity.filesViaRules')} value={stats.rulesStats.total} accent />}
        {hasRules && <StatCard label={t('activity.ruleSessions')} value={stats.rulesStats.sessions} />}
        {hasRules && <StatCard label={t('activity.moveDeleteRename')} value={`${stats.rulesStats.move} / ${stats.rulesStats.delete} / ${stats.rulesStats.rename}`} />}
      </div>

      {categories.length > 0 && (
        <Card className="p-3.5">
          <p className="mb-2.5 text-[12.5px] font-medium text-mfo-text">{t('activity.byCategory')}</p>
          <div className="flex flex-col gap-2">
            {categories.map(([cat, count], i) => (
              <ChartRow key={cat} label={cat} value={count} max={maxCategory} color={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </div>
        </Card>
      )}

      {hasTrend && (
        <Card className="p-3.5">
          <p className="mb-2.5 text-[12.5px] font-medium text-mfo-text">{t('activity.weeklyTrend')}</p>
          <div className="flex flex-col gap-2">
            {stats.weeklyTrend.map((v, i) => (
              <ChartRow key={i} label={weekLabel(t, i)} value={v} max={maxWeekly} color="#3ddb3d" />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

export default function Activity() {
  const { t } = useTranslation();
  const [subView, setSubView] = useState('sessions');

  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl
        layoutId="activity-subview"
        value={subView}
        onChange={setSubView}
        options={[
          { value: 'sessions', label: t('activity.tabSessions'), icon: History },
          { value: 'stats', label: t('activity.tabStats'), icon: BarChart3 }
        ]}
      />
      {subView === 'sessions' ? <SessionsView /> : <StatsView />}
    </div>
  );
}

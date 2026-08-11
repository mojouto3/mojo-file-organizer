import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, Archive, Calendar, CalendarCheck, CalendarX, CheckCircle2, Code, Download,
  FileText, Folder, FolderOpen, FolderPlus, Image, Layers, Music, Package,
  Search, Type, Undo2, Video, Zap
} from 'lucide-react';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import SegmentedControl from '../components/SegmentedControl.jsx';
import FolderPicker from '../components/FolderPicker.jsx';
import BatchFolderList from '../components/BatchFolderList.jsx';
import { showToast } from '../lib/toast.js';

const CATEGORY_ICONS = {
  Images: Image, Videos: Video, Audio: Music, Documents: FileText,
  Archives: Archive, Code, Installers: Package, Fonts: Type, Torrents: Download
};
const getCatIcon = (cat) => CATEGORY_ICONS[cat] || Folder;

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

function groupByCategory(items) {
  const groups = {};
  for (const item of items) {
    (groups[item.category] = groups[item.category] || []).push(item);
  }
  return groups;
}

function CategoryCard({ category, items, mode }) {
  const Icon = getCatIcon(category);
  return (
    <div className="glass-card rounded-xl p-3">
      <div className="mb-1.5 flex items-center gap-2">
        <Icon size={15} className="text-mfo-green" />
        <span className="text-[12.5px] font-medium text-mfo-text">{category}</span>
        <span className="ml-auto text-[11px] text-mfo-text-dim">
          {items.length} {items.length === 1 ? 'file' : 'files'}
        </span>
      </div>
      {mode === 'preview' ? (
        <div className="flex flex-col gap-0.5">
          {(items.showAll ? items : items.slice(0, 3)).map((f) => (
            <p key={f.name} className="truncate text-[11px] text-mfo-text-dim">{f.name}</p>
          ))}
          {!items.showAll && items.length > 3 && (
            <p className="text-[11px] text-mfo-text-dim">+{items.length - 3} more</p>
          )}
        </div>
      ) : (
        <p className="text-[11px] text-mfo-text-dim">{items.length} file{items.length !== 1 ? 's' : ''} moved</p>
      )}
    </div>
  );
}

function OrganizeSubView({ onNavigate }) {
  const [currentFolder, setCurrentFolder] = useState(null);
  const [previewFiles, setPreviewFiles] = useState([]);
  const [search, setSearch] = useState('');
  const [phase, setPhase] = useState('empty'); // empty | preview | results
  const [organizing, setOrganizing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastMoves, setLastMoves] = useState([]);
  const [movedFiles, setMovedFiles] = useState([]);
  const progressTimer = useRef(null);

  const loadPreview = async (folder) => {
    const files = await window.api.preview(folder);
    if (!files.length) { showToast('No sortable files found!'); return; }
    setPreviewFiles(files);
    setSearch('');
    setPhase('preview');
  };

  const handleSetFolder = (folder) => {
    setCurrentFolder(folder);
    loadPreview(folder);
  };

  const reset = () => {
    setCurrentFolder(null);
    setLastMoves([]);
    setPreviewFiles([]);
    setPhase('empty');
  };

  const handleOrganize = async () => {
    if (!currentFolder) return;
    setOrganizing(true);
    setProgress(0);
    progressTimer.current = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 15, 90));
    }, 200);

    const result = await window.api.organize(currentFolder);
    clearInterval(progressTimer.current);
    setProgress(100);
    setTimeout(() => setOrganizing(false), 600);

    setLastMoves(result.moved);
    setMovedFiles(result.moved);
    setPhase('results');
    if (result.errors?.length) showToast(`${result.errors.length} error(s)`);
  };

  const handleUndo = async () => {
    if (!lastMoves.length) { showToast('Nothing to undo'); return; }
    const r = await window.api.undo(lastMoves);
    setLastMoves([]);
    showToast(`Restored ${r.restored.length} file(s)`);
    reset();
  };

  const filteredFiles = search
    ? previewFiles.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))
    : previewFiles;
  const previewGroups = groupByCategory(filteredFiles);
  if (search) Object.values(previewGroups).forEach((g) => { g.showAll = true; });
  const resultGroups = groupByCategory(movedFiles);

  return (
    <div className="flex flex-col gap-3">
      <Card className="p-3.5">
        <FolderPicker value={currentFolder} onPick={handleSetFolder} />
        <Button onClick={handleOrganize} disabled={!currentFolder} className="mt-3">
          <Zap size={14} />Organize all
        </Button>
      </Card>

      {phase === 'empty' && (
        <Card className="flex flex-col items-center gap-2 px-6 py-14 text-center">
          <button onClick={() => window.api.pickFolder().then((f) => f && handleSetFolder(f))}>
            <FolderOpen size={32} className="text-mfo-text-dim" />
          </button>
          <p className="text-sm font-medium text-mfo-text">Select a folder to get started</p>
          <p className="text-xs text-mfo-text-dim">Choose any folder and MFO will preview what will be organized.</p>
        </Card>
      )}

      {phase === 'preview' && (
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-mfo-border px-3.5 py-2.5">
            <Search size={13} className="text-mfo-text-dim" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search files in preview..."
              className="flex-1 bg-transparent text-[12.5px] text-mfo-text outline-none placeholder:text-mfo-text-dim"
            />
            <span className="shrink-0 text-[11px] text-mfo-text-dim">
              {search ? `${filteredFiles.length} of ${previewFiles.length} files` : `${previewFiles.length} files`}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 p-3.5">
            {Object.keys(previewGroups).length === 0 ? (
              <p className="col-span-2 py-4 text-center text-[12px] text-mfo-text-dim">No files match "{search}"</p>
            ) : (
              Object.entries(previewGroups).map(([cat, items]) => (
                <CategoryCard key={cat} category={cat} items={items} mode="preview" />
              ))
            )}
          </div>

          {organizing && (
            <div className="px-3.5 pb-3">
              <div className="h-1.5 overflow-hidden rounded-full bg-mfo-surface2">
                <motion.div
                  className="h-full rounded-full bg-mfo-green"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-2 border-t border-mfo-border p-3.5">
            <Button onClick={handleOrganize} disabled={organizing}><Zap size={14} />Organize now</Button>
            <Button variant="outline" onClick={reset}>Cancel</Button>
          </div>
        </Card>
      )}

      {phase === 'results' && (
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-mfo-border px-3.5 py-2.5">
            <CheckCircle2 size={15} className="text-mfo-green" />
            <span className="text-[13px] font-medium text-mfo-text">Done!</span>
            <span className="ml-auto text-[11px] text-mfo-text-dim">{movedFiles.length} moved</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 p-3.5">
            {Object.entries(resultGroups).map(([cat, items]) => (
              <CategoryCard key={cat} category={cat} items={items} mode="results" />
            ))}
          </div>
          <div className="flex gap-2 border-t border-mfo-border p-3.5">
            <Button variant="outline" onClick={handleUndo}><Undo2 size={14} />Undo</Button>
            <Button variant="outline" onClick={() => onNavigate('activity')}><Activity size={14} />View history</Button>
            <Button variant="primary" onClick={reset}>Organize another</Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function ScheduleSubView() {
  const [folder, setFolder] = useState(null);
  const [days, setDays] = useState([]);
  const [time, setTime] = useState('09:00');
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    window.api.getSettings().then((settings) => {
      const s = settings.schedule || {};
      setFolder(s.folder || null);
      setDays(s.days || []);
      setTime(s.time || '09:00');
    });
  }, []);

  const pickFolder = () => window.api.pickFolder().then(async (f) => {
    if (!f) return;
    setFolder(f);
    const settings = await window.api.getSettings();
    settings.schedule = { ...settings.schedule, folder: f };
    window.api.saveSettings(settings);
  });

  const toggleDay = (day) => setDays((d) => (d.includes(day) ? d.filter((x) => x !== day) : [...d, day]));

  const enable = async () => {
    if (!days.length) { showToast('Select at least one day!'); return; }
    if (!folder) { showToast('Select a folder first!'); return; }
    const settings = await window.api.getSettings();
    settings.schedule = { ...settings.schedule, enabled: true, days, time, folder };
    await window.api.saveSettings(settings);
    const result = await window.api.schedule({ days, time, folder });
    setMsg(result.ok
      ? { ok: true, text: `Scheduled, ${days.join(', ')} at ${time}` }
      : { ok: false, text: 'Failed, try running as Administrator' });
  };

  const disable = async () => {
    await window.api.unschedule();
    const settings = await window.api.getSettings();
    settings.schedule = { ...settings.schedule, enabled: false };
    window.api.saveSettings(settings);
    setMsg({ ok: true, text: 'Auto-run disabled' });
  };

  return (
    <Card className="p-3.5">
      <div className="mb-1 flex items-center gap-2">
        <Calendar size={15} className="text-mfo-green" />
        <span className="text-[13px] font-medium text-mfo-text">Auto-schedule</span>
      </div>
      <p className="mb-3 text-[11.5px] text-mfo-text-dim">Organize this folder automatically on selected days and time.</p>

      <div className="flex items-center gap-1.5 rounded-lg border border-mfo-border px-2 py-1.5">
        <input
          readOnly
          value={folder || ''}
          placeholder="Select folder to auto-organize..."
          className="min-w-0 flex-1 bg-transparent px-1 text-[13px] text-mfo-text outline-none placeholder:text-mfo-text-dim"
        />
        <button
          onClick={pickFolder}
          className="flex items-center gap-1 rounded-md border border-mfo-border px-2 py-1 text-xs text-mfo-text-dim hover:bg-mfo-surface2 hover:text-mfo-text"
        >
          <FolderOpen size={13} />Browse
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
        <Button onClick={enable}><CalendarCheck size={14} />Enable</Button>
        <Button variant="outline" onClick={disable}><CalendarX size={14} />Disable</Button>
      </div>

      {msg && (
        <p className={`mt-2.5 text-[12px] ${msg.ok ? 'text-mfo-green' : 'text-mfo-danger'}`}>
          {msg.ok ? '✓' : '✗'} {msg.text}
        </p>
      )}
    </Card>
  );
}

function BatchSubView() {
  const [folders, setFolders] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [overallStatus, setOverallStatus] = useState('');
  const [running, setRunning] = useState(false);

  const addFolder = (folder) => {
    if (folders.includes(folder)) { showToast('Folder already in list'); return; }
    setFolders((f) => [...f, folder]);
  };

  const pickFolder = () => window.api.pickFolder().then((f) => f && addFolder(f));
  const addDownloads = () => window.api.getDownloads().then((f) => f && addFolder(f));
  const removeFolder = (idx) => setFolders((f) => f.filter((_, i) => i !== idx));

  const organizeBatch = async () => {
    if (!folders.length) { showToast('No folders added'); return; }
    setRunning(true);
    let total = 0;
    for (let i = 0; i < folders.length; i++) {
      setOverallStatus(`Organizing ${i + 1}/${folders.length}...`);
      setStatuses((s) => ({ ...s, [i]: { type: 'active', text: '...' } }));
      try {
        const result = await window.api.organize(folders[i]);
        const moved = result.moved?.length || 0;
        total += moved;
        setStatuses((s) => ({ ...s, [i]: { type: 'done', text: `✓ ${moved} moved` } }));
      } catch {
        setStatuses((s) => ({ ...s, [i]: { type: 'error', text: '✗ error' } }));
      }
    }
    setOverallStatus(`✓ Done! ${total} files organized`);
    showToast(`✓ ${total} files organized`);
    setRunning(false);
    setFolders([]);
    setStatuses({});
  };

  return (
    <Card className="p-3.5">
      <div className="mb-2.5 flex items-center gap-2">
        <button
          onClick={pickFolder}
          className="flex items-center gap-1.5 rounded-md border border-mfo-border px-2.5 py-1.5 text-xs text-mfo-text-dim hover:bg-mfo-surface2 hover:text-mfo-text"
        >
          <FolderPlus size={14} />Add folder
        </button>
        <button
          onClick={addDownloads}
          className="flex items-center gap-1.5 rounded-md border border-mfo-border px-2.5 py-1.5 text-xs text-mfo-text-dim hover:bg-mfo-surface2 hover:text-mfo-text"
        >
          <Download size={14} />Downloads
        </button>
      </div>

      <BatchFolderList folders={folders} statuses={statuses} onRemove={removeFolder} />

      <div className="mt-3 flex items-center gap-3">
        <Button onClick={organizeBatch} disabled={running}><Zap size={14} />Organize all</Button>
        {overallStatus && <span className="text-[12px] text-mfo-text-dim">{overallStatus}</span>}
      </div>
    </Card>
  );
}

export default function Organize({ onNavigate }) {
  const [subView, setSubView] = useState('organize');

  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl
        layoutId="organize-subview"
        value={subView}
        onChange={setSubView}
        options={[
          { value: 'organize', label: 'Organize', icon: FolderOpen },
          { value: 'schedule', label: 'Schedule', icon: Calendar },
          { value: 'batch', label: 'Batch', icon: Layers }
        ]}
      />
      {subView === 'organize' && <OrganizeSubView onNavigate={onNavigate} />}
      {subView === 'schedule' && <ScheduleSubView />}
      {subView === 'batch' && <BatchSubView />}
    </div>
  );
}

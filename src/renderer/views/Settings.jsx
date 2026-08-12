import { useEffect, useState } from 'react';
import {
  Archive, Bell, Code, Database, Download, FileText, Folder, FolderOpen,
  Image, Info, Layers, Music, Package, Palette, Pencil, Plus, RefreshCw, ShieldOff,
  SlidersHorizontal, Trash2, Type, Upload, Video, X
} from 'lucide-react';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import { showToast } from '../lib/toast.js';
import { confirm } from '../lib/confirm.js';
import { applyTheme, applyAccent } from '../lib/theme.js';

const NAV_SECTIONS = [
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'general', label: 'General', icon: SlidersHorizontal },
  { id: 'categories', label: 'Categories', icon: Layers },
  { id: 'rename', label: 'Rename', icon: Pencil },
  { id: 'ignore', label: 'Ignore list', icon: ShieldOff },
  { id: 'data', label: 'Backup', icon: Database },
  { id: 'notiflog', label: 'Notifications', icon: Bell },
  { id: 'about', label: 'About', icon: Info }
];

const ACCENT_PRESETS = ['#3ddb3d', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const CATEGORY_ICONS = {
  Images: Image, Videos: Video, Audio: Music, Documents: FileText,
  Archives: Archive, Code, Installers: Package, Fonts: Type, Torrents: Download
};
const getCatIcon = (name) => CATEGORY_ICONS[name] || Folder;

const RENAME_RULES = [
  { key: 'datePrefix', label: 'Add date prefix', example: 'photo.jpg -> 2026-06-24_photo.jpg' },
  { key: 'dateSuffix', label: 'Add date suffix', example: 'photo.jpg -> photo_2026-06-24.jpg' },
  { key: 'spacesToUnderscores', label: 'Replace spaces with underscores', example: 'my file.jpg -> my_file.jpg' },
  { key: 'lowercaseAll', label: 'Lowercase all', example: 'MyFile.JPG -> myfile.jpg' },
  { key: 'removeSpecialChars', label: 'Remove special characters', example: 'my@file!.jpg -> myfile.jpg' }
];

function applyRenamePreview(filename, rules) {
  const dot = filename.lastIndexOf('.');
  let base = dot > 0 ? filename.slice(0, dot) : filename;
  const ext = dot > 0 ? filename.slice(dot) : '';
  const today = new Date().toISOString().slice(0, 10);
  if (rules.datePrefix) base = `${today}_${base}`;
  if (rules.dateSuffix) base = `${base}_${today}`;
  if (rules.spacesToUnderscores) base = base.replace(/ /g, '_');
  if (rules.lowercaseAll) base = base.toLowerCase();
  if (rules.removeSpecialChars) base = base.replace(/[^\w\-Ͱ-Ͽἀ-῿]/g, '');
  return base + ext;
}

function SectionCard({ title, children }) {
  return (
    <Card className="p-4">
      <p className="mb-3 text-[13px] font-medium text-mfo-text">{title}</p>
      {children}
    </Card>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex cursor-pointer items-center justify-between py-1.5">
      <span className="text-[12.5px] text-mfo-text">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? 'bg-mfo-green' : 'bg-mfo-surface2'}`}
      >
        <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
    </label>
  );
}

function AppearanceSection() {
  const [theme, setThemeState] = useState('dark');
  const [accentColor, setAccentColorState] = useState('#3ddb3d');

  useEffect(() => {
    window.api.getSettings().then((s) => {
      setThemeState(s.theme || 'dark');
      setAccentColorState(s.accentColor || '#3ddb3d');
    });
  }, []);

  const setTheme = (t) => {
    setThemeState(t);
    applyTheme(t);
    window.api.getSettings().then((s) => { s.theme = t; window.api.saveSettings(s); });
  };

  const setAccentColor = (color) => {
    setAccentColorState(color);
    applyAccent(color);
    window.api.getSettings().then((s) => { s.accentColor = color; window.api.saveSettings(s); });
  };

  return (
    <div className="flex flex-col gap-3">
      <SectionCard title="Theme">
        <div className="flex gap-2">
          {['dark', 'light'].map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`rounded-lg border px-4 py-2 text-xs font-medium capitalize transition-colors ${
                theme === t ? 'border-mfo-green bg-mfo-green/10 text-mfo-green' : 'border-mfo-border text-mfo-text-dim hover:text-mfo-text'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Accent color">
        <div className="flex flex-wrap items-center gap-2">
          {ACCENT_PRESETS.map((c) => (
            <button
              key={c}
              onClick={() => setAccentColor(c)}
              style={{ background: c }}
              className={`h-7 w-7 rounded-full transition-transform hover:scale-110 ${accentColor === c ? 'ring-2 ring-mfo-text ring-offset-2 ring-offset-mfo-bg' : ''}`}
              aria-label={c}
            />
          ))}
          <input
            type="color"
            value={accentColor}
            onChange={(e) => setAccentColor(e.target.value)}
            className="h-7 w-9 cursor-pointer rounded border border-mfo-border bg-transparent"
          />
        </div>
      </SectionCard>
    </div>
  );
}

function GeneralSection() {
  const [settings, setSettings] = useState(null);

  const load = () => window.api.getSettings().then(setSettings);
  useEffect(() => { load(); }, []);

  const update = (patch) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    window.api.saveSettings(next);
  };

  const pickDefaultFolder = () => window.api.pickFolder().then((f) => f && update({ defaultFolder: f }));

  const toggleContextMenu = async () => {
    const enabled = !settings.contextMenuEnabled;
    const result = enabled ? await window.api.registerContextMenu() : await window.api.unregisterContextMenu();
    if (result.ok) { update({ contextMenuEnabled: enabled }); showToast(`Context menu ${enabled ? 'enabled' : 'disabled'}`); }
    else showToast('Could not update the context menu');
  };

  if (!settings) return null;
  const sizeFilter = settings.sizeFilter || { minKB: 0, maxKB: 0 };
  const toDisplay = (kb) => (kb && kb % 1024 === 0 ? { value: kb / 1024, unit: 'MB' } : { value: kb || 0, unit: 'KB' });
  const min = toDisplay(sizeFilter.minKB);
  const max = toDisplay(sizeFilter.maxKB);

  const saveSizeFilter = (part, value, unit) => {
    const kb = unit === 'MB' ? value * 1024 : value;
    const next = { ...sizeFilter, [part === 'min' ? 'minKB' : 'maxKB']: kb };
    update({ sizeFilter: next });
  };

  return (
    <div className="flex flex-col gap-3">
      <SectionCard title="Default folder">
        <div className="flex items-center gap-1.5 rounded-lg border border-mfo-border px-2 py-1.5">
          <input readOnly value={settings.defaultFolder || ''} placeholder="No default folder set" className="min-w-0 flex-1 bg-transparent px-1 text-[13px] text-mfo-text outline-none placeholder:text-mfo-text-dim" />
          <button onClick={pickDefaultFolder} className="flex items-center gap-1 rounded-md border border-mfo-border px-2 py-1 text-xs text-mfo-text-dim hover:bg-mfo-surface2 hover:text-mfo-text"><FolderOpen size={13} />Browse</button>
          {settings.defaultFolder && (
            <button onClick={() => update({ defaultFolder: '' })} className="rounded-md border border-mfo-border p-1.5 text-mfo-text-dim hover:text-mfo-danger"><X size={13} /></button>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Behavior">
        <Toggle checked={!!settings.startWithWindows} onChange={(v) => update({ startWithWindows: v })} label="Start with Windows" />
        <Toggle checked={!!settings.minimizeToTray} onChange={(v) => update({ minimizeToTray: v })} label="Minimize to tray" />
        <Toggle checked={!!settings.contextMenuEnabled} onChange={toggleContextMenu} label="Add Explorer context menu" />
      </SectionCard>

      <SectionCard title="Size filter">
        <p className="mb-2 text-[11px] text-mfo-text-dim">Skip files outside this size range. Leave at 0 to disable a bound.</p>
        <div className="flex items-center gap-2">
          <span className="w-10 text-[11.5px] text-mfo-text-dim">Min</span>
          <input type="number" min={0} value={min.value} onChange={(e) => saveSizeFilter('min', Number(e.target.value), min.unit)} className="w-20 rounded-md border border-mfo-border bg-transparent px-2 py-1 text-[12px] text-mfo-text outline-none" />
          <select value={min.unit} onChange={(e) => saveSizeFilter('min', min.value, e.target.value)} className="rounded-md border border-mfo-border bg-transparent px-2 py-1 text-[12px] text-mfo-text outline-none">
            <option value="KB">KB</option><option value="MB">MB</option>
          </select>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="w-10 text-[11.5px] text-mfo-text-dim">Max</span>
          <input type="number" min={0} value={max.value} onChange={(e) => saveSizeFilter('max', Number(e.target.value), max.unit)} className="w-20 rounded-md border border-mfo-border bg-transparent px-2 py-1 text-[12px] text-mfo-text outline-none" />
          <select value={max.unit} onChange={(e) => saveSizeFilter('max', max.value, e.target.value)} className="rounded-md border border-mfo-border bg-transparent px-2 py-1 text-[12px] text-mfo-text outline-none">
            <option value="KB">KB</option><option value="MB">MB</option>
          </select>
        </div>
      </SectionCard>
    </div>
  );
}

function CategoriesSection() {
  const [categories, setCategories] = useState([]);
  const [newName, setNewName] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [extInput, setExtInput] = useState('');

  const load = () => window.api.getCategories().then(setCategories);
  useEffect(() => { load(); }, []);

  const persist = (next) => { setCategories(next); window.api.saveCategories(next); };

  const toggleCat = (id) => persist(categories.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c)));

  const deleteCat = async (cat) => {
    const ok = await confirm(`Delete "${cat.name}"?`, { confirmLabel: 'Delete' });
    if (!ok) return;
    persist(categories.filter((c) => c.id !== cat.id));
  };

  const addCategory = () => {
    const name = newName.trim();
    if (!name) return;
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) { showToast('Already exists!'); return; }
    persist([...categories, { id: name.toLowerCase().replace(/\s+/g, '-'), name, icon: 'folder', enabled: true, extensions: [] }]);
    setNewName('');
    showToast(`"${name}" created`);
  };

  const addExt = (cat) => {
    let ext = extInput.trim().toLowerCase();
    if (!ext) return;
    if (!ext.startsWith('.')) ext = `.${ext}`;
    if (cat.extensions.includes(ext)) { showToast('Already exists!'); return; }
    persist(categories.map((c) => (c.id === cat.id ? { ...c, extensions: [...c.extensions, ext] } : c)));
    setExtInput('');
  };

  const removeExt = (cat, ext) => persist(categories.map((c) => (c.id === cat.id ? { ...c, extensions: c.extensions.filter((e) => e !== ext) } : c)));

  const resetCategories = async () => {
    const ok = await confirm('Reset to default categories?', { confirmLabel: 'Reset' });
    if (!ok) return;
    const next = await window.api.resetCategories();
    setCategories(next);
    showToast('Reset to defaults');
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[11.5px] text-mfo-text-dim">{categories.length} categories</span>
        <Button variant="outline" onClick={resetCategories} className="px-2.5 py-1 text-[11px]"><RefreshCw size={12} />Reset</Button>
      </div>

      <div className="flex flex-col gap-2">
        {categories.map((cat) => {
          const Icon = getCatIcon(cat.name);
          const isOpen = expanded === cat.id;
          return (
            <Card key={cat.id} className="overflow-hidden" hover={false}>
              <div className="flex items-center gap-3 p-3">
                <button onClick={() => toggleCat(cat.id)} className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${cat.enabled ? 'bg-mfo-green' : 'bg-mfo-surface2'}`}>
                  <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${cat.enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
                <Icon size={15} className="shrink-0 text-mfo-text-dim" />
                <button onClick={() => setExpanded(isOpen ? null : cat.id)} className="min-w-0 flex-1 text-left text-[12.5px] text-mfo-text">{cat.name}</button>
                <span className="shrink-0 text-[11px] text-mfo-text-dim">{cat.extensions.length} ext</span>
                <button onClick={() => deleteCat(cat)} className="shrink-0 text-mfo-text-dim hover:text-mfo-danger"><Trash2 size={14} /></button>
              </div>
              {isOpen && (
                <div className="border-t border-mfo-border p-3">
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {cat.extensions.map((ext) => (
                      <span key={ext} className="flex items-center gap-1 rounded-full border border-mfo-border px-2 py-0.5 text-[11px] text-mfo-text">
                        {ext}
                        <button onClick={() => removeExt(cat, ext)} className="text-mfo-text-dim hover:text-mfo-danger"><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={extInput}
                      onChange={(e) => setExtInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addExt(cat)}
                      placeholder=".ext"
                      className="w-24 rounded-md border border-mfo-border bg-transparent px-2 py-1 text-[12px] text-mfo-text outline-none"
                    />
                    <Button variant="outline" onClick={() => addExt(cat)} className="px-2.5 py-1 text-[11px]"><Plus size={12} />Add</Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <div className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addCategory()}
          placeholder="New category name..."
          className="flex-1 rounded-lg border border-mfo-border bg-transparent px-2.5 py-1.5 text-[12.5px] text-mfo-text outline-none placeholder:text-mfo-text-dim"
        />
        <Button onClick={addCategory}><Plus size={14} />Add category</Button>
      </div>
    </div>
  );
}

function RenameSection() {
  const [rules, setRules] = useState(null);

  useEffect(() => { window.api.getRenameRules().then((r) => setRules(r || {})); }, []);

  const toggle = (key) => {
    const next = { ...rules };
    if (key === 'datePrefix' && !rules.datePrefix) next.dateSuffix = false;
    if (key === 'dateSuffix' && !rules.dateSuffix) next.datePrefix = false;
    next[key] = !rules[key];
    setRules(next);
    window.api.saveRenameRules(next);
  };

  if (!rules) return null;
  const sample = 'My Photo (1).jpg';
  const preview = applyRenamePreview(sample, rules);

  return (
    <div className="flex flex-col gap-3">
      <SectionCard title="Rename rules">
        <div className="flex flex-col divide-y divide-mfo-border">
          {RENAME_RULES.map((r) => (
            <div key={r.key} onClick={() => toggle(r.key)} className="flex cursor-pointer items-center justify-between py-2.5">
              <div>
                <p className="text-[12.5px] text-mfo-text">{r.label}</p>
                <p className="text-[10.5px] text-mfo-text-dim">{r.example}</p>
              </div>
              <button className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${rules[r.key] ? 'bg-mfo-green' : 'bg-mfo-surface2'}`}>
                <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${rules[r.key] ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Live preview">
        <p className="text-[11.5px] text-mfo-text-dim">{sample}</p>
        <p className={`mt-1 text-[13px] font-medium ${preview !== sample ? 'text-mfo-green' : 'text-mfo-text-dim'}`}>{preview}</p>
      </SectionCard>
    </div>
  );
}

function ChipListEditor({ title, placeholder, items, onAdd, onRemove }) {
  const [input, setInput] = useState('');
  const handleAdd = () => { if (input.trim()) { onAdd(input.trim()); setInput(''); } };
  return (
    <SectionCard title={title}>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span key={item} className="flex items-center gap-1 rounded-full border border-mfo-border px-2 py-0.5 text-[11px] text-mfo-text">
            {item}
            <button onClick={() => onRemove(item)} className="text-mfo-text-dim hover:text-mfo-danger"><X size={10} /></button>
          </span>
        ))}
        {items.length === 0 && <p className="text-[11px] text-mfo-text-dim">None</p>}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder={placeholder}
          className="flex-1 rounded-md border border-mfo-border bg-transparent px-2.5 py-1.5 text-[12px] text-mfo-text outline-none placeholder:text-mfo-text-dim"
        />
        <Button variant="outline" onClick={handleAdd} className="px-2.5 py-1 text-[11px]"><Plus size={12} />Add</Button>
      </div>
    </SectionCard>
  );
}

function IgnoreSection() {
  const [list, setList] = useState(null);

  const load = () => window.api.getIgnoreList().then(setList);
  useEffect(() => { load(); }, []);

  const persist = (next) => { setList(next); window.api.saveIgnoreList(next); };

  const addExt = (val) => {
    let ext = val.toLowerCase();
    if (!ext.startsWith('.')) ext = `.${ext}`;
    if (list.extensions.includes(ext)) { showToast('Already exists!'); return; }
    persist({ ...list, extensions: [...list.extensions, ext] });
  };
  const addFolder = (val) => {
    if (list.folders.includes(val)) { showToast('Already exists!'); return; }
    persist({ ...list, folders: [...list.folders, val] });
  };

  const resetList = async () => {
    const ok = await confirm('Reset ignore list to defaults?', { confirmLabel: 'Reset' });
    if (!ok) return;
    const next = await window.api.resetIgnoreList();
    setList(next);
  };

  if (!list) return null;

  return (
    <div className="flex flex-col gap-3">
      <ChipListEditor
        title="Ignored extensions"
        placeholder=".dll"
        items={list.extensions}
        onAdd={addExt}
        onRemove={(ext) => persist({ ...list, extensions: list.extensions.filter((e) => e !== ext) })}
      />
      <ChipListEditor
        title="Ignored folders"
        placeholder="node_modules"
        items={list.folders}
        onAdd={addFolder}
        onRemove={(f) => persist({ ...list, folders: list.folders.filter((x) => x !== f) })}
      />
      <Button variant="outline" onClick={resetList} className="self-start px-2.5 py-1 text-[11px]"><RefreshCw size={12} />Reset to defaults</Button>
    </div>
  );
}

function BackupSection() {
  const [msg, setMsg] = useState(null);

  const handleExport = async () => {
    const r = await window.api.exportAppData();
    if (r.cancelled) return;
    setMsg(r.ok ? { ok: true, text: 'Backup saved' } : { ok: false, text: r.error });
  };

  const handleImport = async () => {
    const ok = await confirm('Importing will overwrite your current settings, categories, groups, ignore list and rules. Continue?', { confirmLabel: 'Import' });
    if (!ok) return;
    const r = await window.api.importAppData();
    if (r.cancelled) return;
    if (r.ok) {
      showToast('Settings imported');
      setTimeout(() => location.reload(), 1200);
    } else {
      setMsg({ ok: false, text: r.error });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <SectionCard title="Export settings">
        <p className="mb-2.5 text-[11.5px] text-mfo-text-dim">Save all settings, categories, groups and rules to a file.</p>
        <Button variant="outline" onClick={handleExport}><Download size={14} />Export</Button>
      </SectionCard>
      <SectionCard title="Import settings">
        <p className="mb-2.5 text-[11.5px] text-mfo-text-dim">Restore settings, categories, groups and rules from a backup file.</p>
        <Button variant="outline" onClick={handleImport}><Upload size={14} />Import</Button>
      </SectionCard>
      {msg && <p className={`text-[12px] ${msg.ok ? 'text-mfo-green' : 'text-mfo-danger'}`}>{msg.ok ? '✓' : '✗'} {msg.text}</p>}
    </div>
  );
}

function NotificationsSection() {
  const [log, setLog] = useState([]);

  const load = () => window.api.getNotificationLog().then(setLog);
  useEffect(() => { load(); }, []);

  const clear = async () => {
    await window.api.clearNotificationLog();
    setLog([]);
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-mfo-border px-3.5 py-2.5">
        <span className="text-[13px] font-medium text-mfo-text">Notifications</span>
        <Button variant="danger" onClick={clear} className="px-2.5 py-1 text-[11px]"><Trash2 size={12} />Clear all</Button>
      </div>
      {log.length === 0 ? (
        <p className="px-3.5 py-6 text-center text-[12px] text-mfo-text-dim">No notifications yet</p>
      ) : (
        <div className="flex flex-col divide-y divide-mfo-border">
          {log.map((n, i) => (
            <div key={i} className="px-3.5 py-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium text-mfo-text">{n.title}</span>
                <span className="text-[10.5px] text-mfo-text-dim">
                  {new Date(n.timestamp).toLocaleDateString()} {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {n.body && <p className="mt-0.5 text-[11px] text-mfo-text-dim">{n.body}</p>}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function AboutSection() {
  const [version, setVersion] = useState('');
  const [status, setStatus] = useState(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => { window.api.getAppVersion().then(setVersion); }, []);

  const check = async () => {
    setChecking(true);
    setStatus('Checking for updates...');
    const r = await window.api.checkForUpdates();
    setChecking(false);
    if (!r.ok) { setStatus('Update check failed'); return; }
    if (r.updateAvailable) setStatus(`Update available: v${r.latestVersion}`);
    else setStatus('You are up to date');
  };

  return (
    <div className="flex flex-col gap-3">
      <SectionCard title="Current version">
        <div className="flex items-center justify-between">
          <span className="text-[12.5px] text-mfo-text">v{version}</span>
          <Button variant="outline" onClick={check} disabled={checking} className="px-2.5 py-1 text-[11px]"><RefreshCw size={12} />Check for updates</Button>
        </div>
        {status && <p className="mt-2 text-[11.5px] text-mfo-text-dim">{status}</p>}
      </SectionCard>
      <SectionCard title="Welcome guide">
        <p className="mb-2.5 text-[11.5px] text-mfo-text-dim">Replay the onboarding tour.</p>
        <Button variant="outline" onClick={() => showToast('Onboarding tour coming soon')}>Show guide</Button>
      </SectionCard>
    </div>
  );
}

export default function Settings() {
  const [section, setSection] = useState('appearance');

  return (
    <div className="flex h-full gap-4">
      <nav className="flex w-36 shrink-0 flex-col gap-0.5">
        {NAV_SECTIONS.map((s, i) => {
          const Icon = s.icon;
          const showSeparator = i === 5;
          return (
            <div key={s.id}>
              {showSeparator && <div className="my-1.5 h-px bg-mfo-border" />}
              <button
                onClick={() => setSection(s.id)}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] transition-colors ${
                  section === s.id ? 'bg-mfo-green/10 font-medium text-mfo-green' : 'text-mfo-text-dim hover:bg-mfo-surface2 hover:text-mfo-text'
                }`}
              >
                <Icon size={14} />{s.label}
              </button>
            </div>
          );
        })}
      </nav>
      <div className="min-w-0 flex-1 overflow-y-auto pr-1">
        {section === 'appearance' && <AppearanceSection />}
        {section === 'general' && <GeneralSection />}
        {section === 'categories' && <CategoriesSection />}
        {section === 'rename' && <RenameSection />}
        {section === 'ignore' && <IgnoreSection />}
        {section === 'data' && <BackupSection />}
        {section === 'notiflog' && <NotificationsSection />}
        {section === 'about' && <AboutSection />}
      </div>
    </div>
  );
}

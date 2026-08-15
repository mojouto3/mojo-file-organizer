import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Archive, Bell, Code, Database, Download, FileText, Folder, FolderOpen,
  Image, Info, Layers, Music, Package, Palette, Pencil, Plus, RefreshCw, ShieldOff,
  SlidersHorizontal, Trash2, Type, Upload, Video, X
} from 'lucide-react';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import { showToast } from '../lib/toast.js';
import { confirm } from '../lib/confirm.js';
import { openOnboarding } from '../lib/onboarding.js';
import { applyTheme, applyAccent } from '../lib/theme.js';
import { getSettings, subscribeSettings, updateSettings } from '../lib/settingsStore.js';

const NAV_SECTIONS = [
  { id: 'appearance', labelKey: 'settings.navAppearance', icon: Palette },
  { id: 'general', labelKey: 'settings.navGeneral', icon: SlidersHorizontal },
  { id: 'categories', labelKey: 'settings.navCategories', icon: Layers },
  { id: 'rename', labelKey: 'settings.navRename', icon: Pencil },
  { id: 'ignore', labelKey: 'settings.navIgnore', icon: ShieldOff },
  { id: 'data', labelKey: 'settings.navBackup', icon: Database },
  { id: 'notiflog', labelKey: 'settings.navNotifications', icon: Bell },
  { id: 'about', labelKey: 'settings.navAbout', icon: Info }
];

const ACCENT_PRESETS = ['#3ddb3d', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const CATEGORY_ICONS = {
  Images: Image, Videos: Video, Audio: Music, Documents: FileText,
  Archives: Archive, Code, Installers: Package, Fonts: Type, Torrents: Download
};
const getCatIcon = (name) => CATEGORY_ICONS[name] || Folder;

const RENAME_RULES = [
  { key: 'datePrefix', labelKey: 'settings.renameDatePrefix', example: 'photo.jpg -> 2026-06-24_photo.jpg' },
  { key: 'dateSuffix', labelKey: 'settings.renameDateSuffix', example: 'photo.jpg -> photo_2026-06-24.jpg' },
  { key: 'spacesToUnderscores', labelKey: 'settings.renameSpacesToUnderscores', example: 'my file.jpg -> my_file.jpg' },
  { key: 'lowercaseAll', labelKey: 'settings.renameLowercaseAll', example: 'MyFile.JPG -> myfile.jpg' },
  { key: 'removeSpecialChars', labelKey: 'settings.renameRemoveSpecialChars', example: 'my@file!.jpg -> myfile.jpg' }
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
    <div onClick={() => onChange(!checked)} className="flex cursor-pointer select-none items-center justify-between py-1.5">
      <span className="text-[12.5px] text-mfo-text">{label}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? 'bg-mfo-green' : 'bg-mfo-surface2'}`}
      >
        <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}

const THEME_LABEL_KEYS = { dark: 'settings.themeDark', light: 'settings.themeLight' };

function AppearanceSection() {
  const { t } = useTranslation();
  const [theme, setThemeState] = useState('dark');
  const [accentColor, setAccentColorState] = useState('#3ddb3d');

  useEffect(() => {
    getSettings().then((s) => {
      setThemeState(s.theme || 'dark');
      setAccentColorState(s.accentColor || '#3ddb3d');
    });
  }, []);

  const setTheme = (theme) => {
    setThemeState(theme);
    applyTheme(theme);
    updateSettings({ theme });
  };

  const setAccentColor = (color) => {
    setAccentColorState(color);
    applyAccent(color);
    updateSettings({ accentColor: color });
  };

  return (
    <div className="flex flex-col gap-3">
      <SectionCard title={t('settings.theme')}>
        <div className="flex gap-2">
          {['dark', 'light'].map((themeOption) => (
            <button
              key={themeOption}
              onClick={() => setTheme(themeOption)}
              className={`rounded-lg border px-4 py-2 text-xs font-medium transition-colors ${
                theme === themeOption ? 'border-mfo-green bg-mfo-green/10 text-mfo-green' : 'border-mfo-border text-mfo-text-dim hover:text-mfo-text'
              }`}
            >
              {t(THEME_LABEL_KEYS[themeOption])}
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title={t('settings.accentColor')}>
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

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'gr', label: 'Ελληνικά' },
  { value: 'de', label: 'Deutsch' },
  { value: 'es', label: 'Español' },
  { value: 'ru', label: 'Русский' }
];

function GeneralSection() {
  const { t, i18n } = useTranslation();
  const [settings, setSettings] = useState(null);

  useEffect(() => subscribeSettings(setSettings), []);

  const update = (patch) => updateSettings(patch);

  const setLanguage = (lang) => {
    i18n.changeLanguage(lang);
    update({ language: lang });
  };

  const pickDefaultFolder = () => window.api.pickFolder().then((f) => f && update({ defaultFolder: f }));

  const toggleContextMenu = async () => {
    const enabled = !settings.contextMenuEnabled;
    const result = enabled ? await window.api.registerContextMenu() : await window.api.unregisterContextMenu();
    if (result.ok) { update({ contextMenuEnabled: enabled }); showToast(enabled ? t('settings.contextMenuEnabled') : t('settings.contextMenuDisabled')); }
    else showToast(t('settings.contextMenuUpdateFailed'));
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
      <SectionCard title={t('settings.languageTitle')}>
        <div className="flex flex-wrap gap-1.5">
          {LANGUAGES.map((l) => (
            <button
              key={l.value}
              onClick={() => setLanguage(l.value)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                i18n.language === l.value ? 'border-mfo-green bg-mfo-green/10 text-mfo-green' : 'border-mfo-border text-mfo-text-dim hover:text-mfo-text'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title={t('settings.defaultFolder')}>
        <div className="flex items-center gap-1.5 rounded-lg border border-mfo-border px-2 py-1.5">
          <input readOnly value={settings.defaultFolder || ''} placeholder={t('settings.noDefaultFolderSet')} className="min-w-0 flex-1 bg-transparent px-1 text-[13px] text-mfo-text outline-none placeholder:text-mfo-text-dim" />
          <button onClick={pickDefaultFolder} className="flex items-center gap-1 rounded-md border border-mfo-border px-2 py-1 text-xs text-mfo-text-dim hover:bg-mfo-surface2 hover:text-mfo-text"><FolderOpen size={13} />{t('common.browse')}</button>
          {settings.defaultFolder && (
            <button onClick={() => update({ defaultFolder: '' })} className="rounded-md border border-mfo-border p-1.5 text-mfo-text-dim hover:text-mfo-danger"><X size={13} /></button>
          )}
        </div>
      </SectionCard>

      <SectionCard title={t('settings.behavior')}>
        <Toggle checked={!!settings.startWithWindows} onChange={(v) => update({ startWithWindows: v })} label={t('settings.startWithWindows')} />
        <Toggle checked={!!settings.minimizeToTray} onChange={(v) => update({ minimizeToTray: v })} label={t('settings.minimizeToTray')} />
        <Toggle checked={!!settings.contextMenuEnabled} onChange={toggleContextMenu} label={t('settings.addExplorerContextMenu')} />
      </SectionCard>

      <SectionCard title={t('settings.sizeFilter')}>
        <p className="mb-2 text-[11px] text-mfo-text-dim">{t('settings.sizeFilterDesc')}</p>
        <div className="flex items-center gap-2">
          <span className="w-10 text-[11.5px] text-mfo-text-dim">{t('settings.min')}</span>
          <input type="number" min={0} value={min.value} onChange={(e) => saveSizeFilter('min', Number(e.target.value), min.unit)} className="w-20 rounded-md border border-mfo-border bg-transparent px-2 py-1 text-[12px] text-mfo-text outline-none" />
          <select value={min.unit} onChange={(e) => saveSizeFilter('min', min.value, e.target.value)} className="rounded-md border border-mfo-border bg-mfo-surface2 px-2 py-1 text-[12px] text-mfo-text outline-none">
            <option value="KB">KB</option><option value="MB">MB</option>
          </select>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="w-10 text-[11.5px] text-mfo-text-dim">{t('settings.max')}</span>
          <input type="number" min={0} value={max.value} onChange={(e) => saveSizeFilter('max', Number(e.target.value), max.unit)} className="w-20 rounded-md border border-mfo-border bg-transparent px-2 py-1 text-[12px] text-mfo-text outline-none" />
          <select value={max.unit} onChange={(e) => saveSizeFilter('max', max.value, e.target.value)} className="rounded-md border border-mfo-border bg-mfo-surface2 px-2 py-1 text-[12px] text-mfo-text outline-none">
            <option value="KB">KB</option><option value="MB">MB</option>
          </select>
        </div>
      </SectionCard>
    </div>
  );
}

function CategoriesSection() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [newName, setNewName] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [extInput, setExtInput] = useState('');

  const load = () => window.api.getCategories().then(setCategories);
  useEffect(() => { load(); }, []);

  const persist = (next) => { setCategories(next); window.api.saveCategories(next); };

  const toggleCat = (id) => persist(categories.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c)));

  const deleteCat = async (cat) => {
    const ok = await confirm(t('settings.deleteCategoryConfirm', { name: cat.name }), { confirmLabel: t('common.delete') });
    if (!ok) return;
    persist(categories.filter((c) => c.id !== cat.id));
  };

  const addCategory = () => {
    const name = newName.trim();
    if (!name) return;
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) { showToast(t('smartGroup.alreadyExists')); return; }
    persist([...categories, { id: name.toLowerCase().replace(/\s+/g, '-'), name, icon: 'folder', enabled: true, extensions: [] }]);
    setNewName('');
    showToast(t('settings.categoryCreated', { name }));
  };

  const addExt = (cat) => {
    let ext = extInput.trim().toLowerCase();
    if (!ext) return;
    if (!ext.startsWith('.')) ext = `.${ext}`;
    if (cat.extensions.includes(ext)) { showToast(t('smartGroup.alreadyExists')); return; }
    persist(categories.map((c) => (c.id === cat.id ? { ...c, extensions: [...c.extensions, ext] } : c)));
    setExtInput('');
  };

  const removeExt = (cat, ext) => persist(categories.map((c) => (c.id === cat.id ? { ...c, extensions: c.extensions.filter((e) => e !== ext) } : c)));

  const resetCategories = async () => {
    const ok = await confirm(t('settings.resetCategoriesConfirm'), { confirmLabel: t('common.reset') });
    if (!ok) return;
    const next = await window.api.resetCategories();
    setCategories(next);
    showToast(t('settings.resetToDefaults'));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[11.5px] text-mfo-text-dim">{t('settings.category', { count: categories.length })}</span>
        <Button variant="outline" onClick={resetCategories} className="px-2.5 py-1 text-[11px]"><RefreshCw size={12} />{t('common.reset')}</Button>
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
                <span className="shrink-0 text-[11px] text-mfo-text-dim">{t('settings.extCount', { count: cat.extensions.length })}</span>
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
                    <Button variant="outline" onClick={() => addExt(cat)} className="px-2.5 py-1 text-[11px]"><Plus size={12} />{t('common.add')}</Button>
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
          placeholder={t('settings.newCategoryPlaceholder')}
          className="flex-1 rounded-lg border border-mfo-border bg-transparent px-2.5 py-1.5 text-[12.5px] text-mfo-text outline-none placeholder:text-mfo-text-dim"
        />
        <Button onClick={addCategory}><Plus size={14} />{t('settings.addCategory')}</Button>
      </div>
    </div>
  );
}

function RenameSection() {
  const { t } = useTranslation();
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
      <SectionCard title={t('settings.renameRules')}>
        <div className="flex flex-col divide-y divide-mfo-border">
          {RENAME_RULES.map((r) => (
            <div key={r.key} onClick={() => toggle(r.key)} className="flex cursor-pointer items-center justify-between py-2.5">
              <div>
                <p className="text-[12.5px] text-mfo-text">{t(r.labelKey)}</p>
                <p className="text-[10.5px] text-mfo-text-dim">{r.example}</p>
              </div>
              <button className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${rules[r.key] ? 'bg-mfo-green' : 'bg-mfo-surface2'}`}>
                <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${rules[r.key] ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title={t('settings.livePreview')}>
        <p className="text-[11.5px] text-mfo-text-dim">{sample}</p>
        <p className={`mt-1 text-[13px] font-medium ${preview !== sample ? 'text-mfo-green' : 'text-mfo-text-dim'}`}>{preview}</p>
      </SectionCard>
    </div>
  );
}

function ChipListEditor({ title, placeholder, items, onAdd, onRemove }) {
  const { t } = useTranslation();
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
        {items.length === 0 && <p className="text-[11px] text-mfo-text-dim">{t('settings.none')}</p>}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder={placeholder}
          className="flex-1 rounded-md border border-mfo-border bg-transparent px-2.5 py-1.5 text-[12px] text-mfo-text outline-none placeholder:text-mfo-text-dim"
        />
        <Button variant="outline" onClick={handleAdd} className="px-2.5 py-1 text-[11px]"><Plus size={12} />{t('common.add')}</Button>
      </div>
    </SectionCard>
  );
}

function IgnoreSection() {
  const { t } = useTranslation();
  const [list, setList] = useState(null);

  const load = () => window.api.getIgnoreList().then(setList);
  useEffect(() => { load(); }, []);

  const persist = (next) => { setList(next); window.api.saveIgnoreList(next); };

  const addExt = (val) => {
    let ext = val.toLowerCase();
    if (!ext.startsWith('.')) ext = `.${ext}`;
    if (list.extensions.includes(ext)) { showToast(t('smartGroup.alreadyExists')); return; }
    persist({ ...list, extensions: [...list.extensions, ext] });
  };
  const addFolder = (val) => {
    if (list.folders.includes(val)) { showToast(t('smartGroup.alreadyExists')); return; }
    persist({ ...list, folders: [...list.folders, val] });
  };

  const resetList = async () => {
    const ok = await confirm(t('settings.resetIgnoreConfirm'), { confirmLabel: t('common.reset') });
    if (!ok) return;
    const next = await window.api.resetIgnoreList();
    setList(next);
  };

  if (!list) return null;

  return (
    <div className="flex flex-col gap-3">
      <ChipListEditor
        title={t('settings.ignoredExtensions')}
        placeholder=".dll"
        items={list.extensions}
        onAdd={addExt}
        onRemove={(ext) => persist({ ...list, extensions: list.extensions.filter((e) => e !== ext) })}
      />
      <ChipListEditor
        title={t('settings.ignoredFolders')}
        placeholder="node_modules"
        items={list.folders}
        onAdd={addFolder}
        onRemove={(f) => persist({ ...list, folders: list.folders.filter((x) => x !== f) })}
      />
      <Button variant="outline" onClick={resetList} className="self-start px-2.5 py-1 text-[11px]"><RefreshCw size={12} />{t('settings.resetToDefaults')}</Button>
    </div>
  );
}

function BackupSection() {
  const { t } = useTranslation();
  const [msg, setMsg] = useState(null);

  const handleExport = async () => {
    const r = await window.api.exportAppData();
    if (r.cancelled) return;
    setMsg(r.ok ? { ok: true, text: t('settings.backupSaved') } : { ok: false, text: r.error });
  };

  const handleImport = async () => {
    const ok = await confirm(t('settings.importOverwriteConfirm'), { confirmLabel: t('common.import') });
    if (!ok) return;
    const r = await window.api.importAppData();
    if (r.cancelled) return;
    if (r.ok) {
      showToast(t('settings.settingsImported'));
      setTimeout(() => location.reload(), 1200);
    } else {
      setMsg({ ok: false, text: r.error });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <SectionCard title={t('settings.exportSettings')}>
        <p className="mb-2.5 text-[11.5px] text-mfo-text-dim">{t('settings.exportSettingsDesc')}</p>
        <Button variant="outline" onClick={handleExport}><Download size={14} />{t('common.export')}</Button>
      </SectionCard>
      <SectionCard title={t('settings.importSettings')}>
        <p className="mb-2.5 text-[11.5px] text-mfo-text-dim">{t('settings.importSettingsDesc')}</p>
        <Button variant="outline" onClick={handleImport}><Upload size={14} />{t('common.import')}</Button>
      </SectionCard>
      {msg && <p className={`text-[12px] ${msg.ok ? 'text-mfo-green' : 'text-mfo-danger'}`}>{msg.ok ? '✓' : '✗'} {msg.text}</p>}
    </div>
  );
}

function NotificationsSection() {
  const { t } = useTranslation();
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
        <span className="text-[13px] font-medium text-mfo-text">{t('settings.navNotifications')}</span>
        <Button variant="danger" onClick={clear} className="px-2.5 py-1 text-[11px]"><Trash2 size={12} />{t('common.clearAll')}</Button>
      </div>
      {log.length === 0 ? (
        <p className="px-3.5 py-6 text-center text-[12px] text-mfo-text-dim">{t('settings.noNotificationsYet')}</p>
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
  const { t } = useTranslation();
  const [version, setVersion] = useState('');
  const [status, setStatus] = useState(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => { window.api.getAppVersion().then(setVersion); }, []);

  const check = async () => {
    setChecking(true);
    setStatus(t('settings.checkingForUpdates'));
    const r = await window.api.checkForUpdates();
    setChecking(false);
    if (!r.ok) { setStatus(t('settings.updateCheckFailed')); return; }
    if (r.updateAvailable) setStatus(t('settings.updateAvailable', { version: r.latestVersion }));
    else setStatus(t('settings.upToDate'));
  };

  return (
    <div className="flex flex-col gap-3">
      <SectionCard title={t('settings.currentVersion')}>
        <div className="flex items-center justify-between">
          <span className="text-[12.5px] text-mfo-text">v{version}</span>
          <Button variant="outline" onClick={check} disabled={checking} className="px-2.5 py-1 text-[11px]"><RefreshCw size={12} />{t('settings.checkForUpdates')}</Button>
        </div>
        {status && <p className="mt-2 text-[11.5px] text-mfo-text-dim">{status}</p>}
      </SectionCard>
      <SectionCard title={t('settings.welcomeGuide')}>
        <p className="mb-2.5 text-[11.5px] text-mfo-text-dim">{t('settings.replayOnboarding')}</p>
        <Button variant="outline" onClick={openOnboarding}>{t('settings.showGuide')}</Button>
      </SectionCard>
    </div>
  );
}

export default function Settings() {
  const { t } = useTranslation();
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
                <Icon size={14} />{t(s.labelKey)}
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

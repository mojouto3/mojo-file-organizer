import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar, CalendarCheck, CalendarX, CheckCircle2, Clock, Copy,
  Eye, FolderOpen, FolderSearch, FolderX, Layers, Package, Search, Trash2, Undo2
} from 'lucide-react';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import SegmentedControl from '../components/SegmentedControl.jsx';
import FolderPicker from '../components/FolderPicker.jsx';
import Treemap from '../components/Treemap.jsx';
import Modal from '../components/Modal.jsx';
import Checkbox from '../components/Checkbox.jsx';
import { formatSize } from '../lib/format.js';
import { showToast } from '../lib/toast.js';
import { confirm } from '../lib/confirm.js';
import { getSettings, updateSettings } from '../lib/settingsStore.js';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const AGE_PRESETS = [3, 6, 12];

const SECTION_META = {
  installers: { labelKey: 'cleanup.sectionInstallers', icon: Package },
  junk: { labelKey: 'cleanup.sectionJunk', icon: Trash2 },
  duplicates: { labelKey: 'cleanup.sectionDuplicates', icon: Copy },
  oldFiles: { labelKey: 'cleanup.sectionOldFiles', icon: Clock },
  emptyFolders: { labelKey: 'cleanup.sectionEmptyFolders', icon: FolderX }
};

function buildSections(result) {
  return [
    { id: 'installers', size: result.installers.totalSize, files: result.installers.files },
    { id: 'junk', size: result.junk.totalSize, files: result.junk.files },
    { id: 'duplicates', size: result.duplicates.totalSize, files: result.duplicates.files },
    { id: 'oldFiles', size: result.oldFiles?.totalSize || 0, files: result.oldFiles?.files || [] },
    { id: 'emptyFolders', size: 0, files: result.emptyFolders.folders, count: result.emptyFolders.count }
  ];
}

function ScanSubView() {
  const { t } = useTranslation();
  const [folder, setFolder] = useState(null);
  const [ageMonths, setAgeMonths] = useState(6);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [totalSize, setTotalSize] = useState(0);
  const [checked, setChecked] = useState({});
  const [lastDeleted, setLastDeleted] = useState([]);
  const [previewOpen, setPreviewOpen] = useState(false);

  const scan = async () => {
    if (!folder) { showToast(t('common.selectFolderFirst')); return; }
    setScanning(true);
    const r = await window.api.scanCleanup({ folderPath: folder, oldFilesMonths: ageMonths });
    setScanning(false);
    const total = (r.installers.totalSize || 0) + (r.junk.totalSize || 0) + (r.duplicates.totalSize || 0) + (r.oldFiles?.totalSize || 0);
    setResult(r);
    setTotalSize(total);
    setChecked({ installers: true, junk: true, duplicates: true, oldFiles: true, emptyFolders: true, dupApps: true });
  };

  const sections = result ? buildSections(result) : [];
  const dupApps = result?.duplicateApps || [];
  const isEmpty = result && totalSize === 0 && result.emptyFolders.count === 0;

  const allPrimaryChecked = ['installers', 'junk', 'duplicates', 'oldFiles', 'emptyFolders'].every((id) => checked[id]);
  const toggleSelectAll = (value) => setChecked((c) => ({ ...c, installers: value, junk: value, duplicates: value, oldFiles: value, emptyFolders: value }));
  const toggleSection = (id) => setChecked((c) => ({ ...c, [id]: !c[id] }));

  const selectedSize = sections.reduce((sum, s) => (checked[s.id] ? sum + s.size : sum), 0)
    + (checked.dupApps ? dupApps.reduce((sum, g) => sum + g.delete.reduce((a, f) => a + f.size, 0), 0) : 0);

  const handlePreview = () => {
    const anySelected = sections.some((s) => checked[s.id] && s.files.length) || (checked.dupApps && dupApps.length);
    if (!anySelected) { showToast(t('cleanup.nothingSelected')); return; }
    setPreviewOpen(true);
  };

  const handleClean = async () => {
    if (!result) return;
    const dupAppsFiles = checked.dupApps ? dupApps.flatMap((g) => g.delete) : null;
    const toDelete = {
      installers: checked.installers ? result.installers.files : null,
      junk: checked.junk ? result.junk.files : null,
      duplicates: checked.duplicates ? result.duplicates.files : null,
      oldFiles: checked.oldFiles ? (result.oldFiles?.files || []) : null,
      emptyFolders: checked.emptyFolders ? result.emptyFolders.folders : null,
      dupApps: dupAppsFiles,
      folder
    };
    const count = sections.reduce((n, s) => (checked[s.id] ? n + s.files.length : n), 0) + (dupAppsFiles?.length || 0);
    const ok = await confirm(t('cleanup.confirmDelete', { count }), { confirmLabel: t('common.delete') });
    if (!ok) return;
    const cleanResult = await window.api.runCleanup(toDelete);
    setLastDeleted(cleanResult.deleted);
    showToast(cleanResult.errors?.length
      ? t('cleanup.itemsCleanedWithErrors', { deleted: cleanResult.deleted.length, errors: cleanResult.errors.length })
      : t('cleanup.itemsCleaned', { count: cleanResult.deleted.length }));
    scan();
  };

  const handleUndo = async () => {
    if (!lastDeleted.length) return;
    const r = await window.api.restoreCleanup(lastDeleted);
    setLastDeleted([]);
    showToast(t('cleanup.restoredItems', { count: r.restored.length }));
  };

  return (
    <div className="flex flex-col gap-3">
      <Card className="p-3.5">
        <div className="mb-2 flex items-center gap-2">
          <FolderSearch size={15} className="text-mfo-green" />
          <span className="text-[13px] font-medium text-mfo-text">{t('duplicates.selectFolder')}</span>
        </div>
        <FolderPicker value={folder} onPick={setFolder} />

        <div className="mt-3.5 flex items-center justify-between gap-3">
          <div>
            <p className="text-[12.5px] font-medium text-mfo-text">{t('cleanup.oldFilesThreshold')}</p>
            <p className="text-[11px] text-mfo-text-dim">{t('cleanup.findFilesNotUsedSince')}</p>
          </div>
          <div className="flex items-center gap-1.5">
            {AGE_PRESETS.map((m) => (
              <button
                key={m}
                onClick={() => setAgeMonths(m)}
                className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                  ageMonths === m ? 'border-mfo-green bg-mfo-green/10 text-mfo-green' : 'border-mfo-border text-mfo-text-dim hover:text-mfo-text'
                }`}
              >
                {m}mo
              </button>
            ))}
            <input
              type="number"
              min={1}
              value={ageMonths}
              onChange={(e) => setAgeMonths(parseInt(e.target.value, 10) || 1)}
              className="w-14 rounded-md border border-mfo-border bg-transparent px-2 py-1 text-xs text-mfo-text outline-none"
            />
          </div>
        </div>

        <Button onClick={scan} disabled={scanning} className="mt-3.5">
          <Search size={14} />{scanning ? t('cleanup.scanning') : t('cleanup.scanFolder')}
        </Button>
      </Card>

      {result && isEmpty && (
        <Card className="flex flex-col items-center gap-2 px-6 py-14 text-center">
          <CheckCircle2 size={28} className="text-mfo-green" />
          <p className="text-sm font-medium text-mfo-text">{t('cleanup.nothingToClean')}</p>
          <p className="text-xs text-mfo-text-dim">{t('cleanup.nothingToCleanHint')}</p>
        </Card>
      )}

      {result && !isEmpty && (
        <Card className="overflow-hidden p-3.5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[13px] font-medium text-mfo-text">{t('cleanup.overview')}</span>
            <span className="rounded-full bg-mfo-green/10 px-2 py-0.5 text-[10.5px] font-medium text-mfo-green">
              {t('cleanup.foundSize', { size: formatSize(totalSize) })}
            </span>
          </div>

          <Treemap sections={sections.map((s) => ({ id: s.id, label: t(SECTION_META[s.id].labelKey), size: s.size }))} totalSize={totalSize} />

          <div className="mt-3 flex items-center justify-between border-t border-mfo-border pt-3">
            <div onClick={() => toggleSelectAll(!allPrimaryChecked)} className="flex cursor-pointer select-none items-center gap-2 text-[12.5px] text-mfo-text">
              <Checkbox checked={allPrimaryChecked} onChange={toggleSelectAll} />
              {t('cleanup.selectAll')}
            </div>
            <span className="text-[11px] text-mfo-text-dim">{t('cleanup.selectedSize', { size: formatSize(selectedSize) })}</span>
          </div>

          <div className="mt-2 flex flex-col divide-y divide-mfo-border">
            {sections.map((s) => {
              const meta = SECTION_META[s.id];
              const Icon = meta.icon;
              const count = s.id === 'emptyFolders' ? s.count : s.files.length;
              if (!count) return null;
              return (
                <div
                  key={s.id}
                  id={`cleanup-section-${s.id}`}
                  onClick={() => toggleSection(s.id)}
                  className="flex cursor-pointer items-center gap-2.5 py-2.5"
                >
                  <Checkbox checked={!!checked[s.id]} onChange={() => toggleSection(s.id)} />
                  <Icon size={15} className="text-mfo-text-dim" />
                  <span className="flex-1 text-[12.5px] text-mfo-text">{t(meta.labelKey)}</span>
                  <span className="text-[11px] text-mfo-text-dim">
                    {s.id === 'emptyFolders' ? t('cleanup.folder', { count }) : t('organize.file', { count })}
                  </span>
                  <span className="w-16 text-right text-[11.5px] font-medium text-mfo-text">{formatSize(s.size)}</span>
                </div>
              );
            })}

            {dupApps.length > 0 && (
              <div id="cleanup-section-dupApps" className="py-2.5">
                <div onClick={() => toggleSection('dupApps')} className="flex cursor-pointer items-center gap-2.5">
                  <Checkbox checked={!!checked.dupApps} onChange={() => toggleSection('dupApps')} />
                  <Layers size={15} className="text-mfo-text-dim" />
                  <div className="flex-1">
                    <p className="text-[12.5px] text-mfo-text">{t('cleanup.dupAppsTitle')}</p>
                    <p className="text-[10.5px] text-mfo-text-dim">{t('cleanup.dupAppsDesc')}</p>
                  </div>
                  <span className="text-[11px] text-mfo-text-dim">{t('cleanup.app', { count: dupApps.length })}</span>
                  <span className="w-16 text-right text-[11.5px] font-medium text-mfo-text">
                    {formatSize(dupApps.reduce((s, g) => s + g.delete.reduce((a, f) => a + f.size, 0), 0))}
                  </span>
                </div>
                <div className="mt-2 flex flex-col gap-2.5 pl-6">
                  {dupApps.map((g) => (
                    <div key={g.appName} className="rounded-lg border border-mfo-border p-2.5">
                      <p className="mb-1 text-[11.5px] font-medium capitalize text-mfo-text">{g.appName}</p>
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="shrink-0 rounded bg-mfo-green/10 px-1.5 py-0.5 text-[10px] font-medium uppercase text-mfo-green">{t('duplicates.keep')}</span>
                        <span className="truncate text-mfo-text-dim">{g.keep.name}</span>
                        <span className="ml-auto shrink-0 text-mfo-text-dim">{formatSize(g.keep.size)}</span>
                      </div>
                      {g.delete.map((f) => (
                        <div key={f.path} className="mt-1 flex items-center gap-2 text-[11px]">
                          <span className="shrink-0 rounded bg-mfo-danger/10 px-1.5 py-0.5 text-[10px] font-medium uppercase text-mfo-danger">{t('common.delete')}</span>
                          <span className="truncate text-mfo-text-dim">{f.name}</span>
                          <span className="ml-auto shrink-0 text-mfo-text-dim">{formatSize(f.size)}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 flex gap-2 border-t border-mfo-border pt-3">
            <Button onClick={handleClean}><Trash2 size={14} />{t('cleanup.cleanSelected')}</Button>
            <Button variant="outline" onClick={handlePreview}><Eye size={14} />{t('common.preview')}</Button>
            {lastDeleted.length > 0 && (
              <Button variant="outline" onClick={handleUndo} className="ml-auto"><Undo2 size={14} />{t('common.undo')}</Button>
            )}
          </div>
        </Card>
      )}

      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={t('common.preview')}
        subtitle={t('cleanup.itemsWillBeDeleted', {
          count: sections.reduce((n, s) => (checked[s.id] ? n + s.files.length : n), 0) + (checked.dupApps ? dupApps.reduce((n, g) => n + g.delete.length, 0) : 0)
        })}
      >
        <div className="flex flex-col gap-4">
          {sections.filter((s) => checked[s.id] && s.files.length).map((s) => (
            <div key={s.id}>
              <p className="mb-1.5 text-[11.5px] font-medium text-mfo-text">
                {t(SECTION_META[s.id].labelKey)} <span className="text-mfo-text-dim">({s.files.length})</span>
              </p>
              <div className="flex flex-col gap-0.5">
                {s.files.map((f) => (
                  <div key={f.path} className="flex justify-between text-[11px] text-mfo-text-dim">
                    <span className="truncate">{f.name}</span>
                    <span className="shrink-0">{f.size ? formatSize(f.size) : t('cleanup.notApplicable')}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {checked.dupApps && dupApps.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11.5px] font-medium text-mfo-text">
                {t('cleanup.dupAppsTitle')} <span className="text-mfo-text-dim">({dupApps.reduce((n, g) => n + g.delete.length, 0)})</span>
              </p>
              <div className="flex flex-col gap-0.5">
                {dupApps.flatMap((g) => g.delete).map((f) => (
                  <div key={f.path} className="flex justify-between text-[11px] text-mfo-text-dim">
                    <span className="truncate">{f.name}</span>
                    <span className="shrink-0">{formatSize(f.size)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

function ScheduleSubView() {
  const { t } = useTranslation();
  const [folder, setFolder] = useState(null);
  const [days, setDays] = useState([]);
  const [time, setTime] = useState('10:00');
  const [sections, setSections] = useState({ installers: true, junk: true, oldFiles: true, emptyFolders: true });
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    getSettings().then((settings) => {
      const s = settings.cleanupSchedule || {};
      setFolder(s.folder || null);
      setDays(s.days || []);
      setTime(s.time || '10:00');
      if (s.sections) {
        setSections({
          installers: s.sections.includes('installers'),
          junk: s.sections.includes('junk'),
          oldFiles: s.sections.includes('oldFiles'),
          emptyFolders: s.sections.includes('emptyFolders')
        });
      }
    });
  }, []);

  const pickFolder = () => window.api.pickFolder().then((f) => f && setFolder(f));
  const toggleDay = (day) => setDays((d) => (d.includes(day) ? d.filter((x) => x !== day) : [...d, day]));
  const toggleSection = (id) => setSections((s) => ({ ...s, [id]: !s[id] }));

  const enable = async () => {
    if (!days.length) { showToast(t('organize.selectDayFirst')); return; }
    if (!folder) { showToast(t('common.selectFolderFirst')); return; }
    const selected = Object.keys(sections).filter((id) => sections[id]);
    if (!selected.length) { showToast(t('cleanup.selectSectionFirst')); return; }
    const settings = await getSettings();
    updateSettings({ cleanupSchedule: { ...settings.cleanupSchedule, enabled: true, days, time, folder, sections: selected } });
    const result = await window.api.scheduleCleanup({ days, time, folder, sections: selected });
    setMsg(result.ok
      ? { ok: true, text: t('organize.scheduled', { days: days.join(', '), time }) }
      : { ok: false, text: t('organize.scheduleFailed') });
  };

  const disable = async () => {
    await window.api.unscheduleCleanup();
    const settings = await getSettings();
    updateSettings({ cleanupSchedule: { ...settings.cleanupSchedule, enabled: false } });
    setMsg({ ok: true, text: t('organize.autoRunDisabled') });
  };

  return (
    <Card className="p-3.5">
      <div className="mb-1 flex items-center gap-2">
        <Calendar size={15} className="text-mfo-green" />
        <span className="text-[13px] font-medium text-mfo-text">{t('cleanup.scheduledCleanup')}</span>
      </div>
      <p className="mb-3 text-[11.5px] text-mfo-text-dim">{t('cleanup.scheduleDesc')}</p>

      <div className="flex flex-wrap gap-1.5">
        {Object.entries(SECTION_META).filter(([id]) => id !== 'duplicates').map(([id, meta]) => (
          <div key={id} onClick={() => toggleSection(id)} className="flex cursor-pointer select-none items-center gap-1.5 rounded-md border border-mfo-border px-2.5 py-1 text-xs text-mfo-text">
            <Checkbox checked={!!sections[id]} onChange={() => toggleSection(id)} />
            {t(meta.labelKey)}
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-mfo-border px-2 py-1.5">
        <input
          readOnly
          value={folder || ''}
          placeholder={t('cleanup.autoCleanPlaceholder')}
          className="min-w-0 flex-1 bg-transparent px-1 text-[13px] text-mfo-text outline-none placeholder:text-mfo-text-dim"
        />
        <button
          onClick={pickFolder}
          className="flex items-center gap-1 rounded-md border border-mfo-border px-2 py-1 text-xs text-mfo-text-dim hover:bg-mfo-surface2 hover:text-mfo-text"
        >
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

export default function Cleanup() {
  const { t } = useTranslation();
  const [subView, setSubView] = useState('scan');

  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl
        layoutId="cleanup-subview"
        value={subView}
        onChange={setSubView}
        options={[
          { value: 'scan', label: t('cleanup.tabScan'), icon: Search },
          { value: 'schedule', label: t('organize.tabSchedule'), icon: Calendar }
        ]}
      />
      {subView === 'scan' && <ScanSubView />}
      {subView === 'schedule' && <ScheduleSubView />}
    </div>
  );
}

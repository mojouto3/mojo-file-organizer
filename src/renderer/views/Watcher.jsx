import { useEffect, useState } from 'react';
import { Eye, EyeOff, Play, Square, Trash2 } from 'lucide-react';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import FolderPicker from '../components/FolderPicker.jsx';
import { getWatcherEvents, subscribeWatcherEvents, clearWatcherEvents } from '../lib/watcherStore.js';
import { showToast } from '../lib/toast.js';

export default function Watcher() {
  const [folder, setFolder] = useState(null);
  const [active, setActive] = useState(false);
  const [useRules, setUseRules] = useState(false);
  const [events, setEvents] = useState(getWatcherEvents());

  useEffect(() => {
    window.api.getWatcherStatus().then((s) => {
      setActive(!!s.active);
      if (s.folder) setFolder(s.folder);
    });
    return subscribeWatcherEvents(setEvents);
  }, []);

  const handleStart = async () => {
    if (!folder) { showToast('Select a folder first!'); return; }
    const r = await window.api.startWatcher({ folderPath: folder, useRules });
    if (r.ok) { setActive(true); showToast('Watching for new files...'); }
    else showToast(r.error || 'Failed to start watcher');
  };

  const handleStop = async () => {
    await window.api.stopWatcher();
    setActive(false);
    showToast('Watcher stopped');
  };

  return (
    <div className="flex flex-col gap-3">
      <Card className="p-3.5">
        <div className="mb-1 flex items-center gap-2">
          <Eye size={15} className="text-mfo-green" />
          <span className="text-[13px] font-medium text-mfo-text">File watcher</span>
          {active && (
            <span className="rounded-full bg-mfo-green/10 px-2 py-0.5 text-[10px] font-medium text-mfo-green">Active</span>
          )}
        </div>
        <p className="mb-3 text-[11.5px] text-mfo-text-dim">
          Monitor a folder in real-time. New files are automatically organized as soon as they arrive.
        </p>

        <FolderPicker value={folder} onPick={setFolder} />

        <div className="mt-3 flex items-center gap-3">
          {!active ? (
            <Button onClick={handleStart}><Play size={14} />Start watching</Button>
          ) : (
            <Button variant="outline" onClick={handleStop}><Square size={14} />Stop</Button>
          )}
          <label className="ml-auto flex items-center gap-1.5 text-[11.5px] text-mfo-text-dim">
            <input type="checkbox" checked={useRules} onChange={(e) => setUseRules(e.target.checked)} disabled={active} />
            Also run Rules
          </label>
        </div>
      </Card>

      {events.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 px-6 py-14 text-center">
          <EyeOff size={28} className="text-mfo-text-dim" />
          <p className="text-sm font-medium text-mfo-text">No activity yet.</p>
          <p className="text-xs text-mfo-text-dim">Files organized by the watcher will appear here.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-mfo-border px-3.5 py-2.5">
            <span className="text-[13px] font-medium text-mfo-text">Activity log</span>
            <span className="rounded-full bg-mfo-green/10 px-2 py-0.5 text-[10.5px] font-medium text-mfo-green">{events.length} events</span>
            <Button variant="outline" onClick={clearWatcherEvents} className="ml-auto px-2.5 py-1 text-[11px]"><Trash2 size={12} />Clear</Button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {events.map((e, i) => (
              <div key={i} className="flex items-center gap-2.5 border-b border-mfo-border px-3.5 py-1.5 last:border-0">
                <span className="w-20 shrink-0 text-[10.5px] text-mfo-text-dim">{e.time}</span>
                <span className="min-w-0 flex-1 truncate text-[12px] text-mfo-text" title={e.filename}>{e.filename}</span>
                <span className="shrink-0 rounded bg-mfo-surface2 px-1.5 py-0.5 text-[10px] text-mfo-text-dim">{e.category}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

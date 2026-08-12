import { useEffect, useState } from 'react';
import { Minus, Square, X } from 'lucide-react';
import appIcon from '../../../assets/icon.png';
import { showToast } from '../lib/toast.js';

export default function TitleBar() {
  const [version, setVersion] = useState('');
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    window.api?.getAppVersion?.().then(setVersion);
  }, []);

  const checkForUpdates = async () => {
    if (checking) return;
    setChecking(true);
    showToast('Checking for updates...');
    const r = await window.api.checkForUpdates();
    setChecking(false);
    if (!r.ok) { showToast('Update check failed'); return; }
    if (r.updateAvailable) showToast(`Update available: v${r.latestVersion}`);
    else showToast('You are up to date');
  };

  return (
    <div className="drag-region flex h-9 shrink-0 items-center justify-between border-b border-mfo-border bg-mfo-surface pl-3">
      <div className="flex items-center gap-2">
        <img src={appIcon} alt="" className="h-4 w-4" />
        <span className="text-xs font-medium text-mfo-text">Mojo File Organizer</span>
        {version && (
          <button
            onClick={checkForUpdates}
            className="no-drag rounded-full bg-mfo-green/10 px-2 py-0.5 text-[10px] text-mfo-green transition-colors hover:bg-mfo-green/20"
            title="Check for updates"
          >
            v{version}
          </button>
        )}
      </div>
      <div className="no-drag flex h-full">
        <button
          onClick={() => window.api?.minimize?.()}
          className="flex h-full w-11 items-center justify-center text-mfo-text-dim transition-colors hover:bg-mfo-surface2 hover:text-mfo-text"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={() => window.api?.maximize?.()}
          className="flex h-full w-11 items-center justify-center text-mfo-text-dim transition-colors hover:bg-mfo-surface2 hover:text-mfo-text"
        >
          <Square size={12} />
        </button>
        <button
          onClick={() => window.api?.close?.()}
          className="flex h-full w-11 items-center justify-center text-mfo-text-dim transition-colors hover:bg-red-600 hover:text-white"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}

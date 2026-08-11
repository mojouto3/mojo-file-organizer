import { useEffect, useState } from 'react';
import { FolderCog, Minus, Square, X } from 'lucide-react';

export default function TitleBar() {
  const [version, setVersion] = useState('');

  useEffect(() => {
    window.api?.getAppVersion?.().then(setVersion);
  }, []);

  return (
    <div className="drag-region flex h-9 shrink-0 items-center justify-between border-b border-mfo-border bg-mfo-surface pl-3">
      <div className="flex items-center gap-2">
        <FolderCog size={16} className="text-mfo-green" />
        <span className="text-xs font-medium text-mfo-text">Mojo File Organizer</span>
        {version && (
          <span className="rounded-full bg-mfo-green/10 px-2 py-0.5 text-[10px] text-mfo-green">
            v{version}
          </span>
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

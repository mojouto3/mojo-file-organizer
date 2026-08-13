import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { BookmarkPlus, Download, FolderOpen, Star, X } from 'lucide-react';
import { showToast } from '../lib/toast.js';

export default function FolderPicker({
  value,
  onPick,
  placeholder,
  showBookmarks = true,
  showRecent = true,
  dragDrop = true
}) {
  const { t } = useTranslation();
  const resolvedPlaceholder = placeholder || t('folderPicker.placeholder');
  const [bookmarks, setBookmarks] = useState([]);
  const [recentFolders, setRecentFolders] = useState([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const rowRef = useRef(null);

  const refreshRecent = () => {
    if (showRecent) window.api.getRecentFolders().then(setRecentFolders).catch(() => {});
  };

  useEffect(() => {
    if (showBookmarks) window.api.getBookmarks().then(setBookmarks).catch(() => {});
    refreshRecent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pick = (folder) => {
    onPick(folder);
    if (showRecent) window.api.addRecentFolder(folder).then(refreshRecent).catch(() => {});
    setPanelOpen(false);
  };

  const handleBrowse = () => window.api.pickFolder().then((f) => f && pick(f));
  const handleDownloads = () => window.api.getDownloads().then((f) => f && pick(f));

  const handleBookmarkCurrent = () => {
    if (!value) { showToast(t('common.selectFolderFirst')); return; }
    window.api.addBookmark(value).then(setBookmarks);
    showToast(t('folderPicker.bookmarkAdded'));
  };

  const handleRemoveBookmark = (id) => {
    window.api.removeBookmark(id).then(setBookmarks);
    showToast(t('folderPicker.bookmarkRemoved'));
  };

  useEffect(() => {
    if (!dragDrop) return;
    const row = rowRef.current;
    if (!row) return;
    const onDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); };
    const onDragLeave = () => setDragOver(false);
    const onDrop = async (e) => {
      e.preventDefault(); e.stopPropagation(); setDragOver(false);
      const files = e.dataTransfer.files;
      if (!files.length) return;
      const filePath = window.api.getDroppedFilePath(files[0]);
      if (!filePath) return;
      const folderPath = await window.api.getPathForFile(filePath);
      if (folderPath) pick(folderPath);
    };
    row.addEventListener('dragover', onDragOver);
    row.addEventListener('dragleave', onDragLeave);
    row.addEventListener('drop', onDrop);
    return () => {
      row.removeEventListener('dragover', onDragOver);
      row.removeEventListener('dragleave', onDragLeave);
      row.removeEventListener('drop', onDrop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragDrop, value]);

  return (
    <div>
      <div
        ref={rowRef}
        className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 transition-colors ${
          dragOver ? 'border-mfo-green bg-mfo-green/5' : 'border-mfo-border'
        }`}
      >
        <input
          readOnly
          value={value || ''}
          placeholder={resolvedPlaceholder}
          className="min-w-0 flex-1 bg-transparent px-1 text-[13px] text-mfo-text outline-none placeholder:text-mfo-text-dim"
        />
        <button
          onClick={handleBrowse}
          className="flex items-center gap-1 rounded-md border border-mfo-border px-2 py-1 text-xs text-mfo-text-dim transition-colors hover:bg-mfo-surface2 hover:text-mfo-text"
        >
          <FolderOpen size={13} />{t('common.browse')}
        </button>
        <button
          onClick={handleDownloads}
          className="flex items-center gap-1 rounded-md border border-mfo-border px-2 py-1 text-xs text-mfo-text-dim transition-colors hover:bg-mfo-surface2 hover:text-mfo-text"
        >
          <Download size={13} />{t('common.downloads')}
        </button>
        {showBookmarks && (
          <button
            onClick={() => setPanelOpen((o) => !o)}
            className={`rounded-md border p-1.5 transition-colors ${
              panelOpen ? 'border-mfo-green text-mfo-green' : 'border-mfo-border text-mfo-text-dim hover:text-mfo-text'
            }`}
            aria-label={t('folderPicker.bookmarks')}
          >
            <Star size={13} />
          </button>
        )}
      </div>

      {showRecent && recentFolders.length > 0 && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-mfo-text-dim">{t('common.recent')}</span>
          {recentFolders.map((f) => (
            <button
              key={f.path}
              title={f.path}
              onClick={() => pick(f.path)}
              className="rounded-md border border-mfo-border px-2 py-0.5 text-[11px] text-mfo-text-dim transition-colors hover:border-mfo-green/40 hover:text-mfo-text"
            >
              {f.name}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showBookmarks && panelOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="glass-surface mt-1.5 overflow-hidden rounded-lg"
          >
            <div className="p-2">
              <button
                onClick={handleBookmarkCurrent}
                className="flex items-center gap-1.5 rounded-md bg-mfo-green px-2.5 py-1 text-xs font-medium text-black hover:bg-mfo-green-hover"
              >
                <BookmarkPlus size={13} />{t('folderPicker.bookmarkCurrent')}
              </button>
            </div>
            {bookmarks.length === 0 ? (
              <p className="px-3 pb-2.5 text-[11px] text-mfo-text-dim">{t('folderPicker.noBookmarks')}</p>
            ) : (
              bookmarks.map((b) => (
                <div
                  key={b.id}
                  onClick={() => pick(b.path)}
                  className="flex cursor-pointer items-center gap-2 border-t border-mfo-border px-3 py-1.5 hover:bg-mfo-surface2"
                >
                  <Star size={12} className="shrink-0 text-mfo-green" />
                  <span className="shrink-0 text-[11.5px] text-mfo-text">{b.name}</span>
                  <span className="flex-1 truncate text-[10.5px] text-mfo-text-dim" title={b.path}>{b.path}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemoveBookmark(b.id); }}
                    className="shrink-0 text-mfo-text-dim hover:text-mfo-danger"
                    aria-label={t('folderPicker.removeBookmark')}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

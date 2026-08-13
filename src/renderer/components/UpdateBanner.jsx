import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';

export default function UpdateBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [latestVersion, setLatestVersion] = useState('');
  const [releaseUrl, setReleaseUrl] = useState('');
  const [fromAutoUpdater, setFromAutoUpdater] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [percent, setPercent] = useState(0);
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    window.api.onUpdateAvailable((data) => {
      setLatestVersion(data.latestVersion || '');
      setReleaseUrl(data.releaseUrl || '');
      setVisible(true);
    });
    window.api.onUpdaterStatus((data) => {
      if (data.status === 'available') {
        setFromAutoUpdater(true);
        if (data.version) setLatestVersion(data.version);
        setVisible(true);
      } else if (data.status === 'downloading') {
        setDownloading(true);
        setPercent(Math.round(data.percent || 0));
      } else if (data.status === 'downloaded') {
        setDownloading(false);
        setDownloaded(true);
      }
    });
  }, []);

  if (!visible) return null;

  const handleAction = () => {
    if (downloaded) window.api.installUpdate();
    else if (fromAutoUpdater) { window.api.downloadUpdate(); setDownloading(true); }
    else window.api.openReleasePage(releaseUrl);
  };

  const actionLabel = downloaded
    ? t('updateBanner.restartToUpdate')
    : downloading ? t('updateBanner.downloading') : fromAutoUpdater ? t('updateBanner.downloadUpdate') : t('updateBanner.viewRelease');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="flex shrink-0 items-center gap-3 overflow-hidden bg-mfo-green px-4 py-2 text-black"
      >
        <Sparkles size={15} className="shrink-0" />
        <span className="text-[12.5px] font-medium">
          {latestVersion ? t('updateBanner.newVersionAvailableWithVersion', { version: latestVersion }) : t('updateBanner.newVersionAvailable')}
        </span>
        {downloading && (
          <div className="h-1.5 w-32 shrink-0 overflow-hidden rounded-full bg-black/15">
            <div className="h-full rounded-full bg-black/60 transition-all" style={{ width: `${percent}%` }} />
          </div>
        )}
        <button
          onClick={handleAction}
          disabled={downloading}
          className="shrink-0 rounded-md bg-black/15 px-2.5 py-1 text-[11.5px] font-medium hover:bg-black/25 disabled:opacity-60"
        >
          {actionLabel}
        </button>
        <button onClick={() => setVisible(false)} className="ml-auto shrink-0 text-black/70 hover:text-black" aria-label={t('updateBanner.dismiss')}>
          <X size={14} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

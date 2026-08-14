import { lazy, Suspense, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import TitleBar from './components/TitleBar.jsx';
import AmbientBackground from './components/AmbientBackground.jsx';
import Sidebar from './components/Sidebar.jsx';
import ComingSoon from './views/ComingSoon.jsx';
import Home from './views/Home.jsx';
import ToastHost from './components/ToastHost.jsx';
import ConfirmHost from './components/ConfirmHost.jsx';
import WatcherListener from './components/WatcherListener.jsx';
import OnboardingOverlay from './components/OnboardingOverlay.jsx';
import ShortcutsModal from './components/ShortcutsModal.jsx';
import UpdateBanner from './components/UpdateBanner.jsx';
import { applyTheme, applyAccent } from './lib/theme.js';
import { subscribeOnboarding } from './lib/onboarding.js';
import { getSettings } from './lib/settingsStore.js';

const Organize = lazy(() => import('./views/Organize.jsx'));
const Duplicates = lazy(() => import('./views/Duplicates.jsx'));
const Cleanup = lazy(() => import('./views/Cleanup.jsx'));
const Activity = lazy(() => import('./views/Activity.jsx'));
const SmartGroup = lazy(() => import('./views/SmartGroup.jsx'));
const Rules = lazy(() => import('./views/Rules.jsx'));
const Watcher = lazy(() => import('./views/Watcher.jsx'));
const Settings = lazy(() => import('./views/Settings.jsx'));

function ViewLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <RefreshCw size={20} className="animate-spin text-mfo-text-dim" />
    </div>
  );
}

const VIEW_ORDER = ['home', 'organize', 'duplicates', 'cleanup', 'activity', 'smart-group', 'rules', 'watcher', 'settings'];

const VIEW_LABEL_KEYS = {
  home: 'nav.home',
  organize: 'nav.organize',
  duplicates: 'nav.duplicates',
  cleanup: 'nav.cleanup',
  activity: 'nav.activity',
  'smart-group': 'nav.smartGroup',
  rules: 'nav.rules',
  watcher: 'nav.watcher',
  settings: 'nav.settings'
};

const VIEWS = {
  home: Home,
  organize: Organize,
  duplicates: Duplicates,
  cleanup: Cleanup,
  activity: Activity,
  'smart-group': SmartGroup,
  rules: Rules,
  watcher: Watcher,
  settings: Settings
};

export default function App() {
  const { t, i18n } = useTranslation();
  const [activeView, setActiveView] = useState('home');
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const ActiveView = VIEWS[activeView];

  useEffect(() => {
    getSettings().then((s) => {
      if (s.theme) applyTheme(s.theme);
      if (s.accentColor) applyAccent(s.accentColor);
      if (s.language) i18n.changeLanguage(s.language);
      if (!s.onboardingComplete) setOnboardingOpen(true);
    });
    return subscribeOnboarding(() => setOnboardingOpen(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
      if (e.ctrlKey && !e.shiftKey && !e.altKey && /^[1-9]$/.test(e.key)) {
        e.preventDefault();
        setActiveView(VIEW_ORDER[Number(e.key) - 1]);
        return;
      }
      if (typing) return;
      if (e.key === '?') { setShortcutsOpen((v) => !v); return; }
      if (e.key === 'Escape') { setShortcutsOpen(false); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="flex h-screen w-screen flex-col bg-mfo-bg text-mfo-text">
      <AmbientBackground />
      <TitleBar onShowShortcuts={() => setShortcutsOpen(true)} />
      <UpdateBanner />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeView={activeView} onNavigate={setActiveView} />
        <main className="flex-1 overflow-y-auto p-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              {ActiveView ? (
                <Suspense fallback={<ViewLoading />}>
                  <ActiveView onNavigate={setActiveView} />
                </Suspense>
              ) : <ComingSoon label={t(VIEW_LABEL_KEYS[activeView])} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <ToastHost />
      <ConfirmHost />
      <WatcherListener />
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <OnboardingOverlay open={onboardingOpen} onComplete={() => setOnboardingOpen(false)} />
    </div>
  );
}

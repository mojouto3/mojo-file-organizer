import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import TitleBar from './components/TitleBar.jsx';
import Sidebar from './components/Sidebar.jsx';
import ComingSoon from './views/ComingSoon.jsx';
import Home from './views/Home.jsx';
import Organize from './views/Organize.jsx';
import Duplicates from './views/Duplicates.jsx';
import Cleanup from './views/Cleanup.jsx';
import Activity from './views/Activity.jsx';
import SmartGroup from './views/SmartGroup.jsx';
import Rules from './views/Rules.jsx';
import Watcher from './views/Watcher.jsx';
import Settings from './views/Settings.jsx';
import ToastHost from './components/ToastHost.jsx';
import ConfirmHost from './components/ConfirmHost.jsx';
import WatcherListener from './components/WatcherListener.jsx';
import OnboardingOverlay from './components/OnboardingOverlay.jsx';
import ShortcutsModal from './components/ShortcutsModal.jsx';
import UpdateBanner from './components/UpdateBanner.jsx';
import { applyTheme, applyAccent } from './lib/theme.js';
import { subscribeOnboarding } from './lib/onboarding.js';

const VIEW_ORDER = ['home', 'organize', 'duplicates', 'cleanup', 'activity', 'smart-group', 'rules', 'watcher', 'settings'];

const VIEW_LABELS = {
  home: 'Home',
  organize: 'Organize',
  duplicates: 'Duplicates',
  cleanup: 'Cleanup',
  activity: 'Activity',
  'smart-group': 'Smart Group',
  rules: 'Rules',
  watcher: 'Watcher',
  settings: 'Settings'
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
  const [activeView, setActiveView] = useState('home');
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const ActiveView = VIEWS[activeView];

  useEffect(() => {
    window.api.getSettings().then((s) => {
      if (s.theme) applyTheme(s.theme);
      if (s.accentColor) applyAccent(s.accentColor);
      if (!s.onboardingComplete) setOnboardingOpen(true);
    });
    return subscribeOnboarding(() => setOnboardingOpen(true));
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
              {ActiveView ? <ActiveView onNavigate={setActiveView} /> : <ComingSoon label={VIEW_LABELS[activeView]} />}
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

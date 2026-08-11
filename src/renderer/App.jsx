import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import TitleBar from './components/TitleBar.jsx';
import Sidebar from './components/Sidebar.jsx';
import ComingSoon from './views/ComingSoon.jsx';

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

export default function App() {
  const [activeView, setActiveView] = useState('home');

  return (
    <div className="flex h-screen w-screen flex-col bg-mfo-bg text-mfo-text">
      <TitleBar />
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
              <ComingSoon label={VIEW_LABELS[activeView]} />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

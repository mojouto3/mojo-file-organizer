import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Home,
  Folder,
  Copy,
  Trash2,
  History,
  Layers,
  ListChecks,
  Eye,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'organize', label: 'Organize', icon: Folder },
  { id: 'duplicates', label: 'Duplicates', icon: Copy },
  { id: 'cleanup', label: 'Cleanup', icon: Trash2 },
  { id: 'activity', label: 'Activity', icon: History },
  { id: 'smart-group', label: 'Smart Group', icon: Layers },
  { id: 'rules', label: 'Rules', icon: ListChecks },
  { id: 'watcher', label: 'Watcher', icon: Eye }
];

function NavButton({ isActive, icon: Icon, label, collapsed, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
        collapsed ? 'justify-center' : ''
      }`}
    >
      {isActive && (
        <motion.div
          layoutId="sidebar-active"
          className="absolute inset-0 rounded-lg border border-mfo-green/30 bg-mfo-green/10"
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        />
      )}
      <Icon size={18} className={`relative z-10 shrink-0 ${isActive ? 'text-mfo-green' : 'text-mfo-text-dim'}`} />
      <AnimatePresence>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={`relative z-10 whitespace-nowrap ${isActive ? 'font-medium text-mfo-text' : 'text-mfo-text-dim'}`}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

export default function Sidebar({ activeView, onNavigate }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 200 }}
      transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      className="flex h-full shrink-0 flex-col overflow-hidden border-r border-mfo-border bg-mfo-surface/80 backdrop-blur-sm"
    >
      <nav className="flex flex-1 flex-col gap-1 px-3 pt-4">
        {NAV_ITEMS.map((item) => (
          <NavButton
            key={item.id}
            isActive={activeView === item.id}
            icon={item.icon}
            label={item.label}
            collapsed={collapsed}
            onClick={() => onNavigate(item.id)}
          />
        ))}
      </nav>

      <div className="flex flex-col gap-1 px-3 pb-5">
        <NavButton
          isActive={activeView === 'settings'}
          icon={Settings}
          label="Settings"
          collapsed={collapsed}
          onClick={() => onNavigate('settings')}
        />
        <button
          onClick={() => setCollapsed((c) => !c)}
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-mfo-text-dim transition-colors hover:bg-mfo-surface2 hover:text-mfo-text ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!collapsed && <span className="whitespace-nowrap">Collapse</span>}
        </button>
      </div>
    </motion.aside>
  );
}

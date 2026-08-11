import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, ChevronRight, Eye, RefreshCw, SlidersHorizontal, TriangleAlert, Trash2, Zap } from 'lucide-react';
import Card from '../components/Card.jsx';
import CountUp from '../components/CountUp.jsx';
import { basename, timeAgo } from '../lib/format.js';

const WELL_KNOWN_FOLDERS = ['Downloads', 'Desktop', 'Documents', 'Pictures', 'Music'];

const TYPE_LABEL = { rules: 'Rules', watcher: 'Watcher', cleanup: 'Cleanup' };
const TYPE_COLOR = {
  organize: 'bg-mfo-green/10 text-mfo-green',
  rules: 'bg-blue-500/10 text-blue-400',
  watcher: 'bg-purple-500/10 text-purple-400',
  cleanup: 'bg-mfo-danger/10 text-mfo-danger'
};

function normPath(p) {
  return (p || '').toLowerCase().replace(/\\/g, '/').replace(/\/+$/, '');
}

function sessionFileCount(s) {
  return s.total || s.moved?.length || s.results?.length || s.files?.length || s.count || 0;
}

// Finds the most neglected well-known folder (Downloads, Desktop, ...) that
// was organized but never cleaned, or not cleaned in the last 30+ days.
function findCleanupReminder(sessions) {
  const organizedFolders = [...new Set(
    sessions.filter((s) => s.type === 'organize' || !s.type).map((s) => s.folder).filter(Boolean)
  )];
  const candidates = organizedFolders.filter((f) => {
    const parts = f.replace(/\\/g, '/').split('/');
    return WELL_KNOWN_FOLDERS.some((wk) => parts[parts.length - 1].toLowerCase() === wk.toLowerCase());
  });

  let folder = null;
  let neverCleaned = false;
  let maxDays = 30;
  for (const f of candidates) {
    const lastCleanup = sessions.find((s) => s.type === 'cleanup' && normPath(s.folder) === normPath(f));
    if (!lastCleanup) {
      if (!folder) { folder = f; neverCleaned = true; }
      continue;
    }
    const days = Math.floor((Date.now() - new Date(lastCleanup.timestamp).getTime()) / 86400000);
    if (!neverCleaned && days > maxDays) { maxDays = days; folder = f; }
  }
  return folder ? { folder, neverCleaned, days: maxDays } : null;
}

function Sparkline({ weeklyTrend }) {
  if (!weeklyTrend.some((v) => v > 0)) return null;
  const max = Math.max(...weeklyTrend, 1);
  const w = 90, h = 24;
  const step = w / (weeklyTrend.length - 1);
  const points = weeklyTrend.map((v, i) => `${(i * step).toFixed(1)},${(h - (v / max) * h).toFixed(1)}`).join(' ');
  const firstHalf = weeklyTrend.slice(0, 4).reduce((a, b) => a + b, 0);
  const secondHalf = weeklyTrend.slice(4).reduce((a, b) => a + b, 0);
  const trendPct = firstHalf > 0 ? Math.round(((secondHalf - firstHalf) / firstHalf) * 100) : (secondHalf > 0 ? 100 : 0);

  return (
    <div className="flex items-center gap-2.5 border-t border-mfo-border px-3.5 py-2">
      <span className="shrink-0 text-[10px] text-mfo-text-dim">Last 8 weeks</span>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <polyline points={points} fill="none" stroke="#3ddb3d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className={`text-[11px] font-medium ${trendPct >= 0 ? 'text-mfo-green' : 'text-mfo-danger'}`}>
        {trendPct > 0 ? '+' : ''}{trendPct}%
      </span>
    </div>
  );
}

export default function Home({ onNavigate }) {
  const [state, setState] = useState(null);

  const load = () => {
    setState(null);
    Promise.all([
      window.api.getLog(),
      window.api.getSettings(),
      window.api.getRules(),
      window.api.getStats(),
      window.api.getUsername().catch(() => ''),
      window.api.getWatcherStatus().catch(() => ({ active: false, folder: null }))
    ]).then(([sessions, settings, rules, stats, username, watcherStatus]) => {
      setState({ sessions, settings, rules, stats, username, watcherStatus });
    });
  };

  useEffect(load, []);

  if (!state) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-mfo-surface2" />
        ))}
      </div>
    );
  }

  const { sessions, settings, rules, stats, username, watcherStatus } = state;
  const defaultFolder = settings.defaultFolder || null;
  const enabledRules = rules.filter((r) => r.enabled);
  const disabledRule = rules.find((r) => !r.enabled);
  const lastOrganizeSession = sessions.find((s) => s.type === 'organize' || !s.type);
  const quickOrganizeFolder = lastOrganizeSession ? lastOrganizeSession.folder : defaultFolder;
  const recentSessions = sessions.filter((s) => sessionFileCount(s) > 0).slice(0, 3);
  const reminder = findCleanupReminder(sessions);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
      className="flex flex-col gap-3"
    >
      <motion.div
        variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}
        className="flex items-center justify-between"
      >
        <div>
          <p className="text-base font-medium text-mfo-text">{greeting}{username ? `, ${username}` : ''}</p>
          <p className="mt-0.5 text-xs text-mfo-text-dim">{dateStr}, here is your overview.</p>
        </div>
        <button
          onClick={load}
          className="rounded-lg p-2 text-mfo-text-dim transition-colors hover:bg-mfo-surface2 hover:text-mfo-text"
          aria-label="Refresh"
        >
          <RefreshCw size={15} />
        </button>
      </motion.div>

      {reminder && (
        <motion.div
          variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}
          onClick={() => onNavigate('cleanup')}
          className="glass-card flex cursor-pointer items-center gap-3 rounded-xl px-3.5 py-2.5"
        >
          <TriangleAlert size={16} className="shrink-0 text-amber-400" />
          <div className="flex-1">
            <p className="text-xs font-medium text-mfo-text">
              {basename(reminder.folder)} {reminder.neverCleaned
                ? 'has never been cleaned'
                : `hasn't been cleaned in ${reminder.days > 60 ? Math.floor(reminder.days / 30) + ' months' : reminder.days + ' days'}`}
            </p>
            <p className="text-[11px] text-mfo-text-dim">Run a scan to find temp files, installers and empty folders.</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onNavigate('cleanup'); }}
            className="flex shrink-0 items-center gap-1 rounded-lg border border-mfo-border px-2.5 py-1 text-xs text-mfo-text transition-colors hover:bg-mfo-surface2"
          >
            <Trash2 size={12} />Clean now
          </button>
        </motion.div>
      )}

      <motion.div variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}>
        <Card className="cursor-pointer overflow-hidden" onClick={() => onNavigate('organize')}>
          <div className="p-3.5">
            <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-mfo-green">
              <Zap size={11} />QUICK ORGANIZE
            </div>
            <p className="text-[15px] font-semibold text-mfo-text">{basename(quickOrganizeFolder) || 'No folder selected'}</p>
            <p className="text-[11px] text-mfo-text-dim">
              {lastOrganizeSession ? `Last organized ${timeAgo(lastOrganizeSession.timestamp)}` : 'Not organized yet'}
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); onNavigate('organize'); }}
              className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-mfo-green px-3.5 py-1.5 text-[12.5px] font-medium text-black transition-colors hover:bg-mfo-green-hover"
            >
              <Zap size={13} />Organize now
            </button>
          </div>
          <Sparkline weeklyTrend={stats.weeklyTrend || []} />
          <div className="flex border-t border-mfo-border">
            <div className="flex-1 border-r border-mfo-border py-2 text-center">
              <CountUp value={stats.totalFiles || 0} className="text-base font-semibold text-mfo-text" />
              <p className="mt-0.5 text-[10px] text-mfo-text-dim">Files organized</p>
            </div>
            <div className="flex-1 border-r border-mfo-border py-2 text-center">
              <CountUp value={stats.totalSessions || 0} className="text-base font-semibold text-mfo-text" />
              <p className="mt-0.5 text-[10px] text-mfo-text-dim">Sessions</p>
            </div>
            <div className="flex-1 py-2 text-center">
              <CountUp value={stats.rulesStats?.total || 0} className="text-base font-semibold text-mfo-green" />
              <p className="mt-0.5 text-[10px] text-mfo-text-dim">Via rules</p>
            </div>
          </div>
        </Card>
      </motion.div>

      <div className="grid grid-cols-2 gap-3">
        <motion.div variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}>
          <Card className="cursor-pointer overflow-hidden" onClick={() => onNavigate('rules')}>
            <div className="flex items-center gap-2 border-b border-mfo-border px-3.5 py-2">
              <SlidersHorizontal size={13} className="text-mfo-text-dim" />
              <span className="flex-1 text-[10px] font-semibold tracking-wide text-mfo-text-dim">RULES</span>
              <span
                onClick={(e) => { e.stopPropagation(); onNavigate('rules'); }}
                className="flex items-center gap-0.5 text-[11px] text-mfo-text-dim hover:text-mfo-green"
              >
                Run all<ChevronRight size={11} />
              </span>
            </div>
            {enabledRules.length === 0 && !disabledRule && (
              <p className="px-3.5 py-2 text-[11px] text-mfo-text-dim">No rules configured</p>
            )}
            {enabledRules.slice(0, 3).map((r) => {
              const rSession = sessions.find((s) => s.type === 'rules' && s.results?.some((res) => res.rule === r.name));
              return (
                <div key={r.id} className="flex items-center gap-2 border-b border-mfo-border px-3.5 py-1.5 last:border-0">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-mfo-green" />
                  <span className="flex-1 truncate text-[11px] text-mfo-text">{r.name}</span>
                  <span className="shrink-0 text-[10px] text-mfo-text-dim">{rSession ? timeAgo(rSession.timestamp) : ''}</span>
                </div>
              );
            })}
            {disabledRule && (
              <div className="flex items-center gap-2 px-3.5 py-1.5">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-mfo-border" />
                <span className="flex-1 truncate text-[11px] text-mfo-text-dim">{disabledRule.name}</span>
                <span className="shrink-0 text-[10px] text-mfo-text-dim">Disabled</span>
              </div>
            )}
          </Card>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}>
          <Card className="cursor-pointer overflow-hidden" onClick={() => onNavigate('watcher')}>
            <div className="flex items-center gap-2 border-b border-mfo-border px-3.5 py-2">
              <Eye size={13} className="text-mfo-text-dim" />
              <span className="flex-1 text-[10px] font-semibold tracking-wide text-mfo-text-dim">WATCHER</span>
              <span className="flex items-center gap-0.5 text-[11px] text-mfo-text-dim">View<ChevronRight size={11} /></span>
            </div>
            <div className="px-3.5 py-2.5">
              <div className="mb-1 flex items-center gap-2">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${watcherStatus.active ? 'bg-mfo-green shadow-[0_0_6px_#3ddb3d]' : 'bg-mfo-border'}`}
                />
                <span className="text-xs font-medium text-mfo-text">{watcherStatus.active ? 'Active' : 'Inactive'}</span>
              </div>
              <p className="truncate text-[11px] text-mfo-text-dim">
                {watcherStatus.active && watcherStatus.folder ? watcherStatus.folder : 'Not monitoring'}
              </p>
            </div>
          </Card>
        </motion.div>
      </div>

      {recentSessions.length > 0 && (
        <motion.div variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}>
          <Card className="cursor-pointer overflow-hidden" onClick={() => onNavigate('activity')}>
            <div className="flex items-center gap-2 border-b border-mfo-border px-3.5 py-2">
              <Activity size={13} className="text-mfo-text-dim" />
              <span className="flex-1 text-[10px] font-semibold tracking-wide text-mfo-text-dim">RECENT ACTIVITY</span>
              <span className="flex items-center gap-0.5 text-[11px] text-mfo-text-dim">View all<ChevronRight size={11} /></span>
            </div>
            {recentSessions.map((s) => (
              <div key={s.id} className="flex items-center gap-2.5 border-b border-mfo-border px-3.5 py-2 last:border-0 hover:bg-mfo-surface2">
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${TYPE_COLOR[s.type] || TYPE_COLOR.organize}`}>
                  {TYPE_LABEL[s.type] || 'Organize'}
                </span>
                <span className="flex-1 truncate text-[11px] text-mfo-text">{basename(s.folder)}</span>
                <span className="shrink-0 text-[10px] text-mfo-text-dim">{sessionFileCount(s)} files, {timeAgo(s.timestamp)}</span>
              </div>
            ))}
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}

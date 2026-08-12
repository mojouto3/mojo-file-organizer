import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart3, Copy, Eye, FolderCog, HelpCircle, History, Home, Keyboard, Layers,
  LayoutTemplate, Package, Pencil, RefreshCw, Settings2, ShieldOff, SlidersHorizontal,
  Sparkles, Trash2, Undo2, Wand2, Zap
} from 'lucide-react';
import { applyTheme } from '../lib/theme.js';

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'gr', label: 'Ελληνικά' },
  { value: 'de', label: 'Deutsch' },
  { value: 'es', label: 'Español' },
  { value: 'ru', label: 'Русский' }
];

const STEPS = [
  {
    icon: Home, title: 'Welcome to MFO',
    desc: 'Your modern file organizer for Windows. Let’s take a quick tour so you can get the most out of it.',
    features: [
      { icon: Home, title: 'Home dashboard', sub: 'A live overview of your folders' },
      { icon: Zap, title: 'One-click organize', sub: 'Sort a folder in a single click' },
      { icon: Undo2, title: 'Undo anytime', sub: 'Every action can be reversed' }
    ]
  },
  {
    icon: Settings2, title: 'Powerful tools',
    desc: 'Beyond basic organizing, MFO comes packed with tools for every situation.',
    features: [
      { icon: Copy, title: 'Duplicate finder', sub: 'By content or by name' },
      { icon: Trash2, title: 'Cleanup tab', sub: 'Installers, junk, old files' },
      { icon: History, title: 'Activity tab', sub: 'Full history of every run' }
    ]
  },
  {
    icon: SlidersHorizontal, title: 'File Rules Engine',
    desc: 'Automate file actions with custom rules, move, delete, or rename files based on any condition.',
    features: [
      { icon: LayoutTemplate, title: 'Preset rules and templates', sub: '6 presets, 4 rule-set templates' },
      { icon: Wand2, title: 'Custom rule builder', sub: 'Name, extension, age, date, size, content' },
      { icon: Eye, title: 'Preview and dry-run', sub: 'See what would happen first' }
    ]
  },
  {
    icon: Layers, title: 'Fully customizable',
    desc: 'MFO adapts to your workflow, not the other way around.',
    features: [
      { icon: Layers, title: 'Custom categories', sub: 'Your own extension groups' },
      { icon: ShieldOff, title: 'Ignore list', sub: 'Skip files and folders you choose' },
      { icon: Pencil, title: 'Rename rules', sub: 'Prefixes, casing, cleanup' }
    ]
  },
  {
    icon: Sparkles, title: 'Smart features',
    desc: 'MFO learns from your habits and helps you stay organized automatically.',
    features: [
      { icon: Home, title: 'Home dashboard', sub: 'Trends and quick actions' },
      { icon: Package, title: 'Duplicate app versions', sub: 'Finds old installer versions' },
      { icon: RefreshCw, title: 'Auto-updater', sub: 'Stay on the latest release' }
    ]
  },
  {
    icon: Keyboard, title: 'Built for power users',
    desc: 'Work faster with keyboard shortcuts and Windows Explorer integration.',
    features: [
      { icon: Keyboard, title: 'Keyboard shortcuts', sub: 'Ctrl+1-9 to jump between tabs' },
      { icon: FolderCog, title: 'Explorer context menu', sub: 'Organize right-click in Explorer' },
      { icon: HelpCircle, title: 'Shortcuts help', sub: 'Press ? anytime' }
    ]
  },
  {
    icon: History, title: 'Track everything',
    desc: 'Every action is logged so you always know what happened, and can undo it.',
    features: [
      { icon: History, title: 'Session history', sub: 'Search, filter, export' },
      { icon: BarChart3, title: 'Statistics', sub: 'Files organized over time' },
      { icon: Eye, title: 'File preview', sub: 'Hover a file in history' }
    ]
  },
  { icon: Sparkles, title: 'Make it yours', desc: 'Choose your language and theme before you start.', pickers: true }
];

export default function OnboardingOverlay({ open, onComplete }) {
  const [step, setStep] = useState(0);
  const [theme, setThemeState] = useState('dark');
  const [language, setLanguage] = useState('en');

  if (!open) return null;

  const finish = () => {
    window.api.getSettings().then((s) => {
      s.onboardingComplete = true;
      s.theme = theme;
      s.language = language;
      window.api.saveSettings(s);
    });
    onComplete();
  };

  const setTheme = (t) => { setThemeState(t); applyTheme(t); };
  const current = STEPS[step];
  const StepIcon = current.icon;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-6">
      <div className="glass-card flex w-full max-w-lg flex-col rounded-2xl">
        <div className="flex items-center justify-between border-b border-mfo-border px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-mfo-green/15 px-1.5 py-0.5 text-[11px] font-semibold text-mfo-green">MFO</span>
            <span className="text-[12.5px] font-medium text-mfo-text">Mojo File Organizer</span>
          </div>
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === step ? 'bg-mfo-green' : 'bg-mfo-border'}`} />
            ))}
          </div>
        </div>

        <div className="overflow-hidden px-5 py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-mfo-green/10">
                <StepIcon size={20} className="text-mfo-green" />
              </div>
              <p className="text-[16px] font-semibold text-mfo-text">{current.title}</p>
              <p className="mt-1 text-[12.5px] text-mfo-text-dim">{current.desc}</p>

              {current.features && (
                <div className="mt-4 flex flex-col gap-2.5">
                  {current.features.map((f) => (
                    <div key={f.title} className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-mfo-surface2">
                        <f.icon size={15} className="text-mfo-text-dim" />
                      </div>
                      <div>
                        <p className="text-[12.5px] text-mfo-text">{f.title}</p>
                        <p className="text-[11px] text-mfo-text-dim">{f.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {current.pickers && (
                <div className="mt-4 flex flex-col gap-3">
                  <div>
                    <p className="mb-1.5 text-[11px] text-mfo-text-dim">Theme</p>
                    <div className="flex gap-2">
                      {['dark', 'light'].map((t) => (
                        <button
                          key={t}
                          onClick={() => setTheme(t)}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                            theme === t ? 'border-mfo-green bg-mfo-green/10 text-mfo-green' : 'border-mfo-border text-mfo-text-dim'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-1.5 text-[11px] text-mfo-text-dim">Language</p>
                    <div className="flex flex-wrap gap-1.5">
                      {LANGUAGES.map((l) => (
                        <button
                          key={l.value}
                          onClick={() => setLanguage(l.value)}
                          className={`rounded-lg border px-2.5 py-1 text-xs transition-colors ${
                            language === l.value ? 'border-mfo-green bg-mfo-green/10 text-mfo-green' : 'border-mfo-border text-mfo-text-dim'
                          }`}
                        >
                          {l.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between border-t border-mfo-border px-5 py-3">
          <button onClick={finish} className="text-[12px] text-mfo-text-dim hover:text-mfo-text">Skip</button>
          <div className="flex gap-2">
            {step > 0 && (
              <button onClick={() => setStep((s) => s - 1)} className="rounded-lg border border-mfo-border px-3.5 py-1.5 text-xs text-mfo-text hover:bg-mfo-surface2">
                Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button onClick={() => setStep((s) => s + 1)} className="rounded-lg bg-mfo-green px-3.5 py-1.5 text-xs font-medium text-black hover:bg-mfo-green-hover">
                Next
              </button>
            ) : (
              <button onClick={finish} className="rounded-lg bg-mfo-green px-3.5 py-1.5 text-xs font-medium text-black hover:bg-mfo-green-hover">
                Let's go
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

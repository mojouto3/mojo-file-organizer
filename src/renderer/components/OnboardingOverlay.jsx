import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart3, Copy, Eye, FolderCog, HelpCircle, History, Home, Keyboard, Layers,
  LayoutTemplate, Package, Pencil, RefreshCw, Settings2, ShieldOff, SlidersHorizontal,
  Sparkles, Trash2, Undo2, Wand2, Zap
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { applyTheme } from '../lib/theme.js';

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'gr', label: 'Ελληνικά' },
  { value: 'de', label: 'Deutsch' },
  { value: 'es', label: 'Español' },
  { value: 'ru', label: 'Русский' }
];

const THEME_LABEL_KEYS = { dark: 'settings.themeDark', light: 'settings.themeLight' };

const STEPS = [
  {
    icon: Home, titleKey: 'onboarding.s1Title', descKey: 'onboarding.s1Desc',
    features: [
      { icon: Home, titleKey: 'onboarding.s1f1Title', subKey: 'onboarding.s1f1Sub' },
      { icon: Zap, titleKey: 'onboarding.s1f2Title', subKey: 'onboarding.s1f2Sub' },
      { icon: Undo2, titleKey: 'onboarding.s1f3Title', subKey: 'onboarding.s1f3Sub' }
    ]
  },
  {
    icon: Settings2, titleKey: 'onboarding.s2Title', descKey: 'onboarding.s2Desc',
    features: [
      { icon: Copy, titleKey: 'onboarding.s2f1Title', subKey: 'onboarding.s2f1Sub' },
      { icon: Trash2, titleKey: 'onboarding.s2f2Title', subKey: 'onboarding.s2f2Sub' },
      { icon: History, titleKey: 'onboarding.s2f3Title', subKey: 'onboarding.s2f3Sub' }
    ]
  },
  {
    icon: SlidersHorizontal, titleKey: 'onboarding.s3Title', descKey: 'onboarding.s3Desc',
    features: [
      { icon: LayoutTemplate, titleKey: 'onboarding.s3f1Title', subKey: 'onboarding.s3f1Sub' },
      { icon: Wand2, titleKey: 'onboarding.s3f2Title', subKey: 'onboarding.s3f2Sub' },
      { icon: Eye, titleKey: 'onboarding.s3f3Title', subKey: 'onboarding.s3f3Sub' }
    ]
  },
  {
    icon: Layers, titleKey: 'onboarding.s4Title', descKey: 'onboarding.s4Desc',
    features: [
      { icon: Layers, titleKey: 'onboarding.s4f1Title', subKey: 'onboarding.s4f1Sub' },
      { icon: ShieldOff, titleKey: 'onboarding.s4f2Title', subKey: 'onboarding.s4f2Sub' },
      { icon: Pencil, titleKey: 'onboarding.s4f3Title', subKey: 'onboarding.s4f3Sub' }
    ]
  },
  {
    icon: Sparkles, titleKey: 'onboarding.s5Title', descKey: 'onboarding.s5Desc',
    features: [
      { icon: Home, titleKey: 'onboarding.s5f1Title', subKey: 'onboarding.s5f1Sub' },
      { icon: Package, titleKey: 'onboarding.s5f2Title', subKey: 'onboarding.s5f2Sub' },
      { icon: RefreshCw, titleKey: 'onboarding.s5f3Title', subKey: 'onboarding.s5f3Sub' }
    ]
  },
  {
    icon: Keyboard, titleKey: 'onboarding.s6Title', descKey: 'onboarding.s6Desc',
    features: [
      { icon: Keyboard, titleKey: 'onboarding.s6f1Title', subKey: 'onboarding.s6f1Sub' },
      { icon: FolderCog, titleKey: 'onboarding.s6f2Title', subKey: 'onboarding.s6f2Sub' },
      { icon: HelpCircle, titleKey: 'onboarding.s6f3Title', subKey: 'onboarding.s6f3Sub' }
    ]
  },
  {
    icon: History, titleKey: 'onboarding.s7Title', descKey: 'onboarding.s7Desc',
    features: [
      { icon: History, titleKey: 'onboarding.s7f1Title', subKey: 'onboarding.s7f1Sub' },
      { icon: BarChart3, titleKey: 'onboarding.s7f2Title', subKey: 'onboarding.s7f2Sub' },
      { icon: Eye, titleKey: 'onboarding.s7f3Title', subKey: 'onboarding.s7f3Sub' }
    ]
  },
  { icon: Sparkles, titleKey: 'onboarding.s8Title', descKey: 'onboarding.s8Desc', pickers: true }
];

export default function OnboardingOverlay({ open, onComplete }) {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState(0);
  const [theme, setThemeState] = useState('dark');
  const [language, setLanguage] = useState('en');

  if (!open) return null;

  const finish = () => {
    i18n.changeLanguage(language);
    window.api.getSettings().then((s) => {
      s.onboardingComplete = true;
      s.theme = theme;
      s.language = language;
      window.api.saveSettings(s);
    });
    onComplete();
  };

  const setTheme = (theme) => { setThemeState(theme); applyTheme(theme); };
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
              <p className="text-[16px] font-semibold text-mfo-text">{t(current.titleKey)}</p>
              <p className="mt-1 text-[12.5px] text-mfo-text-dim">{t(current.descKey)}</p>

              {current.features && (
                <div className="mt-4 flex flex-col gap-2.5">
                  {current.features.map((f) => (
                    <div key={f.titleKey} className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-mfo-surface2">
                        <f.icon size={15} className="text-mfo-text-dim" />
                      </div>
                      <div>
                        <p className="text-[12.5px] text-mfo-text">{t(f.titleKey)}</p>
                        <p className="text-[11px] text-mfo-text-dim">{t(f.subKey)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {current.pickers && (
                <div className="mt-4 flex flex-col gap-3">
                  <div>
                    <p className="mb-1.5 text-[11px] text-mfo-text-dim">{t('settings.theme')}</p>
                    <div className="flex gap-2">
                      {['dark', 'light'].map((themeOption) => (
                        <button
                          key={themeOption}
                          onClick={() => setTheme(themeOption)}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                            theme === themeOption ? 'border-mfo-green bg-mfo-green/10 text-mfo-green' : 'border-mfo-border text-mfo-text-dim'
                          }`}
                        >
                          {t(THEME_LABEL_KEYS[themeOption])}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-1.5 text-[11px] text-mfo-text-dim">{t('settings.languageTitle')}</p>
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
          <button onClick={finish} className="text-[12px] text-mfo-text-dim hover:text-mfo-text">{t('onboarding.skip')}</button>
          <div className="flex gap-2">
            {step > 0 && (
              <button onClick={() => setStep((s) => s - 1)} className="rounded-lg border border-mfo-border px-3.5 py-1.5 text-xs text-mfo-text hover:bg-mfo-surface2">
                {t('common.back')}
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button onClick={() => setStep((s) => s + 1)} className="rounded-lg bg-mfo-green px-3.5 py-1.5 text-xs font-medium text-black hover:bg-mfo-green-hover">
                {t('common.next')}
              </button>
            ) : (
              <button onClick={finish} className="rounded-lg bg-mfo-green px-3.5 py-1.5 text-xs font-medium text-black hover:bg-mfo-green-hover">
                {t('onboarding.letsGo')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, Check } from 'lucide-react';
import { useI18n } from './I18nProvider';
import { LANGS } from './translations';

type Variant = 'dark' | 'light';

export const LanguageSwitcher = ({ variant = 'dark', compact = false }: { variant?: Variant; compact?: boolean }) => {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, []);

  const current = LANGS.find((l) => l.code === lang)!;
  const isLight = variant === 'light';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold uppercase tracking-[0.15em] transition-colors ${
          isLight
            ? 'border-[#0f2618]/15 text-[#0f2618] hover:bg-[#0f2618] hover:text-white'
            : 'border-white/20 text-white/80 hover:bg-white hover:text-[#0f2618]'
        }`}
        aria-label="Changer de langue"
      >
        <Globe className="w-3.5 h-3.5" />
        <span>{current.native}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className={`absolute top-full mt-2 ${compact ? 'right-0' : 'right-0'} w-44 rounded-2xl overflow-hidden shadow-2xl z-50 ${
              isLight ? 'bg-white border border-[#0f2618]/10' : 'bg-[#0f2618] border border-white/10'
            }`}
          >
            {LANGS.map((l) => {
              const active = lang === l.code;
              return (
                <button
                  key={l.code}
                  onClick={() => {
                    setLang(l.code);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${
                    isLight
                      ? `text-[#0f2618] hover:bg-[#f4f7f5] ${active ? 'bg-[#f4f7f5] font-semibold' : ''}`
                      : `text-white/80 hover:bg-white/5 ${active ? 'bg-white/5 text-white font-semibold' : ''}`
                  }`}
                  dir={l.dir}
                >
                  <span>{l.label}</span>
                  {active && <Check className="w-3.5 h-3.5 text-[#87A922]" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

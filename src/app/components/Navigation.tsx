import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, Lock, ChevronDown } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import logoImg from '../../imports/logo-with-shadow.png';
import { useI18n } from '../i18n/I18nProvider';
import { LanguageSwitcher } from '../i18n/LanguageSwitcher';

const NavLinkItem = ({
  to,
  label,
  active,
  onClick,
}: {
  to: string;
  label: string;
  active: boolean;
  onClick?: () => void;
}) => (
  <Link
    to={to}
    onClick={onClick}
    className={`relative group whitespace-nowrap uppercase tracking-[0.15em] text-xs transition-colors ${
      active ? 'text-white' : 'text-white/70 hover:text-white'
    }`}
  >
    <span className="relative inline-block py-1">
      {label}
      <span
        className={`pointer-events-none absolute left-0 -bottom-0.5 h-[1.5px] bg-lime origin-left transition-transform duration-500 ${
          active ? 'w-full scale-x-100' : 'w-full scale-x-0 group-hover:scale-x-100'
        }`}
      />
    </span>
  </Link>
);

export const Navigation = () => {
  const [scrolled, setScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activitiesOpen, setActivitiesOpen] = useState(false);
  const location = useLocation();
  const { t } = useI18n();
  const closeTimer = useRef<number | null>(null);

  const isHome = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
    setActivitiesOpen(false);
  }, [location.pathname]);

  // On the home hero the bar is transparent — but the drone video has logos in
  // the top-middle that fight the nav. When transparent we lay a top-down scrim
  // behind the bar and add text/logo shadows so the nav stays readable.
  const transparentTop = isHome && !scrolled;
  const navBackgroundClass = transparentTop
    ? 'bg-transparent py-6 border-b border-transparent'
    : 'bg-forest/90 backdrop-blur-xl py-4 border-b border-white/10';

  const links: { to: string; label: string }[] = [
    { to: '/about', label: t('nav.about') },
    { to: '/technical', label: t('nav.expertise') },
    { to: '/catalog', label: t('nav.products') },
    { to: '/estimator', label: t('nav.estimator') },
    { to: '/blog', label: t('nav.blog') },
  ];

  const activities: { to: string; label: string }[] = [
    { to: '/services/irrigation', label: t('nav.activities.irrigation') },
    { to: '/services/fertilization', label: t('nav.activities.fertilization') },
    { to: '/services/retail', label: t('nav.activities.retail') },
  ];

  const isActive = (to: string) =>
    to === '/'
      ? location.pathname === '/'
      : location.pathname === to || location.pathname.startsWith(to + '/');

  const openActivities = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setActivitiesOpen(true);
  };
  const scheduleCloseActivities = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setActivitiesOpen(false), 150);
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${navBackgroundClass}`}
    >
      {/* Top scrim — only on the transparent home hero. Darkens behind the bar
          (where the video's centre logos sit) and fades to nothing below it. */}
      {transparentTop && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/75 via-black/35 to-transparent"
        />
      )}
      <div
        className={`relative max-w-7xl mx-auto px-6 md:px-12 flex justify-between items-center ${
          transparentTop ? '[text-shadow:0_1px_12px_rgba(0,0,0,0.7)]' : ''
        }`}
      >
        <Link to="/" className="flex items-center gap-4 group">
          <motion.img
            src={logoImg}
            alt="AGROESPACE"
            className={`h-12 w-auto object-contain ${
              transparentTop ? 'drop-shadow-[0_2px_12px_rgba(0,0,0,0.7)]' : ''
            }`}
            whileHover={{ rotate: 6, scale: 1.08 }}
            transition={{ type: 'spring', stiffness: 220, damping: 14 }}
          />
          <span className="text-white text-2xl font-bold tracking-tight hidden sm:block font-serif">
            AGROESPACE
          </span>
        </Link>

        <div className="hidden lg:flex items-center gap-6 xl:gap-8 text-sm font-medium flex-nowrap">
          <div
            className="relative shrink-0"
            onMouseEnter={openActivities}
            onMouseLeave={scheduleCloseActivities}
          >
            <button
              onClick={() => setActivitiesOpen((o) => !o)}
              className={`relative group flex items-center gap-1.5 whitespace-nowrap uppercase tracking-[0.15em] text-xs transition-colors ${
                location.pathname.startsWith('/services') ? 'text-white' : 'text-white/70 hover:text-white'
              }`}
            >
              <span className="relative inline-block py-1">
                {t('nav.activities')}
                <span
                  className={`pointer-events-none absolute left-0 -bottom-0.5 h-[1.5px] bg-lime origin-left transition-transform duration-500 ${
                    location.pathname.startsWith('/services')
                      ? 'w-full scale-x-100'
                      : 'w-full scale-x-0 group-hover:scale-x-100'
                  }`}
                />
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${activitiesOpen ? 'rotate-180' : ''}`}
              />
            </button>

            <AnimatePresence>
              {activitiesOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-64 bg-forest border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
                >
                  <Link
                    to="/services"
                    className="block px-5 py-3 text-xs uppercase tracking-[0.15em] text-lime border-b border-white/5 hover:bg-white/5"
                  >
                    {t('nav.activities')}
                  </Link>
                  {activities.map((a) => (
                    <Link
                      key={a.to}
                      to={a.to}
                      className={`block px-5 py-3 text-sm transition-colors ${
                        isActive(a.to)
                          ? 'text-white bg-white/5'
                          : 'text-white/70 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {a.label}
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {links.map((item) => (
            <NavLinkItem key={item.to} to={item.to} label={item.label} active={isActive(item.to)} />
          ))}

          <Link
            to="/contact"
            className="shrink-0 whitespace-nowrap px-5 xl:px-6 py-2.5 bg-white text-forest rounded-full hover:bg-lime hover:text-white transition-all uppercase tracking-[0.1em] text-xs font-bold"
          >
            {t('nav.contact')}
          </Link>

          <LanguageSwitcher variant="dark" />

          <Link to="/admin" className="shrink-0 text-white/40 hover:text-white transition-colors" title={t('nav.admin')}>
            <Lock className="w-4 h-4" />
          </Link>
        </div>

        <div className="lg:hidden flex items-center gap-3">
          <LanguageSwitcher variant="dark" compact />
          <button className="text-white" onClick={() => setIsOpen(!isOpen)} aria-label="menu">
            {isOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden absolute top-full left-0 right-0 bg-forest px-6 py-8 flex flex-col space-y-5 border-b border-white/10 shadow-2xl"
          >
            <Link to="/about" onClick={() => setIsOpen(false)} className="text-white text-lg">
              {t('nav.about')}
            </Link>

            <details className="group">
              <summary className="cursor-pointer list-none text-white text-lg flex items-center justify-between">
                <span>{t('nav.activities')}</span>
                <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="mt-3 ms-4 space-y-3 border-s border-white/10 ps-4">
                {activities.map((a) => (
                  <Link
                    key={a.to}
                    to={a.to}
                    onClick={() => setIsOpen(false)}
                    className="block text-white/70 hover:text-white text-base"
                  >
                    {a.label}
                  </Link>
                ))}
              </div>
            </details>

            {links.slice(1).map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setIsOpen(false)}
                className="text-white text-lg"
              >
                {item.label}
              </Link>
            ))}

            <Link to="/contact" onClick={() => setIsOpen(false)} className="text-lime text-lg">
              {t('nav.contact')}
            </Link>

            <Link
              to="/admin"
              onClick={() => setIsOpen(false)}
              className="text-white/40 flex items-center gap-2 text-sm"
            >
              <Lock className="w-4 h-4" /> {t('nav.admin')}
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

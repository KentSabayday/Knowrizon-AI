import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How it Works', href: '#how-it-works' },
  { label: 'Demo', href: '#demo' },
];

export function Navbar({ onSignIn, onGetStarted }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handler, { passive: true });
    handler();
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const scrollTo = (href) => {
    const el = document.getElementById(href.replace('#', ''));
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    setMobileOpen(false);
  };

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ${
        scrolled ? 'w-[94%] max-w-5xl' : 'w-[94%] max-w-6xl'
      }`}
    >
      <div
        className={`flex items-center justify-between rounded-2xl backdrop-blur-md transition-all duration-500 ${
          scrolled
            ? 'bg-white/85 dark:bg-[#161920]/90 border border-slate-200/80 dark:border-white/[0.08] px-4 py-2.5 shadow-sm dark:shadow-lg dark:shadow-black/20'
            : 'bg-white/75 dark:bg-[#161920]/80 border border-slate-200/60 dark:border-white/[0.08] px-5 py-3.5 shadow-sm dark:shadow-none'
        }`}
      >
        {/* Logo */}
        <a href="#" className="flex items-center gap-2" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <img
            src="/logo.svg"
            alt="Knowrizon"
            className={`transition-all duration-500 ${scrolled ? 'w-7 h-7' : 'w-8 h-8'}`}
          />
          <span className={`font-bold kn-gradient-text transition-all duration-500 ${scrolled ? 'text-lg' : 'text-xl'}`}>
            Knowrizon
          </span>
        </a>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <button
              key={link.href}
              onClick={() => scrollTo(link.href)}
              className="px-3.5 py-1.5 text-sm font-medium text-slate-700 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100/70 dark:hover:bg-white/[0.05] transition-all duration-200"
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-2.5">
          {/* Theme switcher */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/[0.08] transition-all"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? (
              <Moon className="w-4 h-4 text-slate-700" />
            ) : (
              <Sun className="w-4 h-4 text-amber-300" />
            )}
          </button>

          <button
            onClick={onSignIn}
            className="text-sm font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white px-3.5 py-2 rounded-lg hover:bg-slate-100/70 dark:hover:bg-white/[0.05] transition-all duration-200"
          >
            Sign In
          </button>
          <button
            onClick={onGetStarted}
            className="text-xs font-semibold px-5 py-2.5 rounded-xl kn-btn-primary cursor-pointer"
          >
            Start Learning Free
          </button>
        </div>

        {/* Mobile controls */}
        <div className="flex md:hidden items-center gap-1">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon className="w-4 h-4 text-slate-700" /> : <Sun className="w-4 h-4 text-amber-300" />}
          </button>
          <button
            className="text-slate-700 dark:text-white p-2 -mr-1"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {mobileOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="4" y1="8" x2="20" y2="8" />
                  <line x1="4" y1="16" x2="20" y2="16" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="md:hidden mt-2 rounded-2xl border border-slate-200/90 dark:border-white/[0.08] bg-white/95 dark:bg-[#161920]/95 backdrop-blur-xl p-3 shadow-xl"
          >
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollTo(link.href)}
                className="block w-full text-left px-4 py-3 font-medium text-slate-700 hover:text-blue-600 dark:text-slate-300 dark:hover:text-white rounded-xl hover:bg-slate-100/70 dark:hover:bg-white/[0.05] transition-all text-sm"
              >
                {link.label}
              </button>
            ))}
            <div className="mt-2 pt-2 border-t border-slate-200 dark:border-white/[0.06] space-y-2">
              <button
                onClick={() => { onSignIn(); setMobileOpen(false); }}
                className="block w-full text-left text-sm font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white px-4 py-3 rounded-xl hover:bg-slate-100/70 dark:hover:bg-white/[0.05] transition-all"
              >
                Sign In
              </button>
              <button
                onClick={() => { onGetStarted(); setMobileOpen(false); }}
                className="block w-full text-xs font-semibold px-4 py-3 rounded-xl kn-btn-primary text-center cursor-pointer"
              >
                Start Learning Free
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

export default Navbar;

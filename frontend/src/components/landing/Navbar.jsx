import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How it Works', href: '#how-it-works' },
  { label: 'Demo', href: '#demo' },
];

export function Navbar({ onSignIn, onGetStarted }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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
        className={`flex items-center justify-between rounded-2xl border border-white/[0.08] backdrop-blur-xl transition-all duration-500 ${
          scrolled
            ? 'bg-[#0B1220]/80 px-4 py-2.5 shadow-lg shadow-black/20'
            : 'bg-[#0B1220]/50 px-5 py-3.5'
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
              className="px-3.5 py-1.5 text-sm text-[#94A3B8] hover:text-white rounded-lg hover:bg-white/[0.05] transition-all duration-200"
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={onSignIn}
            className="text-sm text-[#94A3B8] hover:text-white px-4 py-2 rounded-lg hover:bg-white/[0.05] transition-all duration-200"
          >
            Sign In
          </button>
          <button
            onClick={onGetStarted}
            className="text-sm font-medium text-white px-5 py-2.5 rounded-xl kn-gradient-btn"
          >
            Start Learning Free
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-white p-2 -mr-1"
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

      {/* Mobile dropdown */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="md:hidden mt-2 rounded-2xl border border-white/[0.08] bg-[#0B1220]/90 backdrop-blur-xl p-3"
          >
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollTo(link.href)}
                className="block w-full text-left px-4 py-3 text-[#94A3B8] hover:text-white rounded-xl hover:bg-white/[0.05] transition-all text-sm"
              >
                {link.label}
              </button>
            ))}
            <div className="mt-2 pt-2 border-t border-white/[0.06] space-y-2">
              <button
                onClick={() => { onSignIn(); setMobileOpen(false); }}
                className="block w-full text-left text-sm text-[#94A3B8] hover:text-white px-4 py-3 rounded-xl hover:bg-white/[0.05] transition-all"
              >
                Sign In
              </button>
              <button
                onClick={() => { onGetStarted(); setMobileOpen(false); }}
                className="block w-full text-sm font-medium text-white px-4 py-3 rounded-xl kn-gradient-btn text-center"
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

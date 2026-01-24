/**
 * Header Component
 * Ultra-modern navigation header with glassmorphism and smooth animations
 * Supports both dark (landing) and light (auth pages) themes
 */

import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import { ArrowRight, Menu, X, Sparkles } from 'lucide-react';
import clsx from 'clsx';

interface HeaderProps {
  transparent?: boolean;
  theme?: 'dark' | 'light';
}

export default function Header({ transparent = true }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Always use light theme now (site-wide light theme)
  const isLight = true;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle hash scrolling after navigation
  useEffect(() => {
    if (location.hash) {
      const element = document.querySelector(location.hash);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [location]);

  const handleNavClick = (href: string, e: React.MouseEvent) => {
    if (href.startsWith('/#')) {
      e.preventDefault();
      const hash = href.replace('/', '');
      
      if (location.pathname === '/') {
        // Already on home page, just scroll
        const element = document.querySelector(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      } else {
        // Navigate to home page with hash
        navigate('/' + hash);
      }
    }
    setMobileMenuOpen(false);
  };

  const navLinks = [
    { href: '/#features', label: 'Features' },
    { href: '/#pricing', label: 'Pricing' },
    { href: '/contact', label: 'Contact' },
    { href: '/help', label: 'Help' },
  ];

  return (
    <>
      <nav
        className={clsx(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
          isLight
            ? scrolled || !transparent
              ? 'bg-white/90 backdrop-blur-2xl shadow-lg shadow-slate-200/50 border-b border-slate-200/60'
              : 'bg-white/60 backdrop-blur-xl'
            : scrolled || !transparent
              ? 'bg-dark-900/80 backdrop-blur-2xl shadow-2xl shadow-black/20 border-b border-white/5'
              : 'bg-transparent'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-18 py-3">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className={clsx(
                  "absolute inset-0 bg-gradient-to-br from-emerald-400 to-cyan-400 rounded-2xl blur-lg transition-opacity",
                  isLight ? "opacity-30 group-hover:opacity-50" : "opacity-50 group-hover:opacity-75"
                )} />
                <img 
                  src="/logo.png" 
                  alt="BaatCheet" 
                  className={clsx(
                    "relative w-11 h-11 rounded-2xl object-cover shadow-xl transition-all",
                    isLight 
                      ? "ring-2 ring-slate-200 group-hover:ring-emerald-400/50" 
                      : "ring-2 ring-white/10 group-hover:ring-emerald-400/30"
                  )}
                />
              </div>
              <div className="flex flex-col">
                <span className={clsx(
                  "text-xl font-bold bg-clip-text text-transparent",
                  isLight 
                    ? "bg-gradient-to-r from-slate-800 via-emerald-600 to-teal-600" 
                    : "bg-gradient-to-r from-white via-emerald-200 to-cyan-200"
                )}>
                  BaatCheet
                </span>
                <span className={clsx(
                  "text-[10px] font-medium tracking-wider uppercase",
                  isLight ? "text-slate-400" : "text-slate-400"
                )}>
                  AI Assistant
                </span>
              </div>
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleNavClick(link.href, e)}
                  className={clsx(
                    "px-4 py-2 transition-all font-medium cursor-pointer rounded-xl",
                    isLight 
                      ? "text-slate-600 hover:text-slate-800 hover:bg-slate-100" 
                      : "text-slate-500 hover:text-white hover:bg-white/5"
                  )}
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* Auth Buttons */}
            <div className="hidden md:flex items-center gap-3">
              <SignedOut>
                <Link
                  to="/sign-in"
                  className={clsx(
                    "px-5 py-2.5 transition-all font-medium rounded-xl",
                    isLight 
                      ? "text-slate-600 hover:text-slate-800 hover:bg-slate-100" 
                      : "text-slate-600 hover:text-white hover:bg-white/5"
                  )}
                >
                  Sign In
                </Link>
                <Link
                  to="/sign-up"
                  className="group relative px-6 py-2.5 overflow-hidden rounded-xl font-semibold transition-all"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 bg-[length:200%_100%] animate-gradient" />
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-cyan-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="relative flex items-center gap-2 text-white">
                    <Sparkles size={16} className="animate-pulse" />
                    Get Started Free
                  </span>
                </Link>
              </SignedOut>
              <SignedIn>
                <Link
                  to="/app/chat"
                  className="group relative px-6 py-2.5 overflow-hidden rounded-xl font-semibold transition-all"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-cyan-500" />
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="relative flex items-center gap-2 text-white">
                    Open App
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </span>
                </Link>
              </SignedIn>
            </div>

            {/* Mobile Menu Button */}
            <button
              className={clsx(
                "md:hidden p-2.5 rounded-xl transition-all",
                isLight 
                  ? "text-slate-500 hover:text-slate-800 hover:bg-slate-100" 
                  : "text-slate-500 hover:text-white hover:bg-white/10"
              )}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={clsx(
            'md:hidden absolute top-full left-0 right-0 backdrop-blur-2xl border-b transition-all duration-300 overflow-hidden',
            isLight 
              ? 'bg-white/98 border-slate-200' 
              : 'bg-dark-900/98 border-white/5',
            mobileMenuOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <div className="px-4 py-4 space-y-2">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={clsx(
                  "block px-4 py-3 rounded-xl transition-all cursor-pointer font-medium",
                  isLight 
                    ? "text-slate-600 hover:text-slate-800 hover:bg-slate-100" 
                    : "text-slate-600 hover:text-white hover:bg-white/5"
                )}
                onClick={(e) => handleNavClick(link.href, e)}
              >
                {link.label}
              </a>
            ))}
            <div className={clsx(
              "pt-4 border-t space-y-2",
              isLight ? "border-slate-200" : "border-white/10"
            )}>
              <SignedOut>
                <Link
                  to="/sign-in"
                  className={clsx(
                    "block px-4 py-3 rounded-xl transition-all font-medium",
                    isLight 
                      ? "text-slate-600 hover:text-slate-800 hover:bg-slate-100" 
                      : "text-slate-600 hover:text-white hover:bg-white/5"
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  to="/sign-up"
                  className="block px-4 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-xl text-center font-semibold"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Get Started Free
                </Link>
              </SignedOut>
              <SignedIn>
                <Link
                  to="/app/chat"
                  className="block px-4 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-xl text-center font-semibold"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Open App
                </Link>
              </SignedIn>
            </div>
          </div>
        </div>
      </nav>

      {/* Gradient animation keyframes */}
      <style>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </>
  );
}

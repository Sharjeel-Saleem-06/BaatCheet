/**
 * Header Component
 * Shared navigation header for public pages
 */

import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import { ArrowRight, Menu, X } from 'lucide-react';
import clsx from 'clsx';

interface HeaderProps {
  transparent?: boolean;
}

export default function Header({ transparent = true }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
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
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          scrolled || !transparent
            ? 'bg-dark-900/95 backdrop-blur-lg shadow-lg border-b border-dark-800'
            : 'bg-transparent'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <img 
                src="/logo.jpg" 
                alt="BaatCheet" 
                className="w-10 h-10 rounded-xl shadow-lg shadow-primary-500/25 object-cover"
              />
              <span className="text-2xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
                BaatCheet
              </span>
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleNavClick(link.href, e)}
                  className="text-dark-400 hover:text-dark-100 transition-colors font-medium cursor-pointer"
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* Auth Buttons */}
            <div className="hidden md:flex items-center gap-4">
              <SignedOut>
                <Link
                  to="/sign-in"
                  className="text-dark-300 hover:text-dark-100 transition-colors font-medium"
                >
                  Sign In
                </Link>
                <Link
                  to="/sign-up"
                  className="px-5 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg shadow-primary-500/25 font-medium"
                >
                  Get Started Free
                </Link>
              </SignedOut>
              <SignedIn>
                <Link
                  to="/app/chat"
                  className="px-5 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg shadow-primary-500/25 flex items-center gap-2 font-medium"
                >
                  Open App
                  <ArrowRight size={16} />
                </Link>
              </SignedIn>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-dark-400 hover:text-dark-200"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-dark-900/95 backdrop-blur-lg border-t border-dark-800">
            <div className="px-4 py-4 space-y-3">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="block px-4 py-2 text-dark-300 hover:text-dark-100 hover:bg-dark-800 rounded-lg transition-colors cursor-pointer"
                  onClick={(e) => handleNavClick(link.href, e)}
                >
                  {link.label}
                </a>
              ))}
              <div className="pt-4 border-t border-dark-800 space-y-2">
                <SignedOut>
                  <Link
                    to="/sign-in"
                    className="block px-4 py-2 text-dark-300 hover:text-dark-100 hover:bg-dark-800 rounded-lg transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/sign-up"
                    className="block px-4 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl text-center font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Get Started Free
                  </Link>
                </SignedOut>
                <SignedIn>
                  <Link
                    to="/app/chat"
                    className="block px-4 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl text-center font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Open App
                  </Link>
                </SignedIn>
              </div>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}

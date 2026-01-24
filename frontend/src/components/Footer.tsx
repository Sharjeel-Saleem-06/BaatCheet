/**
 * Footer Component
 * Modern light theme footer with gradient accents and clean design
 */

import { Link } from 'react-router-dom';
import { Mail, Globe, Github, Linkedin, Twitter } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    product: [
      { label: 'Features', href: '/#features' },
      { label: 'Pricing', href: '/#pricing' },
      { label: 'Chat', href: '/app/chat' },
      { label: 'Projects', href: '/app/projects' },
    ],
    company: [
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
      { label: 'Help & Support', href: '/help' },
      { label: 'Privacy Policy', href: '/privacy' },
    ],
    legal: [
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Cookie Policy', href: '/cookies' },
    ],
  };

  const socialLinks = [
    { icon: Globe, href: 'https://muhammad-sharjeel-portfolio.netlify.app/', label: 'Portfolio' },
    { icon: Github, href: 'https://github.com/Sharjeel-Saleem-06', label: 'GitHub' },
    { icon: Linkedin, href: 'https://linkedin.com/in/sharjeel-saleem', label: 'LinkedIn' },
    { icon: Twitter, href: 'https://twitter.com/sharjeel_dev', label: 'Twitter' },
  ];

  return (
    <footer className="relative bg-slate-50 border-t border-slate-200">
      {/* Subtle gradient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[1px] bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-3 mb-6 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-cyan-400 rounded-xl blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
                <img 
                  src="/logo.png" 
                  alt="BaatCheet" 
                  className="relative w-11 h-11 rounded-xl object-cover ring-2 ring-slate-200"
                />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                BaatCheet
              </span>
            </Link>
            <p className="text-slate-600 mb-6 max-w-sm leading-relaxed">
              Your AI assistant that speaks your language. Chat, code, create images, and research with full Urdu, English, and Roman Urdu support.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-3 mb-6">
              <a 
                href="mailto:sharry00010@gmail.com" 
                className="flex items-center gap-3 text-slate-600 hover:text-emerald-600 transition-colors group"
              >
                <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center group-hover:border-emerald-300 group-hover:bg-emerald-50 transition-all">
                  <Mail size={16} />
                </div>
                sharry00010@gmail.com
              </a>
              <a 
                href="https://muhammad-sharjeel-portfolio.netlify.app/" 
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-slate-600 hover:text-emerald-600 transition-colors group"
              >
                <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center group-hover:border-emerald-300 group-hover:bg-emerald-50 transition-all">
                  <Globe size={16} />
                </div>
                Muhammad Sharjeel - Portfolio
              </a>
            </div>

            {/* Social Links */}
            <div className="flex gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50 transition-all"
                  title={social.label}
                >
                  <social.icon size={18} />
                </a>
              ))}
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-slate-800 font-semibold mb-5">Product</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-slate-600 hover:text-slate-800 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="text-slate-800 font-semibold mb-5">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-slate-600 hover:text-slate-800 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="text-slate-800 font-semibold mb-5">Legal</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-slate-600 hover:text-slate-800 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-slate-200">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-500 text-sm text-center md:text-left">
              © {currentYear} BaatCheet by Muhammad Sharjeel
            </p>
            <p className="text-slate-400 text-xs">
              Powered by Advanced AI
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

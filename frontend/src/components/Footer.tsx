/**
 * Footer Component
 * Shared footer for public pages with contact info and links
 */

import { Link } from 'react-router-dom';
import { Mail, Globe, Github, Linkedin, Twitter, Heart } from 'lucide-react';

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
    <footer className="bg-dark-900 border-t border-dark-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                <span className="text-white font-bold text-xl">B</span>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
                BaatCheet
              </span>
            </Link>
            <p className="text-dark-400 mb-4 max-w-sm">
              Your AI assistant that speaks your language. Chat, code, create images, and research with full Urdu, English, and Roman Urdu support.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-2 mb-4">
              <a 
                href="mailto:sharry00010@gmail.com" 
                className="flex items-center gap-2 text-dark-400 hover:text-primary-400 transition-colors"
              >
                <Mail size={16} />
                sharry00010@gmail.com
              </a>
              <a 
                href="https://muhammad-sharjeel-portfolio.netlify.app/" 
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-dark-400 hover:text-primary-400 transition-colors"
              >
                <Globe size={16} />
                Muhammad Sharjeel - Portfolio
              </a>
            </div>

            {/* Social Links */}
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl bg-dark-800 border border-dark-700 flex items-center justify-center text-dark-400 hover:text-primary-400 hover:border-primary-500/50 transition-all"
                  title={social.label}
                >
                  <social.icon size={18} />
                </a>
              ))}
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-dark-100 font-semibold mb-4">Product</h4>
            <ul className="space-y-2">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-dark-400 hover:text-primary-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="text-dark-100 font-semibold mb-4">Company</h4>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-dark-400 hover:text-primary-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="text-dark-100 font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-dark-400 hover:text-primary-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-dark-800">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-dark-500 text-sm text-center md:text-left">
              © {currentYear} BaatCheet. All rights reserved.
            </p>
            <p className="text-dark-500 text-sm flex items-center gap-1">
              Made with <Heart size={14} className="text-red-500 fill-red-500" /> by{' '}
              <a 
                href="https://muhammad-sharjeel-portfolio.netlify.app/" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-400 hover:text-primary-300 transition-colors"
              >
                Muhammad Sharjeel
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

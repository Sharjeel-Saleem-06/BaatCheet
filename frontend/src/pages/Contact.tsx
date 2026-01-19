/**
 * Contact Page
 * Professional contact form with EmailJS integration
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import emailjs from '@emailjs/browser';
import {
  Mail,
  Send,
  CheckCircle,
  AlertCircle,
  Loader2,
  Globe,
  Github,
  Linkedin,
  Twitter,
  MessageSquare,
  Clock,
  Headphones,
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import clsx from 'clsx';

interface FormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export default function Contact() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);

    try {
      // EmailJS configuration
      const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_zukq4lf';
      const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_24gtxc6';
      const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'Mq2IhyUUB3uKd1WsS';

      await emailjs.send(
        serviceId,
        templateId,
        {
          from_name: formData.name,
          from_email: formData.email,
          subject: formData.subject,
          message: formData.message,
          to_name: 'Muhammad Sharjeel',
        },
        publicKey
      );

      setSent(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
      
      // Reset after 5 seconds
      setTimeout(() => setSent(false), 5000);
    } catch (err) {
      console.error('EmailJS Error:', err);
      setError('Failed to send message. Please try again or email directly.');
    } finally {
      setSending(false);
    }
  };

  const contactInfo = [
    {
      icon: Mail,
      label: 'Email',
      value: 'sharry00010@gmail.com',
      href: 'mailto:sharry00010@gmail.com',
    },
    {
      icon: Globe,
      label: 'Portfolio',
      value: 'muhammad-sharjeel-portfolio.netlify.app',
      href: 'https://muhammad-sharjeel-portfolio.netlify.app/',
    },
    {
      icon: Clock,
      label: 'Response Time',
      value: 'Within 24 hours',
      href: null,
    },
  ];

  const socialLinks = [
    { icon: Globe, href: 'https://muhammad-sharjeel-portfolio.netlify.app/', label: 'Portfolio', color: 'hover:text-primary-400' },
    { icon: Github, href: 'https://github.com/Sharjeel-Saleem-06', label: 'GitHub', color: 'hover:text-gray-400' },
    { icon: Linkedin, href: 'https://linkedin.com/in/sharjeel-saleem', label: 'LinkedIn', color: 'hover:text-blue-400' },
    { icon: Twitter, href: 'https://twitter.com/sharjeel_dev', label: 'Twitter', color: 'hover:text-sky-400' },
  ];

  const faqItems = [
    {
      question: 'How do I get started with BaatCheet?',
      answer: 'Simply sign up for a free account and start chatting! No credit card required.',
    },
    {
      question: 'Is my data secure?',
      answer: 'Yes, we use end-to-end encryption and never share your data with third parties.',
    },
    {
      question: 'Can I use BaatCheet for my business?',
      answer: 'Absolutely! Our Enterprise plan offers custom solutions for businesses of all sizes.',
    },
  ];

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <Header transparent={false} />

      {/* Hero Section */}
      <section className="pt-24 pb-12 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-gradient-to-bl from-primary-500/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[300px] bg-gradient-to-tr from-purple-500/10 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-sm font-medium mb-6">
            <Headphones size={16} />
            <span>We're here to help</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-dark-100 mb-4">
            Get in Touch
          </h1>
          <p className="text-xl text-dark-400 max-w-2xl mx-auto">
            Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div className="bg-dark-800 rounded-2xl border border-dark-700 p-8">
              <h2 className="text-2xl font-bold text-dark-100 mb-6">Send a Message</h2>

              {sent && (
                <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3">
                  <CheckCircle className="text-green-400" size={20} />
                  <span className="text-green-400">Message sent successfully! We'll get back to you soon.</span>
                </div>
              )}

              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                  <AlertCircle className="text-red-400" size={20} />
                  <span className="text-red-400">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-2">
                      Your Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="Muhammad Sharjeel"
                      className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-dark-100 placeholder-dark-500 focus:outline-none focus:border-primary-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      placeholder="your@email.com"
                      className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-dark-100 placeholder-dark-500 focus:outline-none focus:border-primary-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                    placeholder="How can we help?"
                    className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-dark-100 placeholder-dark-500 focus:outline-none focus:border-primary-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Message
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                    rows={5}
                    placeholder="Tell us more about your inquiry..."
                    className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-dark-100 placeholder-dark-500 focus:outline-none focus:border-primary-500 transition-colors resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg shadow-primary-500/25 flex items-center justify-center gap-2 font-semibold disabled:opacity-70"
                >
                  {sending ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={20} />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Contact Info */}
            <div className="space-y-6">
              {/* Info Cards */}
              <div className="space-y-4">
                {contactInfo.map((info, i) => (
                  <div
                    key={i}
                    className="p-6 bg-dark-800 rounded-2xl border border-dark-700 flex items-center gap-4 hover:border-dark-600 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
                      <info.icon className="text-primary-400" size={24} />
                    </div>
                    <div>
                      <p className="text-dark-500 text-sm">{info.label}</p>
                      {info.href ? (
                        <a
                          href={info.href}
                          target={info.href.startsWith('http') ? '_blank' : undefined}
                          rel="noopener noreferrer"
                          className="text-dark-100 hover:text-primary-400 transition-colors font-medium"
                        >
                          {info.value}
                        </a>
                      ) : (
                        <p className="text-dark-100 font-medium">{info.value}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Social Links */}
              <div className="p-6 bg-dark-800 rounded-2xl border border-dark-700">
                <h3 className="text-lg font-semibold text-dark-100 mb-4">Connect With Me</h3>
                <div className="flex gap-3">
                  {socialLinks.map((social) => (
                    <a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={clsx(
                        'w-12 h-12 rounded-xl bg-dark-700 border border-dark-600 flex items-center justify-center text-dark-400 transition-all',
                        social.color
                      )}
                      title={social.label}
                    >
                      <social.icon size={20} />
                    </a>
                  ))}
                </div>
              </div>

              {/* Developer Info */}
              <div className="p-6 bg-gradient-to-br from-primary-500/10 to-purple-500/10 rounded-2xl border border-primary-500/20">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-2xl font-bold">
                    MS
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-dark-100">Muhammad Sharjeel</h3>
                    <p className="text-dark-400">Full Stack Developer</p>
                  </div>
                </div>
                <p className="text-dark-400 text-sm mb-4">
                  Passionate developer building innovative solutions. Check out my portfolio for more projects!
                </p>
                <a
                  href="https://muhammad-sharjeel-portfolio.netlify.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500/20 text-primary-400 rounded-lg hover:bg-primary-500/30 transition-colors text-sm font-medium"
                >
                  <Globe size={16} />
                  Visit Portfolio
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-dark-800/30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-dark-100 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-dark-400">
              Quick answers to common questions
            </p>
          </div>

          <div className="space-y-4">
            {faqItems.map((item, i) => (
              <div
                key={i}
                className="p-6 bg-dark-800 rounded-xl border border-dark-700"
              >
                <h3 className="text-lg font-semibold text-dark-100 mb-2">{item.question}</h3>
                <p className="text-dark-400">{item.answer}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              to="/help"
              className="inline-flex items-center gap-2 text-primary-400 hover:text-primary-300 transition-colors font-medium"
            >
              <MessageSquare size={18} />
              View all FAQs and Help Center
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}

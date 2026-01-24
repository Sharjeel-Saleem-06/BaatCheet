/**
 * Help & Support Page
 * Comprehensive help center with FAQs and guides - Light Theme
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  MessageSquare,
  Code,
  Image as ImageIcon,
  Mic,
  Settings,
  CreditCard,
  ChevronDown,
  ChevronRight,
  Mail,
  ExternalLink,
  Zap,
  Folder,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import clsx from 'clsx';

interface FAQItem {
  question: string;
  answer: string;
}

interface HelpCategory {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  faqs: FAQItem[];
}

export default function Help() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>('getting-started');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  const categories: Record<string, HelpCategory> = {
    'getting-started': {
      icon: Zap,
      title: 'Getting Started',
      description: 'New to BaatCheet? Start here',
      color: 'from-green-500 to-emerald-500',
      faqs: [
        {
          question: 'How do I create an account?',
          answer: 'Click the "Get Started Free" button on the home page, then sign up with your email or Google account. No credit card required for the free plan.',
        },
        {
          question: 'What can I do with BaatCheet?',
          answer: 'BaatCheet is a versatile AI assistant that can help you with: chatting in multiple languages (English, Urdu, Roman Urdu), writing and debugging code, generating images, conducting research with web search, and much more.',
        },
        {
          question: 'Is BaatCheet free to use?',
          answer: 'Yes! We offer a generous free tier with 50 messages per day, 5 image generations, and 10 voice messages. For unlimited usage, you can upgrade to our Pro plan.',
        },
        {
          question: 'Which languages are supported?',
          answer: 'BaatCheet fully supports English, Urdu (both script and Roman Urdu), Hindi, and many other languages. Our AI can understand and respond in your preferred language.',
        },
      ],
    },
    'chat': {
      icon: MessageSquare,
      title: 'Chat Features',
      description: 'Learn about chat capabilities',
      color: 'from-blue-500 to-cyan-500',
      faqs: [
        {
          question: 'How do I start a new conversation?',
          answer: 'Click the "New Chat" button in the sidebar or navigate to the Chat page. You can also use keyboard shortcut Ctrl+N (Cmd+N on Mac).',
        },
        {
          question: 'Does the AI remember our conversation?',
          answer: 'Yes! Within a conversation, the AI maintains context and remembers previous messages. You can also enable "Profile Learning" to let the AI remember facts about you across conversations.',
        },
        {
          question: 'How do I use different AI modes?',
          answer: 'Click on the mode selector in the chat sidebar to switch between modes like Chat, Code, Research, Image Generation, etc. Each mode is optimized for specific tasks.',
        },
        {
          question: 'Can I share my conversations?',
          answer: 'Yes! Click the share button on any conversation to generate a shareable link. You can set expiration times and revoke access anytime.',
        },
      ],
    },
    'code': {
      icon: Code,
      title: 'Code Assistant',
      description: 'Help with coding features',
      color: 'from-purple-500 to-pink-500',
      faqs: [
        {
          question: 'Which programming languages are supported?',
          answer: 'BaatCheet supports virtually all programming languages including Python, JavaScript, TypeScript, Java, C++, Go, Rust, Swift, Kotlin, and many more.',
        },
        {
          question: 'Can I get code execution?',
          answer: 'For security reasons, code is not executed directly. However, the AI can write, explain, and debug code, and provide step-by-step execution explanations.',
        },
        {
          question: 'How do I get the best coding help?',
          answer: 'Switch to "Code Mode" for optimized responses. Be specific about the language, framework, and what you want to achieve. Include error messages for debugging help.',
        },
      ],
    },
    'images': {
      icon: ImageIcon,
      title: 'Image Generation',
      description: 'Creating images with AI',
      color: 'from-orange-500 to-red-500',
      faqs: [
        {
          question: 'How do I generate an image?',
          answer: 'Switch to "Image Generation" mode and describe the image you want. Be detailed about style, colors, composition, and mood for best results.',
        },
        {
          question: 'What image styles are available?',
          answer: 'We support various styles including photorealistic, artistic, cartoon, anime, 3D render, sketch, and more. Specify your preferred style in your prompt.',
        },
        {
          question: 'Can I edit generated images?',
          answer: 'Currently, you can regenerate images with modified prompts. Full editing features are coming soon.',
        },
      ],
    },
    'voice': {
      icon: Mic,
      title: 'Voice Features',
      description: 'Voice input and TTS',
      color: 'from-green-500 to-teal-500',
      faqs: [
        {
          question: 'How do I use voice input?',
          answer: 'Click the microphone button next to the message input. Speak naturally - we support English, Urdu, and mixed language input.',
        },
        {
          question: 'Can the AI speak responses?',
          answer: 'Yes! Click the speaker icon on any AI message to have it read aloud. We offer multiple voices including Urdu and English options.',
        },
        {
          question: 'Which voices are available?',
          answer: 'We offer 4 curated voices: Asad and Uzma for Urdu, Guy and Jenny for English. Each voice is optimized for natural, human-like speech.',
        },
      ],
    },
    'projects': {
      icon: Folder,
      title: 'Projects & Collaboration',
      description: 'Team features and organization',
      color: 'from-pink-500 to-rose-500',
      faqs: [
        {
          question: 'What are projects?',
          answer: 'Projects let you organize conversations by topic or team. You can add custom context instructions that apply to all conversations in a project.',
        },
        {
          question: 'How do I invite team members?',
          answer: 'Open a project, click "Invite" and enter your team member\'s email. You can assign roles: Admin (full access), Moderator (can edit), or Viewer (read-only).',
        },
        {
          question: 'Can I set project-specific AI instructions?',
          answer: 'Yes! Each project can have "Context Instructions" that tell the AI how to behave for all conversations in that project. Great for consistent team responses.',
        },
      ],
    },
    'account': {
      icon: Settings,
      title: 'Account & Settings',
      description: 'Manage your account',
      color: 'from-gray-500 to-slate-500',
      faqs: [
        {
          question: 'How do I change my password?',
          answer: 'Go to Settings > Profile. Since we use Clerk for authentication, you can manage your password and security settings there.',
        },
        {
          question: 'How do I delete my account?',
          answer: 'Go to Settings > Profile and click "Delete Account". This will permanently delete all your data. This action cannot be undone.',
        },
        {
          question: 'How do I export my data?',
          answer: 'Go to Settings > Profile and click "Export Data". You\'ll receive a JSON file with all your conversations, settings, and profile information.',
        },
      ],
    },
    'billing': {
      icon: CreditCard,
      title: 'Billing & Plans',
      description: 'Subscription and payments',
      color: 'from-yellow-500 to-amber-500',
      faqs: [
        {
          question: 'How do I upgrade to Pro?',
          answer: 'Go to Settings > Usage and click "Upgrade". We accept all major credit cards and PayPal.',
        },
        {
          question: 'Can I cancel anytime?',
          answer: 'Yes! You can cancel your subscription anytime. You\'ll retain Pro access until the end of your billing period.',
        },
        {
          question: 'Do you offer refunds?',
          answer: 'We offer a 7-day money-back guarantee for new Pro subscriptions. Contact us at sharry00010@gmail.com for refund requests.',
        },
      ],
    },
  };

  const filteredCategories = Object.entries(categories).filter(([, cat]) => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      cat.title.toLowerCase().includes(search) ||
      cat.faqs.some(
        (faq) =>
          faq.question.toLowerCase().includes(search) ||
          faq.answer.toLowerCase().includes(search)
      )
    );
  });

  const quickLinks = [
    { icon: MessageSquare, label: 'Start Chatting', href: '/app/chat' },
    { icon: Folder, label: 'Create Project', href: '/app/projects' },
    { icon: Settings, label: 'Settings', href: '/app/settings' },
    { icon: Mail, label: 'Contact Support', href: '/contact' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      {/* Header */}
      <Header transparent={false} />

      {/* Hero */}
      <section className="pt-24 pb-12 relative">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-1/4 w-[500px] h-[400px] bg-gradient-to-bl from-emerald-200/40 to-transparent rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 text-sm font-medium mb-6">
            <HelpCircle size={16} />
            <span>Help Center</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4">
            How can we help you?
          </h1>
          <p className="text-xl text-slate-600 mb-8">
            Find answers to common questions and learn how to get the most out of BaatCheet.
          </p>

          {/* Search */}
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for help..."
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-colors text-lg shadow-sm"
            />
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickLinks.map((link, i) => (
              <Link
                key={i}
                to={link.href}
                className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-lg transition-all group"
              >
                <link.icon className="text-slate-400 group-hover:text-emerald-600 transition-colors" size={20} />
                <span className="text-slate-600 group-hover:text-slate-800 transition-colors font-medium">
                  {link.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Categories */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-4">
            {filteredCategories.map(([key, category]) => (
              <div
                key={key}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
              >
                {/* Category Header */}
                <button
                  onClick={() => setExpandedCategory(expandedCategory === key ? null : key)}
                  className="w-full flex items-center gap-4 p-6 text-left hover:bg-slate-50 transition-colors"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center shadow-lg`}>
                    <category.icon className="text-white" size={24} />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-slate-800">{category.title}</h2>
                    <p className="text-slate-500 text-sm">{category.description}</p>
                  </div>
                  <ChevronDown
                    className={clsx(
                      'text-slate-400 transition-transform',
                      expandedCategory === key && 'rotate-180'
                    )}
                    size={20}
                  />
                </button>

                {/* FAQs */}
                {expandedCategory === key && (
                  <div className="border-t border-slate-200 divide-y divide-slate-100">
                    {category.faqs.map((faq, i) => {
                      const faqKey = `${key}-${i}`;
                      return (
                        <div key={i}>
                          <button
                            onClick={() => setExpandedFaq(expandedFaq === faqKey ? null : faqKey)}
                            className="w-full flex items-start gap-3 p-5 text-left hover:bg-slate-50 transition-colors"
                          >
                            <ChevronRight
                              className={clsx(
                                'text-slate-400 mt-1 flex-shrink-0 transition-transform',
                                expandedFaq === faqKey && 'rotate-90'
                              )}
                              size={16}
                            />
                            <span className="text-slate-700 font-medium">{faq.question}</span>
                          </button>
                          {expandedFaq === faqKey && (
                            <div className="px-5 pb-5 pl-12">
                              <p className="text-slate-600 leading-relaxed">{faq.answer}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredCategories.length === 0 && (
            <div className="text-center py-12">
              <HelpCircle className="mx-auto text-slate-300 mb-4" size={48} />
              <p className="text-slate-600 text-lg">No results found for "{searchQuery}"</p>
              <p className="text-slate-500 mt-2">Try a different search term or browse the categories above.</p>
            </div>
          )}
        </div>
      </section>

      {/* Still need help */}
      <section className="py-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gradient-to-br from-emerald-50 to-cyan-50 rounded-2xl border border-emerald-200 p-8">
            <Sparkles className="mx-auto text-emerald-500 mb-4" size={40} />
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Still need help?</h2>
            <p className="text-slate-600 mb-6">
              Can't find what you're looking for? Our support team is here to help.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/contact"
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all font-medium flex items-center gap-2 shadow-lg shadow-emerald-500/25"
              >
                <Mail size={18} />
                Contact Support
              </Link>
              <a
                href="https://muhammad-sharjeel-portfolio.netlify.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-white text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium flex items-center gap-2 border border-slate-200"
              >
                <ExternalLink size={18} />
                Developer Portfolio
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}

/**
 * Home Page - Professional Landing Page
 * Modern, beautiful design with gradient backgrounds and animations
 */

import { Link } from 'react-router-dom';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import {
  MessageSquare,
  Zap,
  Globe,
  Sparkles,
  Code,
  Image as ImageIcon,
  Mic,
  Users,
  ArrowRight,
  Check,
  Star,
  ChevronRight,
  Languages,
  Brain,
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

// Feature cards data
const features = [
  {
    icon: MessageSquare,
    title: 'Smart Conversations',
    description: 'AI-powered chat with context awareness and memory. Your assistant remembers your preferences.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Code,
    title: 'Code Assistant',
    description: 'Write, debug, and explain code in any language. Syntax highlighting and execution support.',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: ImageIcon,
    title: 'Image Generation',
    description: 'Create stunning images from text descriptions. Multiple styles and high resolution output.',
    color: 'from-orange-500 to-red-500',
  },
  {
    icon: Mic,
    title: 'Voice Chat',
    description: 'Speak naturally with AI. Supports Urdu, English, and Roman Urdu with natural voices.',
    color: 'from-green-500 to-emerald-500',
  },
  {
    icon: Globe,
    title: 'Research Mode',
    description: 'Get comprehensive research with citations from the web. Perfect for learning.',
    color: 'from-indigo-500 to-violet-500',
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'Share projects with team members. Real-time collaboration on AI conversations.',
    color: 'from-pink-500 to-rose-500',
  },
  {
    icon: Languages,
    title: 'Multilingual Support',
    description: 'Native support for English, Urdu, Hindi, and Roman Urdu. AI that truly understands you.',
    color: 'from-cyan-500 to-blue-500',
  },
  {
    icon: Brain,
    title: 'AI Learning',
    description: 'The AI learns from your feedback and preferences. Gets smarter the more you use it.',
    color: 'from-violet-500 to-purple-500',
  },
];

// Testimonials
const testimonials = [
  {
    name: 'Ahmed Khan',
    role: 'Software Developer',
    content: 'BaatCheet has transformed how I code. The AI understands context and helps me write better code faster.',
    avatar: '👨‍💻',
    rating: 5,
  },
  {
    name: 'Fatima Ali',
    role: 'Content Creator',
    content: 'The Urdu voice support is amazing! Finally an AI that speaks my language naturally.',
    avatar: '👩‍🎨',
    rating: 5,
  },
  {
    name: 'Bilal Ahmed',
    role: 'Student',
    content: 'Research mode helped me ace my thesis. The citations and comprehensive answers are invaluable.',
    avatar: '👨‍🎓',
    rating: 5,
  },
];

// Pricing plans
const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    features: [
      '50 messages/day',
      '5 image generations/day',
      '10 voice messages/day',
      'Basic AI modes',
      'Community support',
    ],
    cta: 'Get Started',
    popular: false,
  },
  {
    name: 'Pro',
    price: '$9.99',
    period: 'month',
    features: [
      'Unlimited messages',
      '50 image generations/day',
      'Unlimited voice chat',
      'All AI modes',
      'Priority support',
      'Team collaboration',
      'Custom instructions',
    ],
    cta: 'Start Pro Trial',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: 'contact us',
    features: [
      'Everything in Pro',
      'Custom AI training',
      'API access',
      'Dedicated support',
      'SLA guarantee',
      'On-premise option',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-dark-900 overflow-hidden">
      {/* Header */}
      <Header transparent={true} />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-br from-primary-500/20 via-primary-600/10 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-gradient-to-tl from-purple-500/10 via-primary-500/5 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-1/3 left-0 w-[400px] h-[400px] bg-gradient-to-r from-cyan-500/10 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-sm font-medium mb-8">
              <Sparkles size={16} className="text-primary-400" />
              <span>Powered by Advanced AI</span>
              <ChevronRight size={14} />
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="text-dark-100">Your AI That Speaks</span>
              <br />
              <span className="bg-gradient-to-r from-primary-400 via-primary-500 to-purple-500 bg-clip-text text-transparent">
                Your Language
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-dark-400 max-w-3xl mx-auto mb-10 leading-relaxed">
              Chat, code, generate images, and research with{' '}
              <span className="text-primary-400 font-semibold">full Urdu</span> and{' '}
              <span className="text-primary-400 font-semibold">Roman Urdu</span> support.
              The most intelligent AI assistant, now in your language.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <SignedOut>
                <Link
                  to="/sign-up"
                  className="px-8 py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-2xl hover:from-primary-600 hover:to-primary-700 transition-all shadow-xl shadow-primary-500/25 flex items-center gap-2 text-lg font-semibold"
                >
                  Start Free Today
                  <ArrowRight size={20} />
                </Link>
                <Link
                  to="/sign-in"
                  className="px-8 py-4 border border-dark-700 text-dark-300 rounded-2xl hover:bg-dark-800 hover:border-dark-600 transition-all text-lg font-medium"
                >
                  Sign In
                </Link>
              </SignedOut>
              <SignedIn>
                <Link
                  to="/app/chat"
                  className="px-8 py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-2xl hover:from-primary-600 hover:to-primary-700 transition-all shadow-xl shadow-primary-500/25 flex items-center gap-2 text-lg font-semibold"
                >
                  Open BaatCheet
                  <ArrowRight size={20} />
                </Link>
              </SignedIn>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
              {[
                { value: '10K+', label: 'Active Users' },
                { value: '1M+', label: 'Messages' },
                { value: '99.9%', label: 'Uptime' },
                { value: '4.9★', label: 'Rating' },
              ].map((stat, i) => (
                <div key={i} className="p-4">
                  <p className="text-3xl md:text-4xl font-bold text-dark-100 mb-1">{stat.value}</p>
                  <p className="text-dark-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-dark-900 via-dark-800/50 to-dark-900" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-dark-100 mb-4">
              Everything You Need
            </h2>
            <p className="text-xl text-dark-400 max-w-2xl mx-auto">
              From coding to creativity, research to conversations. All in one powerful AI assistant.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <div
                key={i}
                className="group p-6 bg-dark-800/50 backdrop-blur-sm rounded-2xl border border-dark-700 hover:border-primary-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary-500/5"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                  <feature.icon className="text-white" size={28} />
                </div>
                <h3 className="text-lg font-semibold text-dark-100 mb-2">{feature.title}</h3>
                <p className="text-dark-400 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Modes Showcase */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute right-0 top-1/4 w-[500px] h-[500px] bg-gradient-to-l from-primary-500/10 to-transparent rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-medium mb-6">
                <Zap size={14} />
                AI Modes
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-dark-100 mb-6">
                One AI, Multiple Superpowers
              </h2>
              <p className="text-xl text-dark-400 mb-8 leading-relaxed">
                Switch between specialized modes for different tasks. Each mode is optimized 
                for its purpose with custom prompts and capabilities.
              </p>
              <div className="space-y-4">
                {[
                  { icon: MessageSquare, label: 'Chat Mode', desc: 'Natural conversation' },
                  { icon: Code, label: 'Code Mode', desc: 'Write & debug code' },
                  { icon: Globe, label: 'Research Mode', desc: 'Web-powered research' },
                  { icon: ImageIcon, label: 'Image Mode', desc: 'Generate visuals' },
                  { icon: Brain, label: 'Tutor Mode', desc: 'Learn anything' },
                ].map((mode, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-dark-800/50 border border-dark-700 hover:border-dark-600 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                      <mode.icon size={20} className="text-primary-400" />
                    </div>
                    <div>
                      <p className="text-dark-200 font-medium">{mode.label}</p>
                      <p className="text-dark-500 text-sm">{mode.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              {/* Mock Chat Interface */}
              <div className="bg-dark-800 rounded-2xl border border-dark-700 p-6 shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <img 
                    src="/logo.jpg" 
                    alt="BaatCheet" 
                    className="w-10 h-10 rounded-xl object-cover"
                  />
                  <div>
                    <p className="text-dark-200 font-medium">BaatCheet AI</p>
                    <p className="text-dark-500 text-sm">Code Mode Active</p>
                  </div>
                  <div className="ml-auto flex gap-1">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-dark-700 flex items-center justify-center text-sm">👤</div>
                    <div className="bg-dark-700 rounded-xl px-4 py-2 max-w-[80%]">
                      <p className="text-dark-200 text-sm">Write a React component for a button</p>
                    </div>
                  </div>
                  <div className="flex gap-3 flex-row-reverse">
                    <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center text-sm">🤖</div>
                    <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl px-4 py-3 max-w-[80%]">
                      <p className="text-dark-200 text-sm mb-2">Here's a modern React button:</p>
                      <pre className="text-xs bg-dark-900 rounded p-2 text-green-400 overflow-x-auto">
{`const Button = ({ children }) => (
  <button className="btn">
    {children}
  </button>
);`}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-dark-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-dark-100 mb-4">
              Loved by Users
            </h2>
            <p className="text-xl text-dark-400">
              See what our community says about BaatCheet
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, i) => (
              <div
                key={i}
                className="p-6 bg-dark-800 rounded-2xl border border-dark-700"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, j) => (
                    <Star key={j} size={16} className="text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-dark-300 mb-6 leading-relaxed">"{testimonial.content}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-dark-700 flex items-center justify-center text-2xl">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="text-dark-200 font-semibold">{testimonial.name}</p>
                    <p className="text-dark-500 text-sm">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-dark-100 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-dark-400">
              Start free, upgrade when you need more
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              <div
                key={i}
                className={`relative p-8 rounded-2xl border transition-all ${
                  plan.popular
                    ? 'bg-gradient-to-b from-primary-500/10 to-dark-800 border-primary-500/50 shadow-xl shadow-primary-500/10 scale-105'
                    : 'bg-dark-800 border-dark-700 hover:border-dark-600'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm font-semibold rounded-full">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-bold text-dark-100 mb-2">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-dark-100">{plan.price}</span>
                  <span className="text-dark-500">/{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-3 text-dark-300">
                      <Check size={16} className="text-primary-400" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/sign-up"
                  className={`block w-full py-3 rounded-xl text-center font-semibold transition-all ${
                    plan.popular
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 shadow-lg shadow-primary-500/25'
                      : 'bg-dark-700 text-dark-200 hover:bg-dark-600'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-600/20 via-purple-600/20 to-primary-600/20" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-dark-100 mb-6">
            Ready to Start Your AI Journey?
          </h2>
          <p className="text-xl text-dark-400 mb-10">
            Join thousands of users who are already experiencing the future of AI conversation.
          </p>
          <SignedOut>
            <Link
              to="/sign-up"
              className="inline-flex items-center gap-2 px-10 py-5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-2xl hover:from-primary-600 hover:to-primary-700 transition-all shadow-xl shadow-primary-500/25 text-lg font-semibold"
            >
              Get Started Free
              <ArrowRight size={20} />
            </Link>
          </SignedOut>
          <SignedIn>
            <Link
              to="/app/chat"
              className="inline-flex items-center gap-2 px-10 py-5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-2xl hover:from-primary-600 hover:to-primary-700 transition-all shadow-xl shadow-primary-500/25 text-lg font-semibold"
            >
              Open BaatCheet
              <ArrowRight size={20} />
            </Link>
          </SignedIn>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}

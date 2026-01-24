/**
 * Home Page - Ultra-Modern Landing Page
 * Beautiful light theme with gradients and modern design
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
  Play,
  Shield,
  Clock,
  Cpu,
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
    bgLight: 'bg-blue-50',
    textColor: 'text-blue-600',
  },
  {
    icon: Code,
    title: 'Code Assistant',
    description: 'Write, debug, and explain code in any language. Syntax highlighting and execution support.',
    color: 'from-violet-500 to-purple-500',
    bgLight: 'bg-violet-50',
    textColor: 'text-violet-600',
  },
  {
    icon: ImageIcon,
    title: 'Image Generation',
    description: 'Create stunning images from text descriptions. Multiple styles and high resolution output.',
    color: 'from-orange-500 to-rose-500',
    bgLight: 'bg-orange-50',
    textColor: 'text-orange-600',
  },
  {
    icon: Mic,
    title: 'Voice Chat',
    description: 'Speak naturally with AI. Supports Urdu, English, and Roman Urdu with natural voices.',
    color: 'from-emerald-500 to-teal-500',
    bgLight: 'bg-emerald-50',
    textColor: 'text-emerald-600',
  },
  {
    icon: Globe,
    title: 'Research Mode',
    description: 'Get comprehensive research with citations from the web. Perfect for learning.',
    color: 'from-indigo-500 to-blue-500',
    bgLight: 'bg-indigo-50',
    textColor: 'text-indigo-600',
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'Share projects with team members. Real-time collaboration on AI conversations.',
    color: 'from-pink-500 to-rose-500',
    bgLight: 'bg-pink-50',
    textColor: 'text-pink-600',
  },
  {
    icon: Languages,
    title: 'Multilingual Support',
    description: 'Native support for English, Urdu, Hindi, and Roman Urdu. AI that truly understands you.',
    color: 'from-cyan-500 to-blue-500',
    bgLight: 'bg-cyan-50',
    textColor: 'text-cyan-600',
  },
  {
    icon: Brain,
    title: 'AI Learning',
    description: 'The AI learns from your feedback and preferences. Gets smarter the more you use it.',
    color: 'from-fuchsia-500 to-purple-500',
    bgLight: 'bg-fuchsia-50',
    textColor: 'text-fuchsia-600',
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
      '2 image generations/day',
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

// Stats
const stats = [
  { value: '10K+', label: 'Active Users', icon: Users },
  { value: '1M+', label: 'Messages', icon: MessageSquare },
  { value: '99.9%', label: 'Uptime', icon: Shield },
  { value: '4.9★', label: 'Rating', icon: Star },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 overflow-hidden">
      {/* Header */}
      <Header transparent={true} theme="light" />

      {/* Hero Section */}
      <section className="relative pt-28 pb-20 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          {/* Main gradient orbs */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-br from-emerald-200/40 via-cyan-200/30 to-transparent rounded-full blur-[120px]" />
          <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-gradient-to-l from-purple-200/30 via-pink-200/20 to-transparent rounded-full blur-[100px]" />
          <div className="absolute top-1/3 left-0 w-[500px] h-[500px] bg-gradient-to-r from-blue-200/25 to-transparent rounded-full blur-[100px]" />
          
          {/* Grid pattern overlay */}
          <div 
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)`,
              backgroundSize: '64px 64px',
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-100 to-cyan-100 border border-emerald-200 text-emerald-700 text-sm font-semibold mb-8">
              <Sparkles size={16} className="text-emerald-500" />
              <span>Powered by Advanced AI</span>
              <ChevronRight size={14} />
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold mb-8 leading-[0.9] tracking-tight">
              <span className="text-slate-800">Your AI That</span>
              <br />
              <span className="text-slate-800">Speaks </span>
              <span className="relative">
                <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 bg-clip-text text-transparent">
                  Your Language
                </span>
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none">
                  <path 
                    d="M2 10C50 2 100 2 150 6C200 10 250 6 298 2" 
                    stroke="url(#underline-gradient)" 
                    strokeWidth="3" 
                    strokeLinecap="round"
                    className="animate-draw"
                  />
                  <defs>
                    <linearGradient id="underline-gradient" x1="0" y1="0" x2="300" y2="0">
                      <stop stopColor="#10b981" />
                      <stop offset="0.5" stopColor="#14b8a6" />
                      <stop offset="1" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                </svg>
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg md:text-xl lg:text-2xl text-slate-600 max-w-3xl mx-auto mb-12 leading-relaxed font-medium">
              Chat, code, generate images, and research with{' '}
              <span className="text-emerald-600 font-semibold">full Urdu</span> and{' '}
              <span className="text-teal-600 font-semibold">Roman Urdu</span> support.
              <br className="hidden md:block" />
              The most intelligent AI assistant, now in your language.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
              <SignedOut>
                <Link
                  to="/sign-up"
                  className="group relative px-10 py-5 overflow-hidden rounded-2xl font-bold text-lg transition-all hover:scale-[1.02] shadow-xl shadow-emerald-500/25 hover:shadow-2xl hover:shadow-emerald-500/30"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
                  <span className="relative flex items-center gap-3 text-white">
                    <Play size={20} className="fill-white" />
                    Start Free Today
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </span>
                </Link>
                <Link
                  to="/sign-in"
                  className="px-10 py-5 border-2 border-slate-200 text-slate-600 rounded-2xl hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800 transition-all text-lg font-semibold"
                >
                  Sign In
                </Link>
              </SignedOut>
              <SignedIn>
                <Link
                  to="/app/chat"
                  className="group relative px-10 py-5 overflow-hidden rounded-2xl font-bold text-lg transition-all hover:scale-[1.02] shadow-xl shadow-emerald-500/25 hover:shadow-2xl hover:shadow-emerald-500/30"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-cyan-500" />
                  <span className="relative flex items-center gap-3 text-white">
                    Open BaatCheet
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </span>
                </Link>
              </SignedIn>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              {stats.map((stat, i) => (
                <div 
                  key={i} 
                  className="group p-6 rounded-2xl bg-white border border-slate-200 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-500/10 transition-all"
                >
                  <stat.icon className="text-emerald-500/60 mb-3 group-hover:text-emerald-500 transition-colors" size={24} />
                  <p className="text-3xl md:text-4xl font-bold text-slate-800 mb-1">{stat.value}</p>
                  <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-50/50 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 text-sm font-medium mb-6">
              <Zap size={14} className="text-emerald-500" />
              Features
            </div>
            <h2 className="text-4xl md:text-6xl font-bold text-slate-800 mb-6">
              Everything You Need
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              From coding to creativity, research to conversations. All in one powerful AI assistant.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((feature, i) => (
              <div
                key={i}
                className="group relative p-6 rounded-3xl bg-white border border-slate-200 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 overflow-hidden"
              >
                {/* Gradient glow on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
                
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <feature.icon className="text-white" size={26} />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-3">{feature.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Modes Showcase */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute right-0 top-1/4 w-[600px] h-[600px] bg-gradient-to-l from-purple-100/50 to-transparent rounded-full blur-[100px]" />
          <div className="absolute left-0 bottom-1/4 w-[400px] h-[400px] bg-gradient-to-r from-emerald-100/50 to-transparent rounded-full blur-[100px]" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 border border-purple-200 text-purple-700 text-sm font-semibold mb-6">
                <Cpu size={14} />
                AI Modes
              </div>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-800 mb-6 leading-tight">
                One AI,<br />
                <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">Multiple Superpowers</span>
              </h2>
              <p className="text-xl text-slate-600 mb-10 leading-relaxed">
                Switch between specialized modes for different tasks. Each mode is optimized 
                for its purpose with custom prompts and capabilities.
              </p>
              <div className="space-y-3">
                {[
                  { icon: MessageSquare, label: 'Chat Mode', desc: 'Natural conversation', color: 'from-blue-500 to-cyan-500' },
                  { icon: Code, label: 'Code Mode', desc: 'Write & debug code', color: 'from-violet-500 to-purple-500' },
                  { icon: Globe, label: 'Research Mode', desc: 'Web-powered research', color: 'from-emerald-500 to-teal-500' },
                  { icon: ImageIcon, label: 'Image Mode', desc: 'Generate visuals', color: 'from-orange-500 to-rose-500' },
                  { icon: Brain, label: 'Tutor Mode', desc: 'Learn anything', color: 'from-pink-500 to-purple-500' },
                ].map((mode, i) => (
                  <div key={i} className="group flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-200 hover:shadow-lg transition-all cursor-pointer">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${mode.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                      <mode.icon size={22} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-slate-800 font-semibold">{mode.label}</p>
                      <p className="text-slate-500 text-sm">{mode.desc}</p>
                    </div>
                    <ArrowRight size={18} className="text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                  </div>
                ))}
              </div>
            </div>
            
            {/* Mock Chat Interface */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-200/30 to-cyan-200/30 rounded-3xl blur-3xl opacity-50" />
              <div className="relative bg-white rounded-3xl border border-slate-200 p-8 shadow-2xl shadow-slate-200/50">
                <div className="flex items-center gap-4 mb-8">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-cyan-400 rounded-xl blur-lg opacity-40" />
                    <img 
                      src="/logo.png" 
                      alt="BaatCheet" 
                      className="relative w-12 h-12 rounded-xl object-cover ring-2 ring-slate-200"
                    />
                  </div>
                  <div>
                    <p className="text-slate-800 font-semibold">BaatCheet AI</p>
                    <p className="text-emerald-600 text-sm flex items-center gap-1">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      Code Mode Active
                    </p>
                  </div>
                  <div className="ml-auto flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                </div>
                <div className="space-y-5">
                  <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-sm flex-shrink-0">👤</div>
                    <div className="bg-slate-100 border border-slate-200 rounded-2xl rounded-tl-sm px-5 py-3 max-w-[85%]">
                      <p className="text-slate-700 text-sm">Write a React component for a button</p>
                    </div>
                  </div>
                  <div className="flex gap-3 flex-row-reverse">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-100 to-cyan-100 border border-emerald-200 flex items-center justify-center text-sm flex-shrink-0">🤖</div>
                    <div className="bg-gradient-to-br from-emerald-50 to-cyan-50 border border-emerald-200 rounded-2xl rounded-tr-sm px-5 py-4 max-w-[85%]">
                      <p className="text-slate-700 text-sm mb-3">Here's a modern React button:</p>
                      <pre className="text-xs bg-slate-800 rounded-xl p-4 text-emerald-400 overflow-x-auto font-mono">
{`const Button = ({ children, onClick }) => (
  <button 
    onClick={onClick}
    className="px-4 py-2 rounded-lg 
      bg-emerald-500 text-white
      hover:bg-emerald-600"
  >
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
      <section className="py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-50/50 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 border border-amber-200 text-amber-700 text-sm font-medium mb-6">
              <Star size={14} className="text-amber-500 fill-amber-500" />
              Testimonials
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-6">
              Loved by Users
            </h2>
            <p className="text-xl text-slate-600">
              See what our community says about BaatCheet
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, i) => (
              <div
                key={i}
                className="p-8 rounded-3xl bg-white border border-slate-200 hover:border-amber-200 hover:shadow-xl hover:shadow-amber-500/10 transition-all"
              >
                <div className="flex gap-1 mb-6">
                  {[...Array(testimonial.rating)].map((_, j) => (
                    <Star key={j} size={18} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-slate-600 mb-8 leading-relaxed text-lg">"{testimonial.content}"</p>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-100 to-cyan-100 border border-slate-200 flex items-center justify-center text-3xl">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="text-slate-800 font-semibold">{testimonial.name}</p>
                    <p className="text-slate-500 text-sm">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-32 relative">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-emerald-100/50 via-cyan-100/30 to-transparent rounded-full blur-[150px]" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 text-sm font-medium mb-6">
              <Clock size={14} className="text-emerald-500" />
              Pricing
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-6">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-slate-600">
              Start free, upgrade when you need more
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              <div
                key={i}
                className={`relative p-8 rounded-3xl border transition-all ${
                  plan.popular
                    ? 'bg-gradient-to-b from-emerald-50 via-white to-cyan-50 border-emerald-300 shadow-2xl shadow-emerald-500/20 scale-105 z-10'
                    : 'bg-white border-slate-200 hover:border-emerald-200 hover:shadow-lg'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-1.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-bold rounded-full shadow-lg shadow-emerald-500/25">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-bold text-slate-800 mb-2">{plan.name}</h3>
                <div className="mb-8">
                  <span className="text-5xl font-bold text-slate-800">{plan.price}</span>
                  <span className="text-slate-500">/{plan.period}</span>
                </div>
                <ul className="space-y-4 mb-10">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-3 text-slate-600">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${plan.popular ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                        <Check size={12} className={plan.popular ? 'text-emerald-600' : 'text-slate-500'} />
                      </div>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/sign-up"
                  className={`block w-full py-4 rounded-2xl text-center font-bold transition-all ${
                    plan.popular
                      ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-600 hover:to-cyan-600 shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30'
                      : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 hover:border-slate-300'
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
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-20" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-8">
            Ready to Start Your
            <br />
            AI Journey?
          </h2>
          <p className="text-xl text-white/80 mb-12 max-w-2xl mx-auto">
            Join thousands of users who are already experiencing the future of AI conversation.
          </p>
          <SignedOut>
            <Link
              to="/sign-up"
              className="group inline-flex items-center gap-3 px-12 py-6 bg-white text-emerald-600 rounded-2xl hover:bg-slate-50 transition-all shadow-2xl text-lg font-bold hover:scale-[1.02]"
            >
              Get Started Free
              <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </SignedOut>
          <SignedIn>
            <Link
              to="/app/chat"
              className="group inline-flex items-center gap-3 px-12 py-6 bg-white text-emerald-600 rounded-2xl hover:bg-slate-50 transition-all shadow-2xl text-lg font-bold hover:scale-[1.02]"
            >
              Open BaatCheet
              <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </SignedIn>
        </div>
      </section>

      {/* Footer */}
      <Footer />

      {/* Global Styles */}
      <style>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          animation: gradient 3s ease infinite;
        }
        @keyframes draw {
          0% { stroke-dasharray: 0 1000; }
          100% { stroke-dasharray: 1000 0; }
        }
        .animate-draw {
          animation: draw 1.5s ease-out forwards;
          animation-delay: 0.5s;
          stroke-dasharray: 0 1000;
        }
      `}</style>
    </div>
  );
}

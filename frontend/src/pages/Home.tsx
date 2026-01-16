/**
 * Home Page - Professional Landing Page
 * Modern, beautiful design with gradient backgrounds and animations
 */

import { Link, useNavigate } from 'react-router-dom';
import { useUser, SignedIn, SignedOut } from '@clerk/clerk-react';
import {
  MessageSquare,
  Zap,
  Globe,
  Shield,
  Sparkles,
  Code,
  Image as ImageIcon,
  Mic,
  Users,
  ArrowRight,
  Check,
  Star,
  ChevronRight,
} from 'lucide-react';
import { useState, useEffect } from 'react';

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
    description: 'Create stunning images from text descriptions. Multiple styles and high resolution.',
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
];

// Testimonials
const testimonials = [
  {
    name: 'Ahmed Khan',
    role: 'Software Developer',
    content: 'BaatCheet has transformed how I code. The AI understands context and helps me write better code faster.',
    avatar: '👨‍💻',
  },
  {
    name: 'Fatima Ali',
    role: 'Content Creator',
    content: 'The Urdu voice support is amazing! Finally an AI that speaks my language naturally.',
    avatar: '👩‍🎨',
  },
  {
    name: 'Bilal Ahmed',
    role: 'Student',
    content: 'Research mode helped me ace my thesis. The citations and comprehensive answers are invaluable.',
    avatar: '👨‍🎓',
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
      '1 image generation/day',
      '10 voice messages/day',
      'Basic AI modes',
      'Community support',
    ],
    cta: 'Get Started',
    popular: false,
  },
  {
    name: 'Pro',
    price: '$9',
    period: '/month',
    features: [
      'Unlimited messages',
      '50 image generations/day',
      'Unlimited voice chat',
      'All AI modes',
      'Priority support',
      'Team collaboration',
      'API access',
    ],
    cta: 'Upgrade to Pro',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    features: [
      'Everything in Pro',
      'Custom AI training',
      'Dedicated support',
      'SLA guarantee',
      'On-premise option',
      'Custom integrations',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
];

export default function Home() {
  const { isSignedIn, user } = useUser();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-dark-900 text-dark-100">
      {/* Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-dark-900/95 backdrop-blur-lg shadow-lg' : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/25">
                <span className="text-white font-bold text-xl">B</span>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
                BaatCheet
              </span>
            </Link>

            {/* Nav Links */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-dark-400 hover:text-dark-100 transition-colors">
                Features
              </a>
              <a href="#pricing" className="text-dark-400 hover:text-dark-100 transition-colors">
                Pricing
              </a>
              <Link to="/contact" className="text-dark-400 hover:text-dark-100 transition-colors">
                Contact
              </Link>
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center gap-4">
              <SignedOut>
                <Link
                  to="/sign-in"
                  className="text-dark-300 hover:text-dark-100 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/sign-up"
                  className="px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg shadow-primary-500/25"
                >
                  Get Started Free
                </Link>
              </SignedOut>
              <SignedIn>
                <Link
                  to="/chat"
                  className="px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg shadow-primary-500/25 flex items-center gap-2"
                >
                  Open App
                  <ArrowRight size={16} />
                </Link>
              </SignedIn>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary-500/10 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary-500/20 rounded-full blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-dark-800/50 border border-dark-700 rounded-full mb-8">
            <Sparkles className="text-primary-400" size={16} />
            <span className="text-sm text-dark-300">Powered by GPT-4, Gemini & More</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="bg-gradient-to-r from-dark-100 via-dark-200 to-dark-300 bg-clip-text text-transparent">
              Your AI Assistant
            </span>
            <br />
            <span className="bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600 bg-clip-text text-transparent">
              That Speaks Your Language
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl text-dark-400 max-w-2xl mx-auto mb-10">
            Chat, code, create images, and research with AI. Full support for Urdu, English, and Roman Urdu.
            Your conversations, your way.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <SignedOut>
              <Link
                to="/sign-up"
                className="px-8 py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl text-lg font-semibold hover:from-primary-600 hover:to-primary-700 transition-all shadow-xl shadow-primary-500/25 flex items-center gap-2"
              >
                Start Free Today
                <ArrowRight size={20} />
              </Link>
              <Link
                to="/sign-in"
                className="px-8 py-4 bg-dark-800 border border-dark-700 text-dark-200 rounded-xl text-lg font-semibold hover:bg-dark-700 transition-all"
              >
                Sign In
              </Link>
            </SignedOut>
            <SignedIn>
              <Link
                to="/chat"
                className="px-8 py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl text-lg font-semibold hover:from-primary-600 hover:to-primary-700 transition-all shadow-xl shadow-primary-500/25 flex items-center gap-2"
              >
                Continue to Chat
                <ArrowRight size={20} />
              </Link>
            </SignedIn>
          </div>

          {/* Hero Image/Demo */}
          <div className="relative max-w-5xl mx-auto">
            <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-transparent to-transparent z-10" />
            <div className="bg-dark-800 rounded-2xl border border-dark-700 shadow-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-dark-900 border-b border-dark-700">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="ml-4 text-dark-500 text-sm">BaatCheet - AI Chat</span>
              </div>
              <div className="p-6 space-y-4">
                {/* Sample chat messages */}
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-400">👤</span>
                  </div>
                  <div className="bg-primary-500/10 rounded-xl p-3 max-w-md">
                    <p className="text-dark-200">Mujhe Python mein sorting algorithm explain karo</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-dark-700 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-400">🤖</span>
                  </div>
                  <div className="bg-dark-700 rounded-xl p-3 max-w-lg">
                    <p className="text-dark-200">
                      Bilkul! Python mein kai sorting algorithms hain. Sabse common Quick Sort hai:
                    </p>
                    <div className="mt-2 bg-dark-800 rounded-lg p-3 font-mono text-sm text-primary-400">
                      def quick_sort(arr):<br />
                      &nbsp;&nbsp;if len(arr) {'<='} 1: return arr<br />
                      &nbsp;&nbsp;pivot = arr[len(arr)//2]...
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-dark-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Powerful Features</h2>
            <p className="text-dark-400 text-lg max-w-2xl mx-auto">
              Everything you need to be more productive with AI assistance
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group p-6 bg-dark-800 rounded-2xl border border-dark-700 hover:border-primary-500/50 transition-all hover:shadow-xl hover:shadow-primary-500/5"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="text-white" size={24} />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-dark-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Loved by Users</h2>
            <p className="text-dark-400 text-lg">See what our community says about BaatCheet</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="p-6 bg-dark-800 rounded-2xl border border-dark-700"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="text-yellow-500 fill-yellow-500" size={16} />
                  ))}
                </div>
                <p className="text-dark-300 mb-4">"{testimonial.content}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-dark-700 flex items-center justify-center text-xl">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-dark-500 text-sm">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-dark-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Simple Pricing</h2>
            <p className="text-dark-400 text-lg">Start free, upgrade when you need more</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`relative p-6 rounded-2xl border ${
                  plan.popular
                    ? 'bg-gradient-to-b from-primary-500/10 to-dark-800 border-primary-500/50'
                    : 'bg-dark-800 border-dark-700'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary-500 text-white text-sm font-semibold rounded-full">
                    Most Popular
                  </div>
                )}
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-dark-500">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-dark-300">
                      <Check className="text-primary-400" size={16} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  className={`w-full py-3 rounded-xl font-semibold transition-all ${
                    plan.popular
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700'
                      : 'bg-dark-700 text-dark-200 hover:bg-dark-600'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-dark-400 text-lg mb-8">
            Join thousands of users who are already using BaatCheet to be more productive.
          </p>
          <SignedOut>
            <Link
              to="/sign-up"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl text-lg font-semibold hover:from-primary-600 hover:to-primary-700 transition-all shadow-xl shadow-primary-500/25"
            >
              Create Free Account
              <ArrowRight size={20} />
            </Link>
          </SignedOut>
          <SignedIn>
            <Link
              to="/chat"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl text-lg font-semibold hover:from-primary-600 hover:to-primary-700 transition-all shadow-xl shadow-primary-500/25"
            >
              Open BaatCheet
              <ArrowRight size={20} />
            </Link>
          </SignedIn>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-dark-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                  <span className="text-white font-bold">B</span>
                </div>
                <span className="text-xl font-bold">BaatCheet</span>
              </div>
              <p className="text-dark-500 text-sm">
                Your AI assistant that speaks your language.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-dark-400">
                <li><a href="#features" className="hover:text-dark-200 transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-dark-200 transition-colors">Pricing</a></li>
                <li><Link to="/chat" className="hover:text-dark-200 transition-colors">Chat</Link></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-dark-400">
                <li><Link to="/contact" className="hover:text-dark-200 transition-colors">Contact</Link></li>
                <li><a href="#" className="hover:text-dark-200 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-dark-200 transition-colors">Terms of Service</a></li>
              </ul>
            </div>

            {/* Connect */}
            <div>
              <h4 className="font-semibold mb-4">Connect</h4>
              <ul className="space-y-2 text-dark-400">
                <li><a href="#" className="hover:text-dark-200 transition-colors">Twitter</a></li>
                <li><a href="#" className="hover:text-dark-200 transition-colors">GitHub</a></li>
                <li><a href="#" className="hover:text-dark-200 transition-colors">Discord</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-dark-700 text-center text-dark-500 text-sm">
            © {new Date().getFullYear()} BaatCheet. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

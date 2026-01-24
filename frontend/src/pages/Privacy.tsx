/**
 * Privacy Policy Page
 * Legal privacy policy for BaatCheet - Light Theme
 */

import { Link } from 'react-router-dom';
import { Shield, Lock, Eye, Database, UserCheck, Bell, Globe, Mail } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function Privacy() {
  const lastUpdated = 'January 15, 2026';

  const sections = [
    {
      icon: Database,
      title: 'Information We Collect',
      content: `We collect information you provide directly to us, such as when you create an account, use our services, or contact us for support.

**Account Information:** Name, email address, password, and profile information.

**Chat Data:** Your conversations with our AI, including messages, uploaded files, and generated content.

**Usage Data:** How you interact with our services, including features used, time spent, and preferences.

**Device Information:** Browser type, operating system, device identifiers, and IP address.`,
    },
    {
      icon: Eye,
      title: 'How We Use Your Information',
      content: `We use the information we collect to:

• Provide, maintain, and improve our services
• Process your requests and transactions
• Send you technical notices and support messages
• Respond to your comments and questions
• Personalize your experience and AI responses
• Analyze usage patterns to improve our services
• Protect against fraudulent or unauthorized access`,
    },
    {
      icon: Lock,
      title: 'Data Security',
      content: `We take the security of your data seriously and implement appropriate technical and organizational measures:

• **Encryption:** All data is encrypted in transit (TLS 1.3) and at rest (AES-256)
• **Access Controls:** Strict access controls and authentication for all systems
• **Regular Audits:** Periodic security assessments and penetration testing
• **Secure Infrastructure:** Hosted on enterprise-grade cloud infrastructure
• **Incident Response:** Established procedures for handling security incidents`,
    },
    {
      icon: UserCheck,
      title: 'Your Rights',
      content: `You have the following rights regarding your personal data:

• **Access:** Request a copy of your personal data
• **Correction:** Update or correct inaccurate information
• **Deletion:** Request deletion of your account and data
• **Portability:** Export your data in a machine-readable format
• **Objection:** Opt-out of certain processing activities
• **Restriction:** Limit how we use your data

To exercise these rights, please contact us at sharry00010@gmail.com`,
    },
    {
      icon: Globe,
      title: 'Data Retention',
      content: `We retain your information for as long as your account is active or as needed to provide services:

• **Account Data:** Retained until account deletion
• **Chat History:** Retained for 1 year unless manually deleted
• **Analytics Data:** Aggregated and anonymized after 90 days
• **Backup Data:** Retained for 30 days after deletion

You can delete your account and all associated data at any time from the Settings page.`,
    },
    {
      icon: Bell,
      title: 'Third-Party Services',
      content: `We use the following third-party services:

• **Clerk:** Authentication and user management
• **OpenAI/Groq:** AI language processing
• **Cloudinary:** Image storage and processing
• **Neon:** Database hosting
• **Vercel/Netlify:** Web hosting

Each service has its own privacy policy. We ensure all partners meet our data protection standards.`,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      {/* Header */}
      <Header transparent={false} />

      {/* Hero */}
      <section className="pt-24 pb-12 relative">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-[400px] h-[300px] bg-gradient-to-br from-emerald-200/40 to-transparent rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 text-sm font-medium mb-6">
            <Shield size={16} />
            <span>Your Privacy Matters</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4">
            Privacy Policy
          </h1>
          <p className="text-xl text-slate-600 mb-4">
            We're committed to protecting your privacy and being transparent about our data practices.
          </p>
          <p className="text-slate-500">
            Last updated: {lastUpdated}
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Introduction */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8 mb-8 shadow-sm">
            <p className="text-slate-600 leading-relaxed">
              This Privacy Policy describes how BaatCheet ("we", "our", or "us") collects, uses, and shares 
              information about you when you use our AI chat application and related services. By using 
              BaatCheet, you agree to the collection and use of information in accordance with this policy.
            </p>
          </div>

          {/* Sections */}
          <div className="space-y-6">
            {sections.map((section, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <section.icon className="text-emerald-600" size={20} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800">{section.title}</h2>
                </div>
                <div className="text-slate-600 leading-relaxed whitespace-pre-line">
                  {section.content}
                </div>
              </div>
            ))}
          </div>

          {/* Contact */}
          <div className="mt-8 bg-gradient-to-br from-emerald-50 to-cyan-50 rounded-2xl border border-emerald-200 p-8 text-center">
            <Mail className="text-emerald-500 mx-auto mb-4" size={32} />
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Questions?</h2>
            <p className="text-slate-600 mb-4">
              If you have any questions about this Privacy Policy, please contact us.
            </p>
            <a
              href="mailto:sharry00010@gmail.com"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all font-medium shadow-lg shadow-emerald-500/25"
            >
              <Mail size={18} />
              sharry00010@gmail.com
            </a>
          </div>

          {/* Related Links */}
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              to="/terms"
              className="px-4 py-2 bg-white text-slate-600 rounded-lg hover:bg-slate-50 hover:text-slate-800 transition-colors border border-slate-200"
            >
              Terms of Service
            </Link>
            <Link
              to="/help"
              className="px-4 py-2 bg-white text-slate-600 rounded-lg hover:bg-slate-50 hover:text-slate-800 transition-colors border border-slate-200"
            >
              Help Center
            </Link>
            <Link
              to="/contact"
              className="px-4 py-2 bg-white text-slate-600 rounded-lg hover:bg-slate-50 hover:text-slate-800 transition-colors border border-slate-200"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}

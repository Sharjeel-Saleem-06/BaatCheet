/**
 * Privacy Policy Page
 * Legal privacy policy for BaatCheet
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
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <Header transparent={false} />

      {/* Hero */}
      <section className="pt-24 pb-12 relative">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-[400px] h-[300px] bg-gradient-to-br from-primary-500/10 to-transparent rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-sm font-medium mb-6">
            <Shield size={16} />
            <span>Your Privacy Matters</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-dark-100 mb-4">
            Privacy Policy
          </h1>
          <p className="text-xl text-dark-400 mb-4">
            We're committed to protecting your privacy and being transparent about our data practices.
          </p>
          <p className="text-dark-500">
            Last updated: {lastUpdated}
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Introduction */}
          <div className="bg-dark-800 rounded-2xl border border-dark-700 p-8 mb-8">
            <p className="text-dark-300 leading-relaxed">
              This Privacy Policy describes how BaatCheet ("we", "our", or "us") collects, uses, and shares 
              information about you when you use our AI chat application and related services. By using 
              BaatCheet, you agree to the collection and use of information in accordance with this policy.
            </p>
          </div>

          {/* Sections */}
          <div className="space-y-6">
            {sections.map((section, i) => (
              <div key={i} className="bg-dark-800 rounded-2xl border border-dark-700 p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
                    <section.icon className="text-primary-400" size={20} />
                  </div>
                  <h2 className="text-xl font-bold text-dark-100">{section.title}</h2>
                </div>
                <div className="text-dark-300 leading-relaxed whitespace-pre-line">
                  {section.content}
                </div>
              </div>
            ))}
          </div>

          {/* Contact */}
          <div className="mt-8 bg-gradient-to-br from-primary-500/10 to-purple-500/10 rounded-2xl border border-primary-500/20 p-8 text-center">
            <Mail className="text-primary-400 mx-auto mb-4" size={32} />
            <h2 className="text-2xl font-bold text-dark-100 mb-2">Questions?</h2>
            <p className="text-dark-400 mb-4">
              If you have any questions about this Privacy Policy, please contact us.
            </p>
            <a
              href="mailto:sharry00010@gmail.com"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all font-medium"
            >
              <Mail size={18} />
              sharry00010@gmail.com
            </a>
          </div>

          {/* Related Links */}
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              to="/terms"
              className="px-4 py-2 bg-dark-800 text-dark-300 rounded-lg hover:bg-dark-700 hover:text-dark-100 transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              to="/help"
              className="px-4 py-2 bg-dark-800 text-dark-300 rounded-lg hover:bg-dark-700 hover:text-dark-100 transition-colors"
            >
              Help Center
            </Link>
            <Link
              to="/contact"
              className="px-4 py-2 bg-dark-800 text-dark-300 rounded-lg hover:bg-dark-700 hover:text-dark-100 transition-colors"
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

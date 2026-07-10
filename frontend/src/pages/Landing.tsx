import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Share2, Eye, LineChart, Shield, Lock, 
  ChevronDown, CheckCircle, Smartphone, 
  Settings2, Play 
} from 'lucide-react';

export const Landing: React.FC = () => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const faqs = [
    {
      q: 'What is Failoi?',
      a: 'Failoi is an online platform that converts PDF documents into interactive HTML5 flipbooks.'
    },
    {
      q: 'Can I upload any PDF?',
      a: 'Yes. Upload brochures, magazines, catalogs, reports, presentations, menus, portfolios, and more.'
    },
    {
      q: 'Can I embed my flipbook?',
      a: 'Yes. Every publication includes responsive iframe embed code.'
    },
    {
      q: 'Can I password protect my flipbook?',
      a: 'Yes. Protect publications using passwords, private links, expiration dates, and download restrictions.'
    },
    {
      q: 'Can I track readers?',
      a: 'Yes. Built-in analytics show views, reading time, visitor devices, countries, and engagement.'
    }
  ];

  const features = [
    { title: 'Interactive Flipbooks', desc: 'Optimized page-turning effects that respond to touch, keyboard, and click.' },
    { title: 'Instant Sharing', desc: 'Get public links, social share triggers, and email formats instantly.' },
    { title: 'Responsive Embed Code', desc: 'Secure iframe embeds that scale automatically on any webpage.' },
    { title: 'QR Code Generation', desc: 'Downloadable high-resolution QR codes to bridge print and digital media.' },
    { title: 'Analytics Dashboard', desc: 'Monitor reader engagement, reading durations, and traffic referrers.' },
    { title: 'Privacy Controls', desc: 'Restrict reading lists, password-protect folders, and set calendar expiration dates.' }
  ];

  const useCases = [
    'Company Profiles', 'Product Catalogs', 'Brochures', 'Magazines',
    'Portfolios', 'Restaurant Menus', 'Books', 'School Magazines',
    'Reports', 'Real Estate Catalogs', 'Sales Presentations', 'Business Proposals'
  ];

  return (
    <div style={styles.container}>
      {/* Navbar */}
      <nav style={styles.navbar}>
        <div style={styles.navLogo}>
          <div style={styles.logoCircle}>F</div>
          <span style={styles.logoText}>FAILOI</span>
        </div>
        <div style={styles.navLinks}>
          <Link to="/login" className="glass-btn glass-btn-secondary" style={styles.navBtn}>Sign In</Link>
          <Link to="/register" className="glass-btn glass-btn-primary" style={styles.navBtn}>Start Free</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header style={styles.hero}>
        <div style={styles.badgeRow}>
          <span style={styles.heroBadge}>Interactive PDF Publishing Platform</span>
        </div>
        <h1 style={styles.heroTitle} className="text-gradient">
          Turn PDFs Into Beautiful <br />
          <span style={{ color: 'var(--primary)' }}>Interactive Flipbooks</span>
        </h1>
        <p style={styles.heroSubtitle}>
          Create engaging digital publications from your PDF files in seconds. Upload, publish, share with a link, embed anywhere, and track reader engagement—all from one powerful platform.
        </p>
        <div style={styles.ctaRow}>
          <Link to="/register" className="glass-btn glass-btn-primary" style={styles.ctaBtnPrimary}>
            Start Free
          </Link>
          <a href="#how-it-works" className="glass-btn glass-btn-secondary" style={styles.ctaBtnSecondary}>
            <Play size={16} style={{ marginRight: '6px' }} />
            Watch Demo
          </a>
        </div>

        {/* Custom Flipbook Animated Preview */}
        <div style={styles.previewContainer} className="glass-card">
          <div style={styles.bookMockup}>
            <div style={styles.leftPage}>
              <h3 style={styles.pageTitle}>Interactive HTML5 Reader</h3>
              <p style={styles.pageText}>Experience natural page-turn effects right in the browser.</p>
              <div style={styles.dummyChart}></div>
            </div>
            <div style={styles.pageSpine}></div>
            <div style={styles.rightPage}>
              <h3 style={styles.pageTitle}>Realtime Tracking</h3>
              <p style={styles.pageText}>Understand visitor behavior, countries, zoom events, and read time.</p>
              <div style={styles.dummyMetrics}>
                <div style={styles.metricItem}></div>
                <div style={styles.metricItem}></div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Section: How It Works */}
      <section id="how-it-works" style={styles.section}>
        <h2 style={styles.sectionTitle}>Publish Your Flipbook in 4 Simple Steps</h2>
        <div style={styles.stepsGrid}>
          <div className="glass-card" style={styles.stepCard}>
            <div style={styles.stepNumber}>1</div>
            <h3 style={styles.stepTitle}>Upload Your PDF</h3>
            <p style={styles.stepDesc}>Drag and drop any PDF document. Failoi securely uploads and prepares your file for processing.</p>
          </div>
          <div className="glass-card" style={styles.stepCard}>
            <div style={styles.stepNumber}>2</div>
            <h3 style={styles.stepTitle}>Convert Automatically</h3>
            <p style={styles.stepDesc}>Your PDF is transformed into a responsive HTML5 flipbook with realistic page-turning effects optimized for every device.</p>
          </div>
          <div className="glass-card" style={styles.stepCard}>
            <div style={styles.stepNumber}>3</div>
            <h3 style={styles.stepTitle}>Share Anywhere</h3>
            <p style={styles.stepDesc}>Generate a public link, iframe embed code, QR code, and social sharing links instantly.</p>
          </div>
          <div className="glass-card" style={styles.stepCard}>
            <div style={styles.stepNumber}>4</div>
            <h3 style={styles.stepTitle}>Track Engagement</h3>
            <p style={styles.stepDesc}>Monitor views, reading time, visitor devices, countries, and reader engagement using built-in analytics.</p>
          </div>
        </div>
      </section>

      {/* Section: Features */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Everything You Need to Publish Smarter</h2>
        <div style={styles.featuresGrid}>
          {features.map((feat, idx) => (
            <div key={idx} className="glass-card" style={styles.featureCard}>
              {idx === 0 && <Smartphone style={styles.featureIcon} size={28} />}
              {idx === 1 && <Share2 style={styles.featureIcon} size={28} />}
              {idx === 2 && <Eye style={styles.featureIcon} size={28} />}
              {idx === 3 && <Settings2 style={styles.featureIcon} size={28} />}
              {idx === 4 && <LineChart style={styles.featureIcon} size={28} />}
              {idx === 5 && <Shield style={styles.featureIcon} size={28} />}
              <h3 style={styles.featureTitle}>{feat.title}</h3>
              <p style={styles.featureDesc}>{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section: Why Failoi */}
      <section style={styles.whySection}>
        <div style={styles.whyGrid}>
          <div style={styles.whyTextCol}>
            <h2 style={{ ...styles.sectionTitle, textAlign: 'left', marginBottom: '20px' }}>Why Choose Failoi?</h2>
            <p style={styles.whyText}>
              Unlike traditional PDF files, Failoi transforms documents into interactive digital experiences that are easier to present, share, and read.
            </p>
            <p style={styles.whyText}>
              Whether you're publishing a company profile, brochure, product catalog, magazine, menu, annual report, portfolio, or presentation, Failoi helps you deliver it professionally.
            </p>
          </div>
          <div style={styles.whyStatsCol}>
            <div className="glass-card" style={styles.whyStatCard}>
              <div style={styles.whyStatHeader}>
                <Share2 size={20} style={{ color: '#00d2ff' }} />
                <span>Share Without Limits</span>
              </div>
              <p style={styles.whyStatDesc}>Every flipbook automatically includes a Public Share Link, Responsive Embed Code, QR Code, Facebook, LinkedIn, WhatsApp, Telegram, and Email sharing triggers.</p>
            </div>
            <div className="glass-card" style={styles.whyStatCard}>
              <div style={styles.whyStatHeader}>
                <LineChart size={20} style={{ color: '#10b981' }} />
                <span>Powerful Reader Analytics</span>
              </div>
              <p style={styles.whyStatDesc}>Track total views, unique visitors, reading time, completion rates, countries, devices, browsers, downloads, and shares from a clean unified report.</p>
            </div>
            <div className="glass-card" style={styles.whyStatCard}>
              <div style={styles.whyStatHeader}>
                <Lock size={20} style={{ color: '#a855f7' }} />
                <span>Built With Privacy In Mind</span>
              </div>
              <p style={styles.whyStatDesc}>Protect publications with passwords, hide from public indexing, configure expiration dates, disable prints/downloads, and enforce domain restrict gates.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section: Use Cases */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Perfect For Any Publication</h2>
        <div style={styles.useCasesGrid}>
          {useCases.map((useCase, idx) => (
            <div key={idx} className="glass-card" style={styles.useCaseCard}>
              <CheckCircle size={16} style={{ color: 'var(--primary)' }} />
              <span>{useCase}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Section: FAQ */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Frequently Asked Questions</h2>
        <div style={styles.faqList}>
          {faqs.map((faq, idx) => (
            <div 
              key={idx} 
              className="glass-card" 
              style={styles.faqItem}
              onClick={() => toggleFaq(idx)}
            >
              <div style={styles.faqHeader}>
                <h3 style={styles.faqQuestion}>{faq.q}</h3>
                <ChevronDown 
                  size={18} 
                  style={{ 
                    transform: activeFaq === idx ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'all 0.3s'
                  }} 
                />
              </div>
              {activeFaq === idx && (
                <p style={styles.faqAnswer}>{faq.a}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Section: Final CTA */}
      <section style={styles.ctaSection}>
        <div className="glass-card" style={styles.ctaCard}>
          <h2 style={styles.ctaTitle}>Ready to Bring Your PDFs to Life?</h2>
          <p style={styles.ctaDesc}>
            Create interactive flipbooks that are easy to share, embed, and track—all in just a few clicks.
          </p>
          <div style={styles.ctaButtons}>
            <Link to="/register" className="glass-btn glass-btn-primary" style={styles.ctaBtnPrimary}>
              Get Started Free
            </Link>
            <Link to="/login" className="glass-btn glass-btn-secondary" style={styles.ctaBtnSecondary}>
              Explore Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerGrid}>
          <div style={styles.footerBrandCol}>
            <h3 style={styles.footerBrandName}>FAILOI</h3>
            <p style={styles.footerBrandTagline}>Turn PDFs Into Interactive Experiences.</p>
          </div>
          <div style={styles.footerLinksGrid}>
            <div>
              <h4 style={styles.footerHeader}>Product</h4>
              <ul style={styles.footerList}>
                <li>Features</li>
                <li>Pricing</li>
                <li>API</li>
                <li>Integrations</li>
              </ul>
            </div>
            <div>
              <h4 style={styles.footerHeader}>Resources</h4>
              <ul style={styles.footerList}>
                <li>Help Center</li>
                <li>Documentation</li>
                <li>Blog</li>
                <li>Tutorials</li>
              </ul>
            </div>
            <div>
              <h4 style={styles.footerHeader}>Company</h4>
              <ul style={styles.footerList}>
                <li>About</li>
                <li>Contact</li>
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
              </ul>
            </div>
          </div>
        </div>
        <div style={styles.footerBottom}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
            &copy; 2026 FAILOI Publishing Platform SaaS. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: 'var(--bg-darker)',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  navbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px clamp(16px, 4vw, 48px)',
    borderBottom: '1px solid var(--border-color)',
    background: 'rgba(6, 9, 19, 0.8)',
    backdropFilter: 'blur(10px)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxSizing: 'border-box',
    width: '100%',
  },
  navLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  logoCircle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--primary) 0%, #00d2ff 100%)',
    fontWeight: 'bold',
    color: '#ffffff',
  },
  logoText: {
    fontFamily: 'var(--font-display)',
    fontWeight: 'bold',
    fontSize: '20px',
    color: '#ffffff',
    letterSpacing: '0.05em',
  },
  navLinks: {
    display: 'flex',
    gap: '12px',
  },
  navBtn: {
    padding: '8px 16px',
    fontSize: '0.85rem',
  },
  hero: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 'calc(100vh - 73px)',
    padding: '40px clamp(16px, 4vw, 24px)',
    textAlign: 'center',
    boxSizing: 'border-box',
    width: '100%',
  },
  badgeRow: {
    marginBottom: '16px',
  },
  heroBadge: {
    backgroundColor: 'rgba(0, 102, 255, 0.1)',
    color: 'var(--primary-light)',
    border: '1px solid rgba(0, 102, 255, 0.2)',
    padding: '6px 16px',
    borderRadius: '20px',
    fontSize: 'clamp(0.7rem, 1.5vw, 0.8rem)',
    fontWeight: '600',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 'clamp(2rem, 5.5vw, 3.5rem)',
    lineHeight: '1.2',
    marginBottom: '20px',
    maxWidth: '900px',
    width: '100%',
    boxSizing: 'border-box',
    padding: '0 16px',
  },
  heroSubtitle: {
    color: 'var(--text-secondary)',
    maxWidth: '720px',
    fontSize: 'clamp(0.95rem, 2.2vw, 1.15rem)',
    lineHeight: '1.6',
    marginBottom: '32px',
    width: '100%',
    boxSizing: 'border-box',
    padding: '0 16px',
  },
  ctaRow: {
    display: 'flex',
    gap: '16px',
    marginBottom: '48px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  ctaBtnPrimary: {
    padding: '14px 28px',
    fontSize: '1rem',
    borderRadius: 'var(--radius-sm)',
  },
  ctaBtnSecondary: {
    padding: '14px 28px',
    fontSize: '1rem',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    alignItems: 'center',
  },
  previewContainer: {
    width: '100%',
    maxWidth: '840px',
    height: 'auto',
    aspectRatio: '16 / 9',
    padding: 'clamp(12px, 3vw, 24px)',
    background: 'rgba(13, 20, 38, 0.4)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 'var(--radius-lg)',
    boxSizing: 'border-box',
    margin: '0 auto',
  },
  bookMockup: {
    display: 'flex',
    width: '100%',
    height: '100%',
    background: '#131929',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
    position: 'relative',
    overflow: 'hidden',
  },
  leftPage: {
    flex: 1,
    padding: 'clamp(12px, 3vw, 32px)',
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'left',
    borderRight: '1px solid rgba(255,255,255,0.02)',
    overflow: 'hidden',
  },
  rightPage: {
    flex: 1,
    padding: 'clamp(12px, 3vw, 32px)',
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'left',
    overflow: 'hidden',
  },
  pageSpine: {
    width: '12px',
    height: '100%',
    background: 'linear-gradient(90deg, rgba(0,0,0,0.3) 0%, rgba(255,255,255,0.05) 50%, rgba(0,0,0,0.3) 100%)',
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 20,
  },
  pageTitle: {
    fontSize: '1.25rem',
    marginBottom: '8px',
  },
  pageText: {
    color: 'var(--text-secondary)',
    fontSize: '0.85rem',
    marginBottom: '20px',
    lineHeight: '1.4',
  },
  dummyChart: {
    flex: 1,
    borderRadius: '6px',
    background: 'linear-gradient(180deg, rgba(0, 102, 255, 0.15) 0%, transparent 100%)',
    border: '1px dashed rgba(0,102,255,0.2)',
  },
  dummyMetrics: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  metricItem: {
    height: '40%',
    borderRadius: '6px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.04)',
  },
  section: {
    padding: '80px 48px',
    borderTop: '1px solid var(--border-color)',
    background: 'rgba(6,9,19,0.2)',
  },
  sectionTitle: {
    textAlign: 'center',
    fontSize: '2.2rem',
    marginBottom: '56px',
    color: '#ffffff',
  },
  stepsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '32px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  stepCard: {
    padding: '36px 28px',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    background: 'rgba(255,255,255,0.01)',
  },
  stepNumber: {
    position: 'absolute',
    top: '20px',
    right: '24px',
    fontSize: '2.5rem',
    fontWeight: 'bold',
    color: 'rgba(0, 102, 255, 0.1)',
  },
  stepTitle: {
    fontSize: '1.25rem',
    marginBottom: '12px',
    color: '#ffffff',
  },
  stepDesc: {
    color: 'var(--text-secondary)',
    fontSize: '0.9rem',
    lineHeight: '1.6',
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '32px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  featureCard: {
    padding: '36px',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    background: 'rgba(255,255,255,0.01)',
  },
  featureIcon: {
    color: 'var(--primary)',
    marginBottom: '4px',
  },
  featureTitle: {
    fontSize: '1.3rem',
    color: '#ffffff',
  },
  featureDesc: {
    color: 'var(--text-secondary)',
    fontSize: '0.9rem',
    lineHeight: '1.55',
  },
  whySection: {
    padding: '100px 48px',
    background: 'rgba(6,9,19,0.3)',
    borderTop: '1px solid var(--border-color)',
  },
  whyGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '40px',
    maxWidth: '1200px',
    margin: '0 auto',
    alignItems: 'center',
  },
  whyTextCol: {
    flex: '1 1 450px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    boxSizing: 'border-box',
  },
  whyText: {
    color: 'var(--text-secondary)',
    fontSize: '1.15rem',
    lineHeight: '1.65',
    margin: 0,
  },
  whyStatsCol: {
    flex: '1 1 450px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    boxSizing: 'border-box',
  },
  whyStatCard: {
    padding: '24px',
    background: 'rgba(255,255,255,0.01)',
  },
  whyStatHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontWeight: 'bold',
    fontSize: '1.05rem',
    marginBottom: '10px',
    color: '#ffffff',
  },
  whyStatDesc: {
    color: 'var(--text-secondary)',
    fontSize: '0.85rem',
    lineHeight: '1.5',
    margin: 0,
  },
  useCasesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  useCaseCard: {
    padding: '20px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '0.95rem',
    color: '#ffffff',
    background: 'rgba(255,255,255,0.01)',
  },
  faqList: {
    maxWidth: '800px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  faqItem: {
    padding: '24px',
    cursor: 'pointer',
    background: 'rgba(255,255,255,0.01)',
    transition: 'all 0.3s',
  },
  faqHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: '1.1rem',
    margin: 0,
    color: '#ffffff',
  },
  faqAnswer: {
    marginTop: '16px',
    color: 'var(--text-secondary)',
    fontSize: '0.9rem',
    lineHeight: '1.6',
    margin: '16px 0 0 0',
  },
  ctaSection: {
    padding: '100px 48px',
    borderTop: '1px solid var(--border-color)',
    background: 'rgba(6,9,19,0.2)',
  },
  ctaCard: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '64px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '24px',
    background: 'linear-gradient(135deg, rgba(0, 102, 255, 0.08) 0%, transparent 100%)',
  },
  ctaTitle: {
    fontSize: '2.5rem',
    margin: 0,
    color: '#ffffff',
  },
  ctaDesc: {
    color: 'var(--text-secondary)',
    fontSize: '1.15rem',
    maxWidth: '600px',
    margin: 0,
    lineHeight: '1.6',
  },
  ctaButtons: {
    display: 'flex',
    gap: '16px',
    marginTop: '12px',
  },
  footer: {
    borderTop: '1px solid var(--border-color)',
    background: 'rgba(6,9,19,0.5)',
    padding: '64px 48px 24px 48px',
  },
  footerGrid: {
    display: 'flex',
    justifyContent: 'space-between',
    maxWidth: '1200px',
    margin: '0 auto 48px auto',
    flexWrap: 'wrap',
    gap: '48px',
  },
  footerBrandCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxWidth: '300px',
  },
  footerBrandName: {
    fontSize: '1.4rem',
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: '0.05em',
    margin: 0,
  },
  footerBrandTagline: {
    color: 'var(--text-secondary)',
    fontSize: '0.9rem',
    lineHeight: '1.5',
    margin: 0,
  },
  footerLinksGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '64px',
  },
  footerHeader: {
    fontSize: '0.95rem',
    color: '#ffffff',
    marginBottom: '20px',
    fontWeight: 'bold',
  },
  footerList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    color: 'var(--text-secondary)',
    fontSize: '0.85rem',
    cursor: 'default',
  },
  footerBottom: {
    maxWidth: '1200px',
    margin: '0 auto',
    borderTop: '1px solid var(--border-color)',
    paddingTop: '24px',
    textAlign: 'center',
  },
};

import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../services/api.js';
import { FlipbookViewer } from '../components/FlipbookViewer.js';
import { useAnalyticsTracker } from '../hooks/useAnalyticsTracker.js';
import { 
  Lock, Mail, AlertTriangle, ArrowRight
} from 'lucide-react';

interface PublicFlipbook {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  pageCount: number;
  fileSize: number;
  visibility: 'PUBLIC' | 'PRIVATE' | 'PASSWORD';
  disableDownload: boolean;
  disablePrint: boolean;
  disableCopy: boolean;
  requireEmail: boolean;
  domainRestriction: string | null;
  status: string;
  ownerName: string;
  thumbnailUrl: string | null;
  pdfUrl: string | null;
  isPasswordProtected: boolean;
  isUnlocked: boolean;
}

export const PublicReader: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  
  // States
  const [flipbook, setFlipbook] = useState<PublicFlipbook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Security locks
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  
  // Lead capture
  const [viewerEmail, setViewerEmail] = useState('');
  const [emailCaptured, setEmailCaptured] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);

  // Hook up analytics tracking
  const { trackDownload, trackShare } = useAnalyticsTracker(
    flipbook?.id,
    currentPage,
    false
  );

  // Fetch Public Flipbook Details
  const fetchFlipbook = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest(`/flipbooks/slug/${slug}`);
      const fb = data.flipbook as PublicFlipbook;
      
      setFlipbook(fb);
      setIsUnlocked(fb.isUnlocked);
      setPdfUrl(fb.pdfUrl);

      // Check Domain Restriction if present
      if (fb.domainRestriction) {
        const allowedDomains = fb.domainRestriction.split(',').map((d) => d.trim().toLowerCase());
        const currentDomain = window.location.hostname.toLowerCase();
        if (!allowedDomains.includes(currentDomain) && currentDomain !== 'localhost') {
          setError('This flipbook is restricted and cannot be viewed on this domain.');
        }
      }

      // Check if email capture was already filled in this session
      const savedEmail = sessionStorage.getItem(`lead-${fb.id}`);
      if (savedEmail) {
        setEmailCaptured(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load flipbook');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug) fetchFlipbook();
  }, [slug]);

  // Handle password unlock
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setPasswordError(null);
    try {
      const data = await apiRequest(`/flipbooks/slug/${slug}/unlock`, {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
      setIsUnlocked(true);
      setPdfUrl(data.pdfUrl);
    } catch (err: any) {
      setPasswordError(err.message || 'Invalid password');
    }
  };

  // Handle lead capture submission
  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewerEmail) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(viewerEmail)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    // Save lead in sessionStorage
    if (flipbook) {
      sessionStorage.setItem(`lead-${flipbook.id}`, viewerEmail);
      
      // Send lead analytic record asynchronously
      apiRequest('/analytics/track', {
        method: 'POST',
        body: JSON.stringify({
          flipbookId: flipbook.id,
          visitorId: viewerEmail, // Treat captured email as persistent visitor ID
          pagesRead: [1],
        })
      }).catch(() => {});
    }

    setEmailCaptured(true);
  };

  // Handlers now managed in FlipbookViewer

  // Loading Screen
  if (loading) {
    return (
      <div style={styles.fullscreenOverlay}>
        <div style={styles.spinner}></div>
        <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Loading flipbook player...</p>
      </div>
    );
  }

  // Error Screen
  if (error || !flipbook) {
    return (
      <div style={styles.fullscreenOverlay}>
        <div className="glass-card" style={styles.errorCard}>
          <AlertTriangle size={48} style={{ color: 'var(--error)', marginBottom: '16px' }} />
          <h3 style={{ marginBottom: '8px' }}>Access Denied</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{error || 'The requested flipbook could not be found.'}</p>
          <Link to="/" className="glass-btn glass-btn-secondary" style={{ marginTop: '24px' }}>
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // 1. Password Protected Unlock Screen
  if (flipbook.isPasswordProtected && !isUnlocked) {
    return (
      <div style={styles.fullscreenOverlay}>
        <div className="glass-card" style={styles.lockCard}>
          <div style={styles.lockHeader}>
            <div style={styles.lockIconCircle}>
              <Lock size={24} style={{ color: 'var(--primary-light)' }} />
            </div>
            <h3 style={{ marginBottom: '4px' }}>Password Protected</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Enter the password to read this flipbook</p>
          </div>

          {passwordError && (
            <div style={styles.passwordErrorAlert}>
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} style={styles.form}>
            <input
              type="password"
              className="glass-input"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit" className="glass-btn glass-btn-primary" style={styles.unlockBtn}>
              Unlock Document
              <ArrowRight size={16} />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. Email Capture Lead Wall Screen
  if (flipbook.requireEmail && !emailCaptured) {
    return (
      <div style={styles.fullscreenOverlay}>
        <div className="glass-card" style={styles.lockCard}>
          <div style={styles.lockHeader}>
            <div style={styles.lockIconCircle}>
              <Mail size={24} style={{ color: 'var(--primary-light)' }} />
            </div>
            <h3 style={{ marginBottom: '4px' }}>Unlock Flipbook</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Please enter your email to access this document</p>
          </div>

          {emailError && (
            <div style={styles.passwordErrorAlert}>
              <span>{emailError}</span>
            </div>
          )}

          <form onSubmit={handleEmailSubmit} style={styles.form}>
            <input
              type="email"
              className="glass-input"
              placeholder="you@example.com"
              value={viewerEmail}
              onChange={(e) => setViewerEmail(e.target.value)}
              required
            />
            <button type="submit" className="glass-btn glass-btn-primary" style={styles.unlockBtn}>
              Access Flipbook
              <ArrowRight size={16} />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 3. Render Book Viewport (Once unlocked and email captured)
  return (
    <div id="flipbook-reader-container" style={styles.readerContainer}>
      {pdfUrl && (
        <FlipbookViewer
          pdfUrl={pdfUrl}
          bookTitle={flipbook.title}
          disableCopy={flipbook.disableCopy}
          disablePrint={flipbook.disablePrint}
          disableDownload={flipbook.disableDownload}
          onPageChange={(page) => setCurrentPage(page)}
          onDownload={trackDownload}
          onShare={() => trackShare('native_share')}
          onClose={() => navigate(-1)}
        />
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  fullscreenOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'var(--bg-darker)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '24px',
    zIndex: 2000,
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(255,255,255,0.05)',
    borderTop: '3px solid var(--primary)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  errorCard: {
    maxWidth: '400px',
    width: '100%',
    padding: '40px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  lockCard: {
    maxWidth: '400px',
    width: '100%',
    padding: '40px',
    textAlign: 'center',
  },
  lockHeader: {
    marginBottom: '28px',
  },
  lockIconCircle: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    backgroundColor: 'rgba(0,102,255,0.1)',
    border: '1px solid rgba(0,102,255,0.15)',
    marginBottom: '16px',
  },
  passwordErrorAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--error)',
    fontSize: '0.85rem',
    marginBottom: '20px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  unlockBtn: {
    width: '100%',
  },
  readerContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100vw',
    backgroundColor: '#05070c',
    color: 'var(--text-primary)',
    overflow: 'hidden',
  },
  bookViewport: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '24px 64px 88px 64px',
    overflow: 'hidden',
  },
  toolbar: {
    height: '64px',
    backgroundColor: 'rgba(10, 15, 30, 0.85)',
    backdropFilter: 'blur(20px)',
    borderTop: '1px solid var(--border-color)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 24px',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  toolbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '0.9rem',
  },
  bookTitle: {
    fontWeight: '600',
    color: '#ffffff',
  },
  divider: {
    color: 'var(--border-color)',
  },
  ownerName: {
    color: 'var(--text-secondary)',
  },
  toolbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  toolBtn: {
    padding: '8px 14px',
    fontSize: '0.85rem',
  },
  btnLabel: {
    marginLeft: '6px',
    fontWeight: '500',
  },
  sharePopup: {
    position: 'absolute',
    bottom: '50px',
    right: 0,
    padding: '16px',
    width: '280px',
    backgroundColor: 'rgba(10, 15, 30, 0.95)',
    zIndex: 110,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  shareHeader: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#ffffff',
  },
  shareCopyRow: {
    display: 'flex',
    gap: '6px',
  },
  shareInput: {
    padding: '6px 10px',
    fontSize: '0.8rem',
  },
  shareCopyBtn: {
    padding: '6px',
  },
};

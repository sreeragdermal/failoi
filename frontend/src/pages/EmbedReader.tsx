import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../services/api.js';
import { FlipbookViewer } from '../components/FlipbookViewer.js';
import { useAnalyticsTracker } from '../hooks/useAnalyticsTracker.js';
import { 
  Lock, AlertTriangle, ArrowRight
} from 'lucide-react';

interface EmbedFlipbook {
  id: string;
  title: string;
  slug: string;
  visibility: 'PUBLIC' | 'PRIVATE' | 'PASSWORD';
  disableDownload: boolean;
  disablePrint: boolean;
  disableCopy: boolean;
  expirationDate: string | null;
  status: string;
  pdfUrl: string | null;
  isPasswordProtected: boolean;
  isUnlocked: boolean;
}

export const EmbedReader: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();

  // Parse embed configurations from query URL parameters
  const embedTheme = searchParams.get('theme') === 'light' ? 'light' : 'dark';
  const showToolbar = searchParams.get('toolbar') !== 'false';
  const embedAllowDownload = searchParams.get('download') !== 'false';
  const embedAllowPrint = searchParams.get('print') !== 'false';
  const autoFlipParam = searchParams.get('autoflip') === 'true';

  // State
  const [flipbook, setFlipbook] = useState<EmbedFlipbook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Security states
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Hook up analytics tracking (embedded = true)
  const { trackDownload } = useAnalyticsTracker(
    flipbook?.id,
    currentPage,
    true
  );

  const fetchFlipbook = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest(`/flipbooks/slug/${slug}`);
      const fb = data.flipbook as EmbedFlipbook;
      
      setFlipbook(fb);
      setIsUnlocked(fb.isUnlocked);
      setPdfUrl(fb.pdfUrl);

      // Check Expiration
      if (fb.expirationDate && new Date(fb.expirationDate) < new Date()) {
        setError('This document link has expired.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load document');
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

  // Handlers now managed in FlipbookViewer

  // Styling theme values
  const themeStyles = {
    bg: embedTheme === 'light' ? '#f8fafc' : '#05070c',
    text: embedTheme === 'light' ? '#0f172a' : '#f8fafc',
    toolbarBg: embedTheme === 'light' ? 'rgba(241, 245, 249, 0.9)' : 'rgba(10, 15, 30, 0.85)',
    border: embedTheme === 'light' ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.06)'
  };

  // Loading Screen
  if (loading) {
    return (
      <div style={{ ...styles.fullscreenOverlay, backgroundColor: themeStyles.bg, color: themeStyles.text }}>
        <div style={styles.spinner}></div>
      </div>
    );
  }

  // Error Screen
  if (error || !flipbook) {
    return (
      <div style={{ ...styles.fullscreenOverlay, backgroundColor: themeStyles.bg, color: themeStyles.text }}>
        <div style={styles.errorContainer}>
          <AlertTriangle size={32} style={{ color: 'var(--error)', marginBottom: '12px' }} />
          <p style={{ fontSize: '0.9rem', textAlign: 'center' }}>{error || 'Document unavailable'}</p>
        </div>
      </div>
    );
  }

  // Password Unlock Screen
  if (flipbook.isPasswordProtected && !isUnlocked) {
    return (
      <div style={{ ...styles.fullscreenOverlay, backgroundColor: themeStyles.bg, color: themeStyles.text }}>
        <div className="glass-card" style={styles.lockCard}>
          <div style={styles.lockHeader}>
            <Lock size={20} style={{ color: 'var(--primary-light)', marginBottom: '8px' }} />
            <h4 style={{ margin: 0, color: themeStyles.text }}>Password Required</h4>
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
              style={styles.inlineInput}
              required
            />
            <button type="submit" className="glass-btn glass-btn-primary" style={styles.unlockBtn}>
              Unlock
              <ArrowRight size={14} />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Render player
  return (
    <div id="embed-reader-container" style={{ ...styles.readerContainer, backgroundColor: themeStyles.bg }}>
      {pdfUrl && (
        <FlipbookViewer
          pdfUrl={pdfUrl}
          bookTitle={flipbook.title}
          disableCopy={flipbook.disableCopy}
          disablePrint={!embedAllowPrint}
          disableDownload={!embedAllowDownload}
          autoFlip={autoFlipParam}
          showToolbar={showToolbar}
          onPageChange={(page) => setCurrentPage(page)}
          onDownload={trackDownload}
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
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '16px',
    zIndex: 100,
  },
  spinner: {
    width: '24px',
    height: '24px',
    border: '2px solid rgba(255,255,255,0.05)',
    borderTop: '2px solid var(--primary)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  lockCard: {
    maxWidth: '320px',
    width: '100%',
    padding: '24px',
    textAlign: 'center',
    background: 'rgba(255,255,255,0.01)',
  },
  lockHeader: {
    marginBottom: '16px',
  },
  passwordErrorAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    padding: '8px 12px',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--error)',
    fontSize: '0.8rem',
    marginBottom: '16px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  inlineInput: {
    padding: '8px 12px',
    fontSize: '0.85rem',
  },
  unlockBtn: {
    width: '100%',
    padding: '8px 16px',
    fontSize: '0.85rem',
  },
  readerContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100vw',
    position: 'relative',
    overflow: 'hidden',
  },
  bookViewport: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '16px 16px 64px 16px',
    overflow: 'hidden',
  },
  toolbar: {
    height: '48px',
    backdropFilter: 'blur(20px)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 16px',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 50,
  },
  toolbarLeft: {
    display: 'flex',
    alignItems: 'center',
  },
  bookTitle: {
    fontWeight: '600',
    fontSize: '0.8rem',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '180px',
  },
  toolbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  toolBtn: {
    padding: '6px 10px',
  },
};

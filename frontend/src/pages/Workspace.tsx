import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiRequest } from '../services/api.js';
import { FlipbookViewer } from '../components/FlipbookViewer.js';
import { ShareCenterModal } from '../components/ShareCenterModal.js';
import { useAuth } from '../hooks/useAuth.js';
import {
  ArrowLeft, Share2, Clock, CheckCircle2, Lock,
  Trash2, Eye, Loader2, Sparkles, Check
} from 'lucide-react';

interface WorkspaceFlipbook {
  id: string;
  title: string;
  description: string;
  slug: string;
  visibility: 'PUBLIC' | 'PRIVATE' | 'PASSWORD';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  error: string | null;
  pageCount: number;
  fileSize: number;
  temporary: boolean;
  expiresAt: string | null;
  pdfUrl: string | null;
  thumbnailUrl: string | null;
  pages: { id: string; pageNumber: number; imageUrl: string }[];
  canEdit: boolean;
  canClaim: boolean;
}

export const Workspace: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [flipbook, setFlipbook] = useState<WorkspaceFlipbook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pageEffect, setPageEffect] = useState('Magazine');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Claiming states
  const [isClaiming, setIsClaiming] = useState(false);

  // Expiry countdown
  const [timeLeft, setTimeLeft] = useState('');

  // Modals
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Refs for StrictMode claim prevention
  const claimAttemptedRef = useRef(false);
  const fetchTimerRef = useRef<any | null>(null);

  const fetchWorkspaceData = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const data = await apiRequest(`/flipbooks/workspace/${id}`);
      setFlipbook(data.flipbook);
      setTitle(data.flipbook.title);
      setDescription(data.flipbook.description || '');
      setError(null);
    } catch (err: any) {
      if (err.message && err.message.includes('expired')) {
        setError('expired');
      } else {
        setError(err.message || 'Access Denied: Flipbook workspace not found.');
      }
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  // 1. Fetch data on mount/id change
  useEffect(() => {
    if (id) {
      fetchWorkspaceData();
    }
    return () => {
      if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current);
    };
  }, [id]);

  // 2. Poll workspace status if PENDING or PROCESSING
  useEffect(() => {
    if (flipbook && (flipbook.status === 'PENDING' || flipbook.status === 'PROCESSING')) {
      fetchTimerRef.current = setTimeout(() => {
        fetchWorkspaceData(false);
      }, 3000);
    }
    return () => {
      if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current);
    };
  }, [flipbook?.status]);

  // 3. Claim coordination: check for pending claim intent
  useEffect(() => {
    const pendingClaimId = sessionStorage.getItem('failoi_pending_claim');

    if (
      !authLoading &&
      user &&
      pendingClaimId === id &&
      flipbook &&
      flipbook.temporary &&
      !claimAttemptedRef.current
    ) {
      claimAttemptedRef.current = true;
      executeClaim();
    }
  }, [user, authLoading, flipbook, id]);

  // 4. Expiry timer calculation
  useEffect(() => {
    if (!flipbook?.expiresAt) return;

    const calculateTimeLeft = () => {
      const difference = new Date(flipbook.expiresAt!).getTime() - new Date().getTime();
      if (difference <= 0) {
        setTimeLeft('Expired');
        setError('expired');
        return;
      }

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      if (hours < 1) {
        setTimeLeft(`Expires in ${minutes} minutes`);
      } else {
        const formattedHours = hours.toString().padStart(2, '0');
        const formattedMinutes = minutes.toString().padStart(2, '0');
        const formattedSeconds = seconds.toString().padStart(2, '0');
        setTimeLeft(`${formattedHours} : ${formattedMinutes} : ${formattedSeconds}`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [flipbook?.expiresAt]);

  const executeClaim = async () => {
    setIsClaiming(true);
    try {
      await apiRequest('/flipbooks/claim', {
        method: 'POST',
        body: JSON.stringify({ flipbookId: id })
      });

      sessionStorage.removeItem('failoi_pending_claim');
      sessionStorage.removeItem('failoi_auth_return_to');

      // Refetch new permanent workspace configuration
      await fetchWorkspaceData(true);
    } catch (err: any) {
      console.error('Failed to claim guest flipbook:', err);
      sessionStorage.removeItem('failoi_pending_claim');
      sessionStorage.removeItem('failoi_auth_return_to');
    } finally {
      setIsClaiming(false);
    }
  };

  const handleUpdateInfo = async () => {
    if (!flipbook) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await apiRequest(`/flipbooks/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title,
          description,
          visibility: flipbook.visibility
        })
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to update flipbook details:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFlipbook = async () => {
    if (!window.confirm('Are you sure you want to delete this flipbook? This cannot be undone.')) {
      return;
    }

    try {
      await apiRequest(`/flipbooks/${id}`, { method: 'DELETE' });
      navigate(user ? '/dashboard' : '/');
    } catch (err) {
      console.error('Failed to delete flipbook:', err);
    }
  };

  const handleKeepClick = () => {
    sessionStorage.setItem('failoi_pending_claim', id || '');
    sessionStorage.setItem('failoi_auth_return_to', window.location.pathname);

    // Redirect to login, carrying the target back path
    navigate('/login', { state: { from: { pathname: window.location.pathname } } });
  };

  // Expiration / Gone View
  if (error === 'expired') {
    return (
      <div style={styles.expiredContainer}>
        <div className="glass-card" style={styles.expiredCard}>
          <Clock size={48} style={{ color: 'var(--error)', marginBottom: '16px' }} />
          <h2 style={styles.expiredTitle}>This flipbook has expired</h2>
          <p style={styles.expiredText}>
            Guest flipbooks stay online for 24 hours. Sign in anytime to keep yours permanently.
          </p>
          <Link to="/" className="glass-btn glass-btn-primary" style={styles.expiredBtn}>
            Create a new flipbook
          </Link>
        </div>
      </div>
    );
  }

  // General Error view
  if (error) {
    return (
      <div style={styles.expiredContainer}>
        <div className="glass-card" style={styles.expiredCard}>
          <Lock size={48} style={{ color: 'var(--error)', marginBottom: '16px' }} />
          <h2 style={styles.expiredTitle}>Access Denied</h2>
          <p style={styles.expiredText}>{error}</p>
          <Link to="/" className="glass-btn glass-btn-primary" style={styles.expiredBtn}>
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // Loading Screen
  if (loading || !flipbook) {
    return (
      <div style={styles.loadingContainer}>
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)' }} />
        <span style={{ marginTop: '12px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Loading Workspace...
        </span>
      </div>
    );
  }

  return (
    <div style={styles.workspaceContainer}>
      {/* Left Settings Panel */}
      <div style={styles.leftPanel}>
        {/* Back Link */}
        <div style={styles.headerRow}>
          <Link to={user ? '/dashboard' : '/'} style={styles.backLink}>
            <ArrowLeft size={16} style={{ marginRight: '6px' }} />
            Back to {user ? 'Library' : 'Home'}
          </Link>

          <div style={styles.badgeRow}>
            {flipbook.temporary ? (
              <span style={styles.tempBadge}>Guest Mode</span>
            ) : (
              <span style={styles.permanentBadge}>Permanent</span>
            )}
          </div>
        </div>

        {/* Form Inputs */}
        <div style={styles.formContainer}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Title</label>
            <input
              type="text"
              className="glass-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleUpdateInfo}
              placeholder="Untitled Flipbook"
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Description</label>
            <textarea
              className="glass-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleUpdateInfo}
              placeholder="Add a description..."
              rows={3}
              style={{ ...styles.input, resize: 'none' }}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Page Effect</label>
            <select
              className="glass-input"
              value={pageEffect}
              onChange={(e) => {
                setPageEffect(e.target.value);
                handleUpdateInfo();
              }}
              style={styles.select}
            >
              <option value="Magazine">Magazine (Standard)</option>
              <option value="Book">Hardcover Book</option>
              <option value="Card">Single Slide</option>
            </select>
          </div>

          {/* Settings State Display */}
          <div style={styles.saveStatusRow}>
            {isSaving && (
              <span style={styles.savingText}>
                <Loader2 size={12} className="animate-spin" style={{ marginRight: '4px' }} />
                Saving changes...
              </span>
            )}
            {saveSuccess && (
              <span style={styles.savedText}>
                <Check size={12} style={{ marginRight: '4px' }} />
                Saved
              </span>
            )}
          </div>

          {/* Share Action */}
          <button
            onClick={() => setShareModalOpen(true)}
            className="glass-btn glass-btn-primary"
            style={styles.actionButton}
            disabled={flipbook.status !== 'COMPLETED'}
          >
            <Share2 size={16} style={{ marginRight: '8px' }} />
            Share flipbook
          </button>
        </div>

        {/* Expiration or Claim Container */}
        <div style={styles.claimWidget}>
          {flipbook.temporary ? (
            <div style={styles.expirySection} className="glass-card">
              <div style={styles.expiryHeader}>
                <Clock size={16} style={{ marginRight: '6px', color: 'var(--primary)' }} />
                <span style={{ fontWeight: '500' }}>Temporary Flipbook</span>
              </div>

              <div style={styles.countdownBox}>
                <span style={styles.countdownLabel}>Expires in</span>
                <span style={styles.countdownTime}>{timeLeft}</span>
              </div>

              <p style={styles.expiryExplanation}>
                This temporary publication will be deleted in 24 hours. Sign in now to keep it online permanently.
              </p>

              <button
                onClick={handleKeepClick}
                className="glass-btn glass-btn-primary"
                style={styles.claimBtn}
                disabled={isClaiming}
              >
                {isClaiming ? (
                  <>
                    <Loader2 size={16} className="animate-spin" style={{ marginRight: '8px' }} />
                    Saving...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} style={{ marginRight: '8px' }} />
                    Keep this flipbook
                  </>
                )}
              </button>
            </div>
          ) : (
            <div style={styles.savedSection} className="glass-card">
              <CheckCircle2 size={20} style={{ color: 'var(--primary-light)', marginBottom: '8px' }} />
              <span style={styles.savedTitle}>Saved to your library</span>
              <p style={styles.savedDescription}>
                This flipbook is now permanent. You can manage it anytime from your FAILOI library dashboard.
              </p>
            </div>
          )}

          {/* Delete action */}
          <button
            onClick={handleDeleteFlipbook}
            style={styles.deleteLink}
          >
            <Trash2 size={14} style={{ marginRight: '4px' }} />
            Delete flipbook
          </button>
        </div>
      </div>

      {/* Right Viewer Panel */}
      <div style={styles.rightPanel}>
        {flipbook.status === 'PENDING' || flipbook.status === 'PROCESSING' ? (
          <div style={styles.processingWrapper}>
            <Loader2 size={40} className="animate-spin" style={{ color: 'var(--primary)', marginBottom: '16px' }} />
            <h3 style={styles.processingTitle}>Creating your flipbook</h3>
            <p style={styles.processingDesc}>
              We are parsing your PDF document and generating responsive HTML5 page assets. This takes just a few seconds...
            </p>
          </div>
        ) : flipbook.status === 'FAILED' ? (
          <div style={styles.processingWrapper}>
            <h3 style={{ ...styles.processingTitle, color: 'var(--error)' }}>Processing Failed</h3>
            <p style={styles.processingDesc}>
              {flipbook.error || 'An unexpected error occurred while parsing this PDF. Please verify your file is not corrupted and try again.'}
            </p>
            <Link to="/" className="glass-btn glass-btn-primary" style={{ marginTop: '16px' }}>
              Try Again
            </Link>
          </div>
        ) : (
          <div style={styles.viewerWrapper}>
            <div style={styles.viewerToolbar}>
              <span style={styles.viewerTitle}>{flipbook.title}</span>
              <a
                href={`/f/${flipbook.slug}`}
                target="_blank"
                rel="noreferrer"
                style={styles.viewPublicLink}
              >
                <Eye size={14} style={{ marginRight: '4px' }} />
                View public link
              </a>
            </div>

            <div style={styles.flipbookContainer}>
              {flipbook.pdfUrl && (
                <FlipbookViewer
                  pdfUrl={flipbook.pdfUrl}
                  bookTitle={flipbook.title}
                  disableCopy={false}
                  disablePrint={false}
                  disableDownload={false}
                  showToolbar={true}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Share Center Modal */}
      {flipbook && (
        <ShareCenterModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          flipbook={{
            id: flipbook.id,
            title: flipbook.title,
            slug: flipbook.slug
          }}
        />
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  workspaceContainer: {
    display: 'flex',
    height: '100vh',
    width: '100vw',
    backgroundColor: '#05070c',
    overflow: 'hidden',
  },
  leftPanel: {
    width: '360px',
    backgroundColor: '#0a0f1e',
    borderRight: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '24px',
    overflowY: 'auto',
    flexShrink: 0,
  },
  rightPanel: {
    flex: 1,
    backgroundColor: '#030509',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    color: 'var(--text-secondary)',
    fontSize: '0.85rem',
    textDecoration: 'none',
    fontWeight: '500',
    transition: 'color 0.2s',
  },
  badgeRow: {
    display: 'flex',
  },
  tempBadge: {
    padding: '3px 8px',
    fontSize: '0.7rem',
    fontWeight: '600',
    borderRadius: '4px',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    color: '#f59e0b',
    border: '1px solid rgba(245, 158, 11, 0.2)',
  },
  permanentBadge: {
    padding: '3px 8px',
    fontSize: '0.7rem',
    fontWeight: '600',
    borderRadius: '4px',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    color: '#10b981',
    border: '1px solid rgba(16, 185, 129, 0.2)',
  },
  formContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    flex: 1,
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    fontSize: '0.9rem',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  select: {
    width: '100%',
    padding: '10px 14px',
    fontSize: '0.9rem',
    backgroundColor: 'rgba(255,255,255,0.02)',
    cursor: 'pointer',
  },
  saveStatusRow: {
    height: '16px',
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.75rem',
  },
  savingText: {
    display: 'flex',
    alignItems: 'center',
    color: 'var(--text-secondary)',
  },
  savedText: {
    display: 'flex',
    alignItems: 'center',
    color: 'var(--primary-light)',
    fontWeight: '500',
  },
  actionButton: {
    width: '100%',
    padding: '12px',
    fontSize: '0.9rem',
    display: 'inline-flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: '12px',
  },
  claimWidget: {
    marginTop: '32px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  expirySection: {
    padding: '20px',
    backgroundColor: 'rgba(255,255,255,0.01)',
    border: '1px solid rgba(255,255,255,0.04)',
    borderRadius: '8px',
  },
  expiryHeader: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.85rem',
    color: 'var(--text-primary)',
    marginBottom: '16px',
  },
  countdownBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: '6px',
    marginBottom: '12px',
    border: '1px solid rgba(255,255,255,0.03)',
  },
  countdownLabel: {
    fontSize: '0.7rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--text-secondary)',
    marginBottom: '4px',
  },
  countdownTime: {
    fontSize: '1.25rem',
    fontWeight: '700',
    letterSpacing: '0.05em',
    color: 'var(--text-primary)',
  },
  expiryExplanation: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
    margin: '0 0 16px 0',
  },
  claimBtn: {
    width: '100%',
    padding: '10px',
    fontSize: '0.85rem',
  },
  savedSection: {
    padding: '20px',
    backgroundColor: 'rgba(16, 185, 129, 0.03)',
    border: '1px solid rgba(16, 185, 129, 0.1)',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  savedTitle: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginBottom: '4px',
  },
  savedDescription: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
    margin: 0,
  },
  deleteLink: {
    background: 'none',
    border: 'none',
    color: '#ef4444',
    fontSize: '0.8rem',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.7,
    transition: 'opacity 0.2s',
  },
  processingWrapper: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px',
    textAlign: 'center',
    maxWidth: '500px',
    margin: '0 auto',
  },
  processingTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: '0 0 8px 0',
  },
  processingDesc: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.5',
    margin: 0,
  },
  viewerWrapper: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },
  viewerToolbar: {
    height: '56px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 24px',
    backgroundColor: '#07090f',
  },
  viewerTitle: {
    fontWeight: '600',
    fontSize: '0.9rem',
    color: 'var(--text-primary)',
  },
  viewPublicLink: {
    display: 'inline-flex',
    alignItems: 'center',
    color: 'var(--primary-light)',
    fontSize: '0.8rem',
    textDecoration: 'none',
    fontWeight: '500',
  },
  flipbookContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    width: '100vw',
    backgroundColor: '#05070c',
  },
  expiredContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    width: '100vw',
    backgroundColor: '#05070c',
    padding: '24px',
  },
  expiredCard: {
    maxWidth: '400px',
    width: '100%',
    padding: '40px 32px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  expiredTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    margin: '0 0 12px 0',
  },
  expiredText: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.5',
    margin: '0 0 24px 0',
  },
  expiredBtn: {
    width: '100%',
    padding: '12px',
  },
};

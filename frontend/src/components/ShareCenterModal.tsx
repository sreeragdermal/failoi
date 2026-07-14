import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Copy, Check, Download, ExternalLink, MessageCircle, Sparkles, Clock, Loader2 } from 'lucide-react';
import { getAccessToken, BASE_URL } from '../services/api.js';

interface ShareCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  flipbook: {
    id: string;
    title: string;
    slug: string;
    temporary?: boolean;
    expiresAt?: string | null;
  } | null;
}

type TabType = 'link' | 'embed' | 'qr' | 'social';

export const ShareCenterModal: React.FC<ShareCenterModalProps> = ({ isOpen, onClose, flipbook }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('link');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [qrBlobUrl, setQrBlobUrl] = useState<string | null>(null);

  // Embed Settings
  const [isResponsive, setIsResponsive] = useState(true);
  const [customWidth, setCustomWidth] = useState('800');
  const [height, setHeight] = useState('600');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [showToolbar, setShowToolbar] = useState(true);
  const [allowDownload, setAllowDownload] = useState(true);
  const [allowPrint, setAllowPrint] = useState(true);
  const autoFlip = false;

  // Expiry countdown text
  const [timeLeft, setTimeLeft] = useState('');

  const frontendUrl = window.location.origin;
  const publicUrl = flipbook ? `${frontendUrl}/f/${flipbook.slug}` : '';

  // Calculate Embed URL
  const embedParams = new URLSearchParams({
    theme,
    toolbar: showToolbar.toString(),
    download: allowDownload.toString(),
    print: allowPrint.toString(),
    autoflip: autoFlip.toString()
  }).toString();

  const embedUrl = flipbook ? `${frontendUrl}/embed/${flipbook.slug}?${embedParams}` : '';
  const resolvedWidth = isResponsive ? '100%' : `${customWidth}px`;
  const iframeCode = `<iframe src="${embedUrl}" width="${resolvedWidth}" height="${height}px" allowfullscreen style="border: none; border-radius: 8px;"></iframe>`;

  // Countdown timer for temporary links
  useEffect(() => {
    if (!flipbook?.expiresAt) return;

    const calculateTimeLeft = () => {
      const difference = new Date(flipbook.expiresAt!).getTime() - new Date().getTime();
      if (difference <= 0) {
        setTimeLeft('Expired');
        return;
      }
      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      if (hours < 1) {
        setTimeLeft(`${minutes}m`);
      } else {
        setTimeLeft(`${hours}h ${minutes}m`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60000);
    return () => clearInterval(interval);
  }, [flipbook?.expiresAt, isOpen]);

  // Fetch QR Code Blob
  useEffect(() => {
    if (!isOpen || !flipbook) {
      setQrBlobUrl(null);
      return;
    }

    const fetchQRCode = async () => {
      try {
        const token = getAccessToken();
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(`${BASE_URL}/flipbooks/${flipbook.id}/qr`, {
          headers
        });

        if (res.ok) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          setQrBlobUrl(url);
        }
      } catch (err) {
        console.error('Error fetching QR Code:', err);
      }
    };

    fetchQRCode();

    return () => {
      if (qrBlobUrl) {
        URL.revokeObjectURL(qrBlobUrl);
      }
    };
  }, [isOpen, flipbook]);

  if (!isOpen || !flipbook) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyEmbed = () => {
    navigator.clipboard.writeText(iframeCode);
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2000);
  };

  const handleDownloadQR = () => {
    if (!qrBlobUrl) return;
    const a = document.createElement('a');
    a.href = qrBlobUrl;
    a.download = `failoi-qr-${flipbook.slug}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleClaimRedirect = () => {
    sessionStorage.setItem('failoi_pending_claim', flipbook.id);
    sessionStorage.setItem('failoi_auth_return_to', `/workspace/${flipbook.id}`);
    onClose();
    navigate('/login');
  };

  // Social share URLs
  const socialShares = {
    whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(`Check out this flipbook: ${publicUrl}`)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicUrl)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicUrl)}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(publicUrl)}&text=${encodeURIComponent(`Check out this flipbook: ${flipbook.title}`)}`
  };

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalCard} className="glass-card">
        {/* Modal Header */}
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>Share Flipbook</h2>
          <button onClick={onClose} style={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={styles.tabBar}>
          {(['link', 'embed', 'qr', 'social'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                ...styles.tabButton,
                color: activeTab === tab ? '#ffffff' : 'var(--text-secondary)',
                borderBottomColor: activeTab === tab ? 'var(--primary)' : 'transparent'
              }}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Tab Content Panels */}
        <div style={styles.tabContent}>

          {/* LINK TAB */}
          {activeTab === 'link' && (
            <div style={styles.pane}>
              <h3 style={styles.paneHeading}>Share link</h3>
              <div style={styles.urlBar}>
                <input
                  type="text"
                  readOnly
                  value={publicUrl}
                  style={styles.urlInput}
                />
                <button onClick={handleCopyLink} className="glass-btn glass-btn-primary" style={styles.copyBtn}>
                  {copiedLink ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>

              <div style={{ marginTop: '16px' }}>
                <a href={publicUrl} target="_blank" rel="noreferrer" style={styles.openLink}>
                  Open flipbook
                  <ExternalLink size={14} style={{ marginLeft: '6px' }} />
                </a>
              </div>

              {flipbook.temporary && (
                <div style={styles.warningBox} className="glass-card">
                  <Clock size={16} style={{ color: '#f59e0b', marginRight: '8px' }} />
                  <span style={{ fontSize: '0.8rem', color: '#f59e0b', flex: 1 }}>
                    This temporary link expires in {timeLeft}.
                  </span>
                  <button onClick={handleClaimRedirect} style={styles.claimLink}>
                    <Sparkles size={12} style={{ marginRight: '4px' }} />
                    Sign in to keep it
                  </button>
                </div>
              )}
            </div>
          )}

          {/* EMBED TAB */}
          {activeTab === 'embed' && (
            <div style={styles.embedGrid}>
              {/* Left Column: Live Embed Preview */}
              <div style={styles.embedPreviewColumn}>
                <h4 style={styles.columnLabel}>Live Preview</h4>
                <div style={styles.iframePreviewContainer}>
                  <iframe
                    src={embedUrl}
                    title="Live Embed Preview"
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 'none',
                      borderRadius: '6px',
                      backgroundColor: theme === 'light' ? '#f1f5f9' : '#030509'
                    }}
                  />
                </div>
              </div>

              {/* Right Column: Settings */}
              <div style={styles.embedSettingsColumn}>
                <h4 style={styles.columnLabel}>Embed Settings</h4>

                <div style={styles.settingGroup}>
                  <label style={styles.switchLabel}>
                    <input
                      type="checkbox"
                      checked={isResponsive}
                      onChange={(e) => setIsResponsive(e.target.checked)}
                      style={{ marginRight: '8px' }}
                    />
                    Responsive Width (100%)
                  </label>
                </div>

                {!isResponsive && (
                  <div style={styles.settingGroup}>
                    <label style={styles.inputLabel}>Custom Width (px)</label>
                    <input
                      type="number"
                      className="glass-input"
                      value={customWidth}
                      onChange={(e) => setCustomWidth(e.target.value)}
                      style={styles.settingInput}
                    />
                  </div>
                )}

                <div style={styles.settingGroup}>
                  <label style={styles.inputLabel}>Height (px)</label>
                  <input
                    type="number"
                    className="glass-input"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    style={styles.settingInput}
                  />
                </div>

                <div style={styles.settingGroup}>
                  <label style={styles.inputLabel}>Theme</label>
                  <select
                    className="glass-input"
                    value={theme}
                    onChange={(e) => setTheme(e.target.value as 'dark' | 'light')}
                    style={styles.settingSelect}
                  >
                    <option value="dark">Dark Theme</option>
                    <option value="light">Light Theme</option>
                  </select>
                </div>

                <div style={styles.checkboxGroup}>
                  <label style={styles.switchLabel}>
                    <input
                      type="checkbox"
                      checked={showToolbar}
                      onChange={(e) => setShowToolbar(e.target.checked)}
                      style={{ marginRight: '8px' }}
                    />
                    Show Toolbar
                  </label>

                  <label style={styles.switchLabel}>
                    <input
                      type="checkbox"
                      checked={allowDownload}
                      onChange={(e) => setAllowDownload(e.target.checked)}
                      style={{ marginRight: '8px' }}
                    />
                    Allow Downloads
                  </label>

                  <label style={styles.switchLabel}>
                    <input
                      type="checkbox"
                      checked={allowPrint}
                      onChange={(e) => setAllowPrint(e.target.checked)}
                      style={{ marginRight: '8px' }}
                    />
                    Allow Printing
                  </label>
                </div>

                <button
                  onClick={handleCopyEmbed}
                  className="glass-btn glass-btn-primary"
                  style={{ width: '100%', marginTop: '16px', padding: '10px' }}
                >
                  {copiedEmbed ? (
                    <>
                      <Check size={14} style={{ marginRight: '6px' }} />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={14} style={{ marginRight: '6px' }} />
                      Copy Embed Code
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* QR CODE TAB */}
          {activeTab === 'qr' && (
            <div style={styles.paneCenter}>
              <h3 style={styles.paneHeading}>Scan to open this flipbook</h3>

              <div style={styles.qrWrapper}>
                {qrBlobUrl ? (
                  <img src={qrBlobUrl} alt="Flipbook QR Code" style={styles.qrImage} />
                ) : (
                  <div style={styles.qrPlaceholder}>
                    <Loader2 size={24} className="animate-spin" style={{ color: 'var(--primary)' }} />
                  </div>
                )}
              </div>

              <button
                onClick={handleDownloadQR}
                className="glass-btn glass-btn-primary"
                style={styles.qrBtn}
                disabled={!qrBlobUrl}
              >
                <Download size={16} style={{ marginRight: '8px' }} />
                Download PNG
              </button>

              {flipbook.temporary && (
                <div style={{ ...styles.warningBox, width: '100%', maxWidth: '360px', marginTop: '24px' }} className="glass-card">
                  <span style={{ fontSize: '0.8rem', color: '#f59e0b', flex: 1 }}>
                    This QR code will stop working when the temporary flipbook expires.
                  </span>
                  <button onClick={handleClaimRedirect} style={styles.claimLink}>
                    Keep online
                  </button>
                </div>
              )}
            </div>
          )}

          {/* SOCIAL TAB */}
          {activeTab === 'social' && (
            <div style={styles.pane}>
              <h3 style={styles.paneHeading}>Share to social media</h3>

              <div style={styles.socialGrid}>
                <a href={socialShares.whatsapp} target="_blank" rel="noreferrer" style={styles.socialButton} className="glass-card">
                  <MessageCircle size={20} style={{ color: '#25D366' }} />
                  <span>WhatsApp</span>
                </a>

                <a href={socialShares.facebook} target="_blank" rel="noreferrer" style={styles.socialButton} className="glass-card">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1877F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                  <span>Facebook</span>
                </a>

                <a href={socialShares.linkedin} target="_blank" rel="noreferrer" style={styles.socialButton} className="glass-card">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0A66C2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
                  <span>LinkedIn</span>
                </a>

                <a href={socialShares.twitter} target="_blank" rel="noreferrer" style={styles.socialButton} className="glass-card">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1DA1F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path></svg>
                  <span>X (Twitter)</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    padding: '24px',
  },
  modalCard: {
    maxWidth: '680px',
    width: '100%',
    backgroundColor: '#0a0f1e',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  modalTitle: {
    fontSize: '1.2rem',
    fontWeight: '700',
    color: '#ffffff',
    margin: 0,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  },
  tabBar: {
    display: 'flex',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    marginBottom: '20px',
  },
  tabButton: {
    background: 'none',
    border: 'none',
    padding: '10px 16px',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    transition: 'all 0.2s',
  },
  tabContent: {
    flex: 1,
  },
  pane: {
    display: 'flex',
    flexDirection: 'column',
  },
  paneCenter: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  paneHeading: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '12px',
  },
  urlBar: {
    display: 'flex',
    gap: '12px',
  },
  urlInput: {
    flex: 1,
    padding: '10px 14px',
    fontSize: '0.9rem',
    backgroundColor: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '6px',
    color: '#ffffff',
    outline: 'none',
  },
  copyBtn: {
    padding: '10px 16px',
  },
  openLink: {
    display: 'inline-flex',
    alignItems: 'center',
    color: 'var(--primary-light)',
    fontSize: '0.85rem',
    textDecoration: 'none',
    fontWeight: '500',
  },
  warningBox: {
    marginTop: '24px',
    padding: '14px 18px',
    backgroundColor: 'rgba(245, 158, 11, 0.03)',
    border: '1px solid rgba(245, 158, 11, 0.1)',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  claimLink: {
    background: 'none',
    border: 'none',
    color: 'var(--primary-light)',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    textDecoration: 'underline',
  },
  embedGrid: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 1fr',
    gap: '24px',
  },
  embedPreviewColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  columnLabel: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    margin: 0,
  },
  iframePreviewContainer: {
    flex: 1,
    height: '240px',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  embedSettingsColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxHeight: '350px',
    overflowY: 'auto',
    paddingRight: '8px',
  },
  settingGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  inputLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
  },
  settingInput: {
    padding: '8px 12px',
    fontSize: '0.85rem',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  settingSelect: {
    padding: '8px 12px',
    fontSize: '0.85rem',
    backgroundColor: 'rgba(255,255,255,0.02)',
    cursor: 'pointer',
  },
  checkboxGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '8px',
  },
  switchLabel: {
    fontSize: '0.8rem',
    color: 'var(--text-primary)',
    display: 'inline-flex',
    alignItems: 'center',
    cursor: 'pointer',
  },
  qrWrapper: {
    width: '160px',
    height: '160px',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '16px',
    overflow: 'hidden',
  },
  qrImage: {
    width: '100%',
    height: '100%',
  },
  qrPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrBtn: {
    padding: '10px 20px',
    fontSize: '0.85rem',
  },
  socialGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  socialButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    backgroundColor: 'rgba(255,255,255,0.01)',
    border: '1px solid rgba(255,255,255,0.04)',
    borderRadius: '8px',
    textDecoration: 'none',
    color: '#ffffff',
    fontSize: '0.9rem',
    fontWeight: '500',
    transition: 'all 0.2s',
    cursor: 'pointer',
  },
};

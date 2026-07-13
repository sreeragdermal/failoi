import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Download, Send, MessageCircle, Mail, Settings2 } from 'lucide-react';
import { getAccessToken, BASE_URL } from '../services/api.js';

interface ShareCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  flipbook: {
    id: string;
    title: string;
    slug: string;
  } | null;
}

export const ShareCenterModal: React.FC<ShareCenterModalProps> = ({ isOpen, onClose, flipbook }) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [qrBlobUrl, setQrBlobUrl] = useState<string | null>(null);

  // Embed Customizer Settings
  const [width, setWidth] = useState('100%');
  const [height, setHeight] = useState('600');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [showToolbar, setShowToolbar] = useState(true);
  const [allowDownload, setAllowDownload] = useState(true);
  const [allowPrint, setAllowPrint] = useState(true);
  const [autoFlip, setAutoFlip] = useState(false);
  const [showPageNumbers, setShowPageNumbers] = useState(true);

  const frontendUrl = window.location.origin;
  const publicUrl = flipbook ? `${frontendUrl}/f/${flipbook.slug}` : '';
  
  // Build dynamic Embed URL with query parameters
  const embedParams = new URLSearchParams({
    theme,
    toolbar: showToolbar.toString(),
    download: allowDownload.toString(),
    print: allowPrint.toString(),
    autoflip: autoFlip.toString(),
    pagenumbers: showPageNumbers.toString()
  }).toString();
  
  const embedUrl = flipbook ? `${frontendUrl}/embed/${flipbook.slug}?${embedParams}` : '';
  const iframeCode = `<iframe src="${embedUrl}" width="${width}" height="${height}" allowfullscreen style="border: none; border-radius: 8px;"></iframe>`;

  // Fetch QR Code as blob with authentication headers to handle private books securely
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

  // Social Share URLs
  const socialShares = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicUrl)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicUrl)}`,
    whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(flipbook.title + ' - ' + publicUrl)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(publicUrl)}&text=${encodeURIComponent(flipbook.title)}`,
    email: `mailto:?subject=${encodeURIComponent(flipbook.title)}&body=${encodeURIComponent('Check out this flipbook: ' + publicUrl)}`
  };

  return (
    <div style={styles.backdrop}>
      <div className="glass-card animate-fade-in" style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h3 style={styles.title}>Share Center</h3>
            <p style={styles.subtitle}>{flipbook.title}</p>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Content Grid */}
        <div style={styles.grid}>
          {/* Left Column: Link, Socials, QR Code */}
          <div style={styles.leftColumn}>
            {/* Public Link */}
            <div style={styles.section}>
              <h4 style={styles.sectionTitle}>Public URL</h4>
              <div style={styles.copyWrapper}>
                <input
                  type="text"
                  readOnly
                  className="glass-input"
                  value={publicUrl}
                  style={styles.copyInput}
                />
                <button
                  onClick={handleCopyLink}
                  className="glass-btn glass-btn-primary"
                  style={styles.copyBtn}
                >
                  {copiedLink ? <Check size={18} /> : <Copy size={18} />}
                  <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Social Share Grid */}
            <div style={styles.section}>
              <h4 style={styles.sectionTitle}>Share to Socials</h4>
              <div style={styles.socialRow}>
                <a href={socialShares.facebook} target="_blank" rel="noopener noreferrer" style={{ ...styles.socialBtn, backgroundColor: '#1877f2' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                  </svg>
                </a>
                <a href={socialShares.linkedin} target="_blank" rel="noopener noreferrer" style={{ ...styles.socialBtn, backgroundColor: '#0a66c2' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
                    <rect width="4" height="12" x="2" y="9"/>
                    <circle cx="4" cy="4" r="2"/>
                  </svg>
                </a>
                <a href={socialShares.whatsapp} target="_blank" rel="noopener noreferrer" style={{ ...styles.socialBtn, backgroundColor: '#25d366' }}>
                  <MessageCircle size={18} />
                </a>
                <a href={socialShares.telegram} target="_blank" rel="noopener noreferrer" style={{ ...styles.socialBtn, backgroundColor: '#0088cc' }}>
                  <Send size={18} />
                </a>
                <a href={socialShares.email} style={{ ...styles.socialBtn, backgroundColor: '#ea4335' }}>
                  <Mail size={18} />
                </a>
              </div>
            </div>

            {/* QR Code */}
            <div style={styles.section}>
              <h4 style={styles.sectionTitle}>QR Code</h4>
              <div style={styles.qrCard} className="glass-card">
                {qrBlobUrl ? (
                  <div style={styles.qrContent}>
                    <img src={qrBlobUrl} alt="Flipbook QR Code" style={styles.qrImage} />
                    <a
                      href={qrBlobUrl}
                      download={`${flipbook.slug}-qr.png`}
                      className="glass-btn glass-btn-secondary"
                      style={styles.qrDownloadBtn}
                    >
                      <Download size={16} />
                      Download PNG
                    </a>
                  </div>
                ) : (
                  <div style={styles.qrPlaceholder}>
                    <div style={styles.spinner}></div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Embed customizer */}
          <div style={styles.rightColumn} className="glass-card">
            <div style={styles.embedHeader}>
              <Settings2 size={18} style={{ color: 'var(--primary-light)' }} />
              <h4 style={{ margin: 0 }}>Embed Customizer</h4>
            </div>

            {/* Config controls */}
            <div style={styles.configControls}>
              <div style={styles.controlRow}>
                <div style={styles.controlItem}>
                  <label style={styles.controlLabel}>Width</label>
                  <input
                    type="text"
                    className="glass-input"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    style={styles.inlineInput}
                  />
                </div>
                <div style={styles.controlItem}>
                  <label style={styles.controlLabel}>Height (px)</label>
                  <input
                    type="text"
                    className="glass-input"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    style={styles.inlineInput}
                  />
                </div>
              </div>

              <div style={styles.controlItem}>
                <label style={styles.controlLabel}>Theme</label>
                <div style={styles.themeSelector}>
                  <button
                    onClick={() => setTheme('dark')}
                    style={{
                      ...styles.themeBtn,
                      backgroundColor: theme === 'dark' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                      color: '#ffffff'
                    }}
                  >
                    Dark Theme
                  </button>
                  <button
                    onClick={() => setTheme('light')}
                    style={{
                      ...styles.themeBtn,
                      backgroundColor: theme === 'light' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                      color: '#ffffff'
                    }}
                  >
                    Light Theme
                  </button>
                </div>
              </div>

              <div style={styles.checkboxGrid}>
                <label style={styles.embedCheckboxLabel}>
                  <input
                    type="checkbox"
                    checked={showToolbar}
                    onChange={(e) => setShowToolbar(e.target.checked)}
                    style={styles.checkbox}
                  />
                  <span>Show Toolbar</span>
                </label>
                <label style={styles.embedCheckboxLabel}>
                  <input
                    type="checkbox"
                    checked={allowDownload}
                    onChange={(e) => setAllowDownload(e.target.checked)}
                    style={styles.checkbox}
                  />
                  <span>Allow PDF Download</span>
                </label>
                <label style={styles.embedCheckboxLabel}>
                  <input
                    type="checkbox"
                    checked={allowPrint}
                    onChange={(e) => setAllowPrint(e.target.checked)}
                    style={styles.checkbox}
                  />
                  <span>Allow Print</span>
                </label>
                <label style={styles.embedCheckboxLabel}>
                  <input
                    type="checkbox"
                    checked={autoFlip}
                    onChange={(e) => setAutoFlip(e.target.checked)}
                    style={styles.checkbox}
                  />
                  <span>Auto Flip Pages</span>
                </label>
                <label style={styles.embedCheckboxLabel}>
                  <input
                    type="checkbox"
                    checked={showPageNumbers}
                    onChange={(e) => setShowPageNumbers(e.target.checked)}
                    style={styles.checkbox}
                  />
                  <span>Show Page Numbers</span>
                </label>
              </div>
            </div>

            {/* Generated Iframe Code */}
            <div style={styles.iframeSection}>
              <label style={styles.controlLabel}>Iframe Embed Code</label>
              <textarea
                readOnly
                className="glass-input"
                value={iframeCode}
                style={styles.iframeTextarea}
              />
              <button
                onClick={handleCopyEmbed}
                className="glass-btn glass-btn-primary"
                style={styles.embedCopyBtn}
              >
                {copiedEmbed ? <Check size={16} /> : <Copy size={16} />}
                <span>{copiedEmbed ? 'Copied Embed Code' : 'Copy Embed Code'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(3, 5, 10, 0.8)',
    backdropFilter: 'blur(8px)',
    zIndex: 1000,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '24px',
  },
  modal: {
    width: '100%',
    maxWidth: '920px',
    padding: '32px',
    backgroundColor: 'rgba(10, 15, 30, 0.95)',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '28px',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '16px',
  },
  title: {
    fontSize: '1.4rem',
    color: '#ffffff',
  },
  subtitle: {
    color: 'var(--text-secondary)',
    fontSize: '0.85rem',
    marginTop: '2px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background var(--transition-fast)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '32px',
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  sectionTitle: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  copyWrapper: {
    display: 'flex',
    gap: '10px',
  },
  copyInput: {
    flex: 1,
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
  },
  copyBtn: {
    flexShrink: 0,
    padding: '0 16px',
  },
  socialRow: {
    display: 'flex',
    gap: '12px',
  },
  socialBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    color: '#ffffff',
    transition: 'transform var(--transition-fast), opacity var(--transition-fast)',
  },
  qrCard: {
    padding: '20px',
    background: 'rgba(255,255,255,0.02)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
  qrImage: {
    width: '180px',
    height: '180px',
    borderRadius: '8px',
    border: '4px solid #ffffff',
  },
  qrDownloadBtn: {
    padding: '8px 16px',
    fontSize: '0.85rem',
  },
  qrPlaceholder: {
    width: '180px',
    height: '180px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    width: '24px',
    height: '24px',
    border: '2px solid rgba(255,255,255,0.05)',
    borderTop: '2px solid var(--primary)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  rightColumn: {
    padding: '24px',
    background: 'rgba(255,255,255,0.01)',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  embedHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '12px',
  },
  configControls: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  controlRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  controlItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  controlLabel: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
  inlineInput: {
    padding: '8px 12px',
  },
  themeSelector: {
    display: 'flex',
    gap: '10px',
  },
  themeBtn: {
    flex: 1,
    padding: '10px',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '500',
    transition: 'all var(--transition-fast)',
  },
  checkboxGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '12px',
    marginTop: '8px',
  },
  embedCheckboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  },
  checkbox: {
    accentColor: 'var(--primary)',
    width: '16px',
    height: '16px',
  },
  iframeSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: 'auto',
  },
  iframeTextarea: {
    height: '80px',
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    fontFamily: 'monospace',
    resize: 'none',
    padding: '10px',
  },
  embedCopyBtn: {
    width: '100%',
    padding: '10px',
    fontSize: '0.9rem',
  },
};

import React, { useState, useEffect } from 'react';
import { X, Shield, Lock, Eye, Calendar, Globe, AlertCircle, Save } from 'lucide-react';
import { apiRequest } from '../services/api.js';

interface Flipbook {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  originalPdfPath: string;
  thumbnailPath: string | null;
  pageCount: number;
  fileSize: number;
  visibility: 'PUBLIC' | 'PRIVATE' | 'PASSWORD';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  error: string | null;
  createdAt: string;
  updatedAt: string;
  expirationDate?: string | null;
  disableDownload?: boolean;
  disablePrint?: boolean;
  disableCopy?: boolean;
  requireEmail?: boolean;
  domainRestriction?: string | null;
}

interface FlipbookSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  flipbook: Flipbook | null;
  onUpdate: (updated: Flipbook) => void;
}

export const FlipbookSettingsModal: React.FC<FlipbookSettingsModalProps> = ({
  isOpen,
  onClose,
  flipbook,
  onUpdate,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State variables
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE' | 'PASSWORD'>('PRIVATE');
  const [password, setPassword] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [disableDownload, setDisableDownload] = useState(false);
  const [disablePrint, setDisablePrint] = useState(false);
  const [disableCopy, setDisableCopy] = useState(false);
  const [requireEmail, setRequireEmail] = useState(false);
  const [domainRestriction, setDomainRestriction] = useState('');

  // Hydrate form on flipbook load
  useEffect(() => {
    if (flipbook && isOpen) {
      setTitle(flipbook.title || '');
      setDescription(flipbook.description || '');
      setSlug(flipbook.slug || '');
      setVisibility(flipbook.visibility || 'PRIVATE');
      setPassword(''); // Don't prefill existing hashed passwords for security
      setDisableDownload(!!flipbook.disableDownload);
      setDisablePrint(!!flipbook.disablePrint);
      setDisableCopy(!!flipbook.disableCopy);
      setRequireEmail(!!flipbook.requireEmail);
      setDomainRestriction(flipbook.domainRestriction || '');
      
      if (flipbook.expirationDate) {
        // Format to YYYY-MM-DDTHH:MM for datetime-local input
        const dateObj = new Date(flipbook.expirationDate);
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const hh = String(dateObj.getHours()).padStart(2, '0');
        const min = String(dateObj.getMinutes()).padStart(2, '0');
        setExpirationDate(`${yyyy}-${mm}-${dd}T${hh}:${min}`);
      } else {
        setExpirationDate('');
      }
      setError(null);
    }
  }, [flipbook, isOpen]);

  if (!isOpen || !flipbook) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Basic slug validation
    const slugRegex = /^[a-z0-9-_]+$/i;
    if (slug && !slugRegex.test(slug)) {
      setError('Slug can only contain letters, numbers, hyphens, and underscores.');
      setLoading(false);
      return;
    }

    if (visibility === 'PASSWORD' && !password && !flipbook.visibility) {
      // If setting visibility to PASSWORD for the first time, require password input
      setError('Password is required when visibility is set to Password Protected.');
      setLoading(false);
      return;
    }

    try {
      const body: Record<string, any> = {
        title,
        description,
        slug,
        visibility,
        disableDownload,
        disablePrint,
        disableCopy,
        requireEmail,
        domainRestriction: domainRestriction.trim() || null,
        expirationDate: expirationDate ? new Date(expirationDate).toISOString() : null,
      };

      if (visibility === 'PASSWORD' && password) {
        body.password = password;
      }

      const response = await apiRequest(`/flipbooks/${flipbook.id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });

      onUpdate(response.flipbook);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update flipbook settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.backdrop}>
      <div className="glass-card animate-fade-in" style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.titleWrapper}>
            <Shield size={22} style={{ color: 'var(--primary-light)' }} />
            <h3 style={styles.title}>Flipbook Settings</h3>
          </div>
          <button onClick={onClose} style={styles.closeBtn} disabled={loading}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={styles.errorAlert}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.grid}>
            {/* Left Col: Core Meta & Privacy */}
            <div style={styles.formCol}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Title</label>
                <input
                  type="text"
                  className="glass-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Description</label>
                <textarea
                  className="glass-input"
                  style={styles.textarea}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Custom URL Slug</label>
                <input
                  type="text"
                  className="glass-input"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  required
                />
                <span style={styles.helpText}>URL path: /f/{slug}</span>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Privacy Visibility</label>
                <div style={styles.visibilityRow}>
                  <button
                    type="button"
                    style={{
                      ...styles.visBtn,
                      backgroundColor: visibility === 'PUBLIC' ? 'rgba(0,102,255,0.1)' : 'rgba(255,255,255,0.02)',
                      borderColor: visibility === 'PUBLIC' ? 'var(--primary)' : 'var(--border-color)',
                    }}
                    onClick={() => setVisibility('PUBLIC')}
                  >
                    <Globe size={16} />
                    <span>Public</span>
                  </button>

                  <button
                    type="button"
                    style={{
                      ...styles.visBtn,
                      backgroundColor: visibility === 'PRIVATE' ? 'rgba(0,102,255,0.1)' : 'rgba(255,255,255,0.02)',
                      borderColor: visibility === 'PRIVATE' ? 'var(--primary)' : 'var(--border-color)',
                    }}
                    onClick={() => setVisibility('PRIVATE')}
                  >
                    <Eye size={16} />
                    <span>Private</span>
                  </button>

                  <button
                    type="button"
                    style={{
                      ...styles.visBtn,
                      backgroundColor: visibility === 'PASSWORD' ? 'rgba(0,102,255,0.1)' : 'rgba(255,255,255,0.02)',
                      borderColor: visibility === 'PASSWORD' ? 'var(--primary)' : 'var(--border-color)',
                    }}
                    onClick={() => setVisibility('PASSWORD')}
                  >
                    <Lock size={16} />
                    <span>Password</span>
                  </button>
                </div>
              </div>

              {visibility === 'PASSWORD' && (
                <div style={styles.formGroup} className="animate-fade-in">
                  <label style={styles.label}>Set Lock Password</label>
                  <input
                    type="password"
                    className="glass-input"
                    placeholder={flipbook.visibility === 'PASSWORD' ? '•••••••• (Enter new to replace)' : 'Enter password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Right Col: Expiration & Protections */}
            <div style={styles.formCol}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Link Expiration Date</label>
                <div style={styles.datePickerWrapper}>
                  <Calendar size={16} style={styles.dateIcon} />
                  <input
                    type="datetime-local"
                    className="glass-input"
                    style={styles.dateInput}
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                  />
                  {expirationDate && (
                    <button
                      type="button"
                      onClick={() => setExpirationDate('')}
                      style={styles.clearDateBtn}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Domain Restrictions</label>
                <input
                  type="text"
                  className="glass-input"
                  placeholder="e.g. example.com, mysite.org"
                  value={domainRestriction}
                  onChange={(e) => setDomainRestriction(e.target.value)}
                />
                <span style={styles.helpText}>Comma-separated whitelist of allowed host domains</span>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Security Features</label>
                <div style={styles.checkboxList}>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={disableDownload}
                      onChange={(e) => setDisableDownload(e.target.checked)}
                      style={styles.checkbox}
                    />
                    <div>
                      <div style={styles.checkText}>Disable Download</div>
                      <div style={styles.checkSub}>Prevent readers from downloading the original PDF</div>
                    </div>
                  </label>

                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={disablePrint}
                      onChange={(e) => setDisablePrint(e.target.checked)}
                      style={styles.checkbox}
                    />
                    <div>
                      <div style={styles.checkText}>Disable Printing</div>
                      <div style={styles.checkSub}>Disable browser print operations for viewers</div>
                    </div>
                  </label>

                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={disableCopy}
                      onChange={(e) => setDisableCopy(e.target.checked)}
                      style={styles.checkbox}
                    />
                    <div>
                      <div style={styles.checkText}>Disable Text Copying</div>
                      <div style={styles.checkSub}>Block text selections on canvas viewer layers</div>
                    </div>
                  </label>

                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={requireEmail}
                      onChange={(e) => setRequireEmail(e.target.checked)}
                      style={styles.checkbox}
                    />
                    <div>
                      <div style={styles.checkText}>Require Email (Lead Wall)</div>
                      <div style={styles.checkSub}>Capture email lead wall before opening document</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div style={styles.footer}>
            <button
              type="button"
              onClick={onClose}
              className="glass-btn glass-btn-secondary"
              disabled={loading}
              style={styles.actionBtn}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="glass-btn glass-btn-primary"
              disabled={loading}
              style={styles.actionBtn}
            >
              <Save size={16} />
              <span>{loading ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
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
    maxWidth: '820px',
    padding: '32px',
    backgroundColor: 'rgba(10, 15, 30, 0.95)',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '16px',
  },
  titleWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  title: {
    fontSize: '1.25rem',
    color: '#ffffff',
    margin: 0,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    padding: '12px 16px',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--error)',
    fontSize: '0.85rem',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '32px',
  },
  formCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    fontWeight: '600',
  },
  textarea: {
    height: '80px',
    resize: 'none',
  },
  helpText: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginTop: '2px',
  },
  visibilityRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '12px',
  },
  visBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px 0',
    border: '1px solid',
    borderRadius: 'var(--radius-sm)',
    color: '#ffffff',
    fontSize: '0.85rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  datePickerWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  dateIcon: {
    position: 'absolute',
    left: '16px',
    color: 'var(--text-muted)',
    pointerEvents: 'none',
  },
  dateInput: {
    paddingLeft: '48px',
    flex: 1,
  },
  clearDateBtn: {
    position: 'absolute',
    right: '16px',
    background: 'none',
    border: 'none',
    color: 'var(--primary-light)',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: '500',
  },
  checkboxList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    backgroundColor: 'rgba(255,255,255,0.01)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    padding: '16px',
  },
  checkboxLabel: {
    display: 'flex',
    gap: '12px',
    cursor: 'pointer',
  },
  checkbox: {
    accentColor: 'var(--primary)',
    width: '16px',
    height: '16px',
    marginTop: '2px',
    flexShrink: 0,
  },
  checkText: {
    fontSize: '0.85rem',
    color: '#ffffff',
    fontWeight: '500',
  },
  checkSub: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginTop: '2px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    borderTop: '1px solid var(--border-color)',
    paddingTop: '20px',
  },
  actionBtn: {
    padding: '10px 20px',
    fontSize: '0.9rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
  },
};

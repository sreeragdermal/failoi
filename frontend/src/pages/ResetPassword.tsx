import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Lock, ArrowRight, ArrowLeft } from 'lucide-react';
import { apiRequest } from '../services/api.js';

export const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setError('Invalid or missing reset token. Please request a new link.');
      return;
    }

    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      <div className="glass-card animate-fade-in" style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logoCircle}>
            <span style={styles.logoText}>F</span>
          </div>
          <h2 style={styles.title}>Choose a new password</h2>
          <p style={styles.subtitle}>Create a strong, secure password for your account</p>
        </div>

        {!token && (
          <div style={styles.errorAlert}>
            <p>Invalid or missing password reset token. Please request a new link.</p>
            <Link to="/forgot-password" className="glass-btn glass-btn-secondary" style={{ width: '100%', marginTop: '16px' }}>
              Request reset link
            </Link>
          </div>
        )}

        {token && (
          <>
            {success ? (
              <div style={styles.successContainer}>
                <div style={styles.successAlert}>
                  <p>Your password has been successfully reset. You can now sign in using your new password.</p>
                </div>
                <Link to="/login" className="glass-btn glass-btn-primary" style={styles.submitBtn}>
                  Go to Sign In
                  <ArrowRight size={18} style={{ marginLeft: '8px' }} />
                </Link>
              </div>
            ) : (
              <>
                {error && (
                  <div style={styles.errorAlert}>
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} style={styles.form}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>New Password</label>
                    <div style={styles.inputWrapper}>
                      <Lock style={styles.icon} size={18} />
                      <input
                        type="password"
                        className="glass-input"
                        style={styles.inputWithIcon}
                        placeholder="Min. 8 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Confirm New Password</label>
                    <div style={styles.inputWrapper}>
                      <Lock style={styles.icon} size={18} />
                      <input
                        type="password"
                        className="glass-input"
                        style={styles.inputWithIcon}
                        placeholder="Re-enter password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="glass-btn glass-btn-primary"
                    style={styles.submitBtn}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Updating password...' : 'Update Password'}
                    {!isSubmitting && <ArrowRight size={18} />}
                  </button>
                </form>
              </>
            )}
          </>
        )}

        <p style={styles.footerText}>
          <Link to="/login" style={styles.footerLink}>
            <ArrowLeft size={16} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    width: '100vw',
    padding: '24px',
    backgroundColor: 'var(--bg-darker)',
  },
  card: {
    width: '100%',
    maxWidth: '440px',
    padding: '40px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  logoCircle: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--primary) 0%, #00d2ff 100%)',
    marginBottom: '16px',
    boxShadow: 'var(--shadow-sm)',
  },
  logoText: {
    fontFamily: 'var(--font-display)',
    fontWeight: 'bold',
    fontSize: '20px',
    color: '#ffffff',
  },
  title: {
    fontSize: '1.8rem',
    marginBottom: '8px',
    color: '#ffffff',
  },
  subtitle: {
    color: 'var(--text-secondary)',
    fontSize: '0.9rem',
  },
  errorAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    padding: '12px 16px',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--error)',
    fontSize: '0.9rem',
    marginBottom: '24px',
  },
  successContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  successAlert: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    padding: '16px',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--success)',
    fontSize: '0.9rem',
    lineHeight: '1.5',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  icon: {
    position: 'absolute',
    left: '16px',
    color: 'var(--text-muted)',
    pointerEvents: 'none',
  },
  inputWithIcon: {
    paddingLeft: '48px',
  },
  submitBtn: {
    width: '100%',
    marginTop: '8px',
  },
  footerText: {
    textAlign: 'center',
    marginTop: '28px',
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
  },
  footerLink: {
    fontWeight: '500',
    color: 'var(--primary-light)',
    display: 'inline-flex',
    alignItems: 'center',
  },
};

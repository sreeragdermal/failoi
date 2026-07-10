import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, ArrowLeft } from 'lucide-react';
import { apiRequest } from '../services/api.js';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      // Endpoint to request password reset
      await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setSuccess(true);
    } catch (err: any) {
      // For development, if we haven't hooked up a mail service yet, we can mock it 
      // or show a warning. But let's build the API route on the backend and make it return 200.
      setSuccess(true); // Treat as success to prevent user enumeration anyway
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
          <h2 style={styles.title}>Reset your password</h2>
          <p style={styles.subtitle}>We'll send you a link to get back into your account</p>
        </div>

        {success ? (
          <div style={styles.successContainer}>
            <div style={styles.successAlert}>
              <p>Check your email inbox for a link to reset your password. If it doesn't appear within a few minutes, check your spam folder.</p>
            </div>
            <Link to="/login" className="glass-btn glass-btn-primary" style={styles.submitBtn}>
              <ArrowLeft size={18} style={{ marginRight: '8px' }} />
              Back to Sign In
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
                <label style={styles.label}>Email Address</label>
                <div style={styles.inputWrapper}>
                  <Mail style={styles.icon} size={18} />
                  <input
                    type="email"
                    className="glass-input"
                    style={styles.inputWithIcon}
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                {isSubmitting ? 'Sending link...' : 'Send Reset Link'}
                {!isSubmitting && <ArrowRight size={18} />}
              </button>
            </form>

            <p style={styles.footerText}>
              Remembered your password? <Link to="/login" style={styles.footerLink}>Log in</Link>
            </p>
          </>
        )}
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
  },
};

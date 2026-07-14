import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { Lock, Mail, User, ArrowRight, Eye, EyeOff } from 'lucide-react';

export const Register: React.FC = () => {
  const { register, user } = useAuth();
  const navigate = useNavigate();

  // Redirect to dashboard or custom destination immediately if already authenticated
  useEffect(() => {
    if (user) {
      const returnTo = sessionStorage.getItem('failoi_auth_return_to');
      if (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//') && !returnTo.includes('http://') && !returnTo.includes('https://')) {
        sessionStorage.removeItem('failoi_auth_return_to');
        navigate(returnTo, { replace: true });
      } else {
        sessionStorage.removeItem('failoi_auth_return_to');
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, navigate]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !password || !confirmPassword) {
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

    if (!agreeTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await register(email, password, name);
      const returnTo = sessionStorage.getItem('failoi_auth_return_to');
      if (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//') && !returnTo.includes('http://') && !returnTo.includes('https://')) {
        sessionStorage.removeItem('failoi_auth_return_to');
        navigate(returnTo, { replace: true });
      } else {
        sessionStorage.removeItem('failoi_auth_return_to');
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
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
          <h2 style={styles.title}>Create your account</h2>
          <p style={styles.subtitle}>Get started with FAILOI today</p>
        </div>

        {error && (
          <div style={styles.errorAlert}>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Full Name</label>
            <div style={styles.inputWrapper}>
              <User style={styles.icon} size={18} />
              <input
                type="text"
                className="glass-input"
                style={styles.inputWithIcon}
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

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

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrapper}>
              <Lock style={styles.icon} size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                className="glass-input"
                style={styles.inputWithIcon}
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Confirm Password</label>
            <div style={styles.inputWrapper}>
              <Lock style={styles.icon} size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
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

          <div style={styles.rememberRow}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                style={styles.checkbox}
                disabled={isSubmitting}
              />
              <span style={styles.checkboxText}>
                I agree to the <a href="#terms">Terms of Service</a> & <a href="#privacy">Privacy Policy</a>
              </span>
            </label>
          </div>

          <button
            type="submit"
            className="glass-btn glass-btn-primary"
            style={styles.submitBtn}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating account...' : 'Create Account'}
            {!isSubmitting && <ArrowRight size={18} />}
          </button>
        </form>

        <p style={styles.footerText}>
          Already have an account? <Link to="/login" style={styles.footerLink}>Log in</Link>
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
  eyeBtn: {
    position: 'absolute',
    right: '12px',
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rememberRow: {
    display: 'flex',
    alignItems: 'center',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    userSelect: 'none',
  },
  checkbox: {
    accentColor: 'var(--primary)',
    cursor: 'pointer',
    width: '16px',
    height: '16px',
  },
  checkboxText: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
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

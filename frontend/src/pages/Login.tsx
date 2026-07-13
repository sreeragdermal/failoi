import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { BASE_URL } from '../services/api.js';
import { Lock, Mail, ArrowRight, Eye, EyeOff } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, verify2FALogin, setOAuthSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // 2FA States
  const [is2FARequired, setIs2FARequired] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [tempToken, setTempToken] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const oauthError = params.get('error');

    if (token) {
      console.log('[Google OAuth] Frontend received authentication token from callback redirect');
      setOAuthSession(token)
        .then(() => {
          // Remove OAuth token query parameters from the address bar to prevent reprocessing on refresh
          window.history.replaceState({}, document.title, window.location.pathname);
          console.log('[Google OAuth] Session context restored. Redirecting authenticated user to:', from);
          navigate(from, { replace: true });
        })
        .catch((err: any) => {
          setError(err.message || 'Failed to authenticate Google session');
        });
    } else if (oauthError) {
      console.error('[Google OAuth] Frontend received OAuth error:', oauthError);
      setError(`Google login failed: ${oauthError.replace(/_/g, ' ')}`);
      // Clear URL params to allow fresh logins
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location, setOAuthSession, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await login(email, password, rememberMe);
      if (res && res.status === '2FA_REQUIRED') {
        setIs2FARequired(true);
        setTempToken(res.tempToken);
        setError(null);
      } else {
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpCode || totpCode.length !== 6) {
      setError('Please enter a valid 6-digit authentication code');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await verify2FALogin(tempToken, totpCode);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Invalid authentication code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${BASE_URL}/auth/google`;
  };

  return (
    <div style={styles.container}>
      <div className="glass-card animate-fade-in" style={styles.card}>
        {is2FARequired ? (
          <>
            <div style={styles.header}>
              <div style={styles.logoCircle}>
                <span style={styles.logoText}>🔒</span>
              </div>
              <h2 style={styles.title}>Two-Factor Security</h2>
              <p style={styles.subtitle}>Enter the 6-digit code from your authentication application.</p>
            </div>

            {error && (
              <div style={styles.errorAlert}>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handle2FASubmit} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Security Verification Code</label>
                <div style={styles.inputWrapper}>
                  <input
                    type="text"
                    maxLength={6}
                    className="glass-input"
                    style={{ paddingLeft: '16px', letterSpacing: '0.4em', textAlign: 'center', fontSize: '1.25rem', fontFamily: 'monospace' }}
                    placeholder="000000"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="glass-btn glass-btn-primary"
                style={{ ...styles.submitBtn, marginTop: '24px' }}
                disabled={isSubmitting || totpCode.length !== 6}
              >
                {isSubmitting ? 'Verifying...' : 'Verify Code'}
                {!isSubmitting && <ArrowRight size={18} />}
              </button>

              <button
                type="button"
                className="glass-btn glass-btn-secondary"
                style={{ ...styles.submitBtn, marginTop: '12px' }}
                onClick={() => {
                  setIs2FARequired(false);
                  setTotpCode('');
                  setError(null);
                }}
                disabled={isSubmitting}
              >
                Back to Sign In
              </button>
            </form>
          </>
        ) : (
          <>
            <div style={styles.header}>
              <div style={styles.logoCircle}>
                <span style={styles.logoText}>F</span>
              </div>
              <h2 style={styles.title}>Welcome back</h2>
              <p style={styles.subtitle}>Enter your details to access your workspace</p>
            </div>

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

              <div style={styles.inputGroup}>
                <div style={styles.labelRow}>
                  <label style={styles.label}>Password</label>
                  <Link to="/forgot-password" style={styles.forgotLink}>Forgot password?</Link>
                </div>
                <div style={styles.inputWrapper}>
                  <Lock style={styles.icon} size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="glass-input"
                    style={styles.inputWithIcon}
                    placeholder="••••••••"
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

              <div style={styles.rememberRow}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={styles.checkbox}
                    disabled={isSubmitting}
                  />
                  <span style={styles.checkboxText}>Remember me for 7 days</span>
                </label>
              </div>

              <button
                type="submit"
                className="glass-btn glass-btn-primary"
                style={styles.submitBtn}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Signing in...' : 'Sign In'}
                {!isSubmitting && <ArrowRight size={18} />}
              </button>
            </form>

            <div style={styles.divider}>
              <div style={styles.dividerLine}></div>
              <span style={styles.dividerText}>or continue with</span>
              <div style={styles.dividerLine}></div>
            </div>

            <button
              onClick={handleGoogleLogin}
              className="glass-btn glass-btn-secondary"
              style={styles.googleBtn}
              disabled={isSubmitting}
            >
              <svg style={styles.googleIcon} viewBox="0 0 24 24" width="18" height="18">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Google
            </button>

            <p style={styles.footerText}>
              Don't have an account? <Link to="/register" style={styles.footerLink}>Sign up free</Link>
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
    animationName: 'fadeIn',
    animationDuration: '0.4s',
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
  labelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    transition: 'color var(--transition-fast)',
  },
  rememberRow: {
    display: 'flex',
    justifyContent: 'space-between',
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
  forgotLink: {
    fontSize: '0.85rem',
    color: 'var(--primary-light)',
    transition: 'color var(--transition-fast)',
  },
  submitBtn: {
    width: '100%',
    marginTop: '8px',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    margin: '24px 0',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  dividerText: {
    padding: '0 12px',
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  googleBtn: {
    width: '100%',
  },
  googleIcon: {
    marginRight: '8px',
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

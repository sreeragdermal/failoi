import React, { useState, useEffect } from 'react';
import { X, User, Key, Check, AlertCircle, Save } from 'lucide-react';
import { apiRequest } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({ isOpen, onClose }) => {
  const { user, checkAuth } = useAuth();

  const [name, setName] = useState('');
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passSuccess, setPassSuccess] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);
  const [passLoading, setPassLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      setName(user.name || '');
      setProfileSuccess(false);
      setProfileError(null);
      
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPassSuccess(false);
      setPassError(null);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileError(null);
    setProfileSuccess(false);

    try {
      await apiRequest('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ name }),
      });
      await checkAuth(); // Re-fetch details to sync global React context
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile details.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassLoading(true);
    setPassError(null);
    setPassSuccess(false);

    if (newPassword !== confirmPassword) {
      setPassError('New passwords do not match.');
      setPassLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setPassError('Password must be at least 6 characters long.');
      setPassLoading(false);
      return;
    }

    try {
      await apiRequest('/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setPassSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPassSuccess(false), 3000);
    } catch (err: any) {
      setPassError(err.message || 'Failed to change password.');
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div style={styles.backdrop}>
      <div className="glass-card animate-fade-in" style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.titleWrapper}>
            <User size={22} style={{ color: 'var(--primary-light)' }} />
            <h3 style={styles.title}>Account Settings</h3>
          </div>
          <button onClick={onClose} style={styles.closeBtn} disabled={profileLoading || passLoading}>
            <X size={20} />
          </button>
        </div>

        <div style={styles.grid}>
          {/* Section 1: Profile Name Edit */}
          <div className="glass-card" style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <User size={18} style={{ color: 'var(--primary-light)' }} />
              <h4 style={{ margin: 0 }}>Update Profile Details</h4>
            </div>

            {profileError && (
              <div style={styles.errorAlert}>
                <AlertCircle size={16} />
                <span>{profileError}</span>
              </div>
            )}

            {profileSuccess && (
              <div style={styles.successAlert}>
                <Check size={16} />
                <span>Profile updated successfully!</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Email Address (Read-only)</label>
                <input
                  type="text"
                  className="glass-input"
                  value={user?.email || ''}
                  disabled
                  style={styles.disabledInput}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Display Name</label>
                <input
                  type="text"
                  className="glass-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="glass-btn glass-btn-primary"
                disabled={profileLoading}
                style={styles.submitBtn}
              >
                <Save size={16} />
                <span>{profileLoading ? 'Updating...' : 'Save Name'}</span>
              </button>
            </form>
          </div>

          {/* Section 2: Password Change */}
          <div className="glass-card" style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <Key size={18} style={{ color: '#a855f7' }} />
              <h4 style={{ margin: 0 }}>Change Account Password</h4>
            </div>

            {passError && (
              <div style={styles.errorAlert}>
                <AlertCircle size={16} />
                <span>{passError}</span>
              </div>
            )}

            {passSuccess && (
              <div style={styles.successAlert}>
                <Check size={16} />
                <span>Password changed successfully!</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Current Password</label>
                <input
                  type="password"
                  className="glass-input"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>New Password</label>
                <input
                  type="password"
                  className="glass-input"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Confirm New Password</label>
                <input
                  type="password"
                  className="glass-input"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="glass-btn glass-btn-primary"
                disabled={passLoading}
                style={{ ...styles.submitBtn, background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)' }}
              >
                <Save size={16} />
                <span>{passLoading ? 'Changing...' : 'Change Password'}</span>
              </button>
            </form>
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
    marginBottom: '28px',
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
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '32px',
  },
  sectionCard: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    background: 'rgba(255,255,255,0.01)',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '12px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    fontWeight: '600',
  },
  disabledInput: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  errorAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--error)',
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  successAlert: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--success)',
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  submitBtn: {
    width: '100%',
    padding: '10px',
    fontSize: '0.9rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginTop: '8px',
  },
};

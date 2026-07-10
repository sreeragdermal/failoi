import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest, API_HOST } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import { 
  ArrowLeft, Users, Folder, Eye, HardDrive, Activity, 
  Trash2, Search, AlertTriangle, Shield, Key, Database,
  Settings, Mail, RefreshCw, Play, Pause, Download, FileText, CheckCircle,
  Smartphone, Monitor, Laptop, AlertCircle, Trash
} from 'lucide-react';

interface StatsReport {
  uptime: number;
  totalUsers: number;
  totalFlipbooks: number;
  totalStorage: number;
  totalViews: number;
  recentActivity: {
    id: string;
    title: string;
    creatorEmail: string;
    creatorName: string;
    fileSize: number;
    status: string;
    createdAt: string;
  }[];
}

interface UserAccount {
  id: string;
  email: string;
  name: string;
  role: 'GUEST' | 'REGISTERED' | 'PREMIUM' | 'ADMIN' | 'SUPER_ADMIN';
  createdAt: string;
  flipbookCount: number;
  storageUsed: number;
  isSuspended: boolean;
  lockedUntil: string | null;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
}

interface GlobalFlipbook {
  id: string;
  title: string;
  slug: string;
  creatorEmail: string;
  creatorName: string;
  fileSize: number;
  pageCount: number;
  visibility: string;
  status: string;
  createdAt: string;
}

// Super Admin Interfaces
interface ActiveSession {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  device: string;
  browser: string;
  os: string;
  country: string;
  ipAddress: string;
  loginTime: string;
  lastActivity: string;
}

interface TelemetryReport {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  databaseStatus: string;
  workerQueue: number;
  uploadsProcessing: number;
  backgroundJobs: number;
  apiResponseTime: number;
  storageUsage: number;
  maxStorage: number;
  activeUsers: number;
}

interface ApiKeyRecord {
  id: string;
  name: string;
  permissions: string[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  usageCount: number;
  isActive: boolean;
  createdAt: string;
}

interface SecurityAlertRecord {
  id: string;
  type: string;
  description: string;
  severity: string;
  ipAddress: string | null;
  browser: string | null;
  createdAt: string;
}

interface IpRuleRecord {
  id: string;
  ipAddress: string;
  type: 'WHITELIST' | 'BLACKLIST';
  notes: string | null;
  createdAt: string;
}

interface SystemLogRecord {
  id: string;
  type: string;
  level: string;
  message: string;
  details: string | null;
  createdAt: string;
}

interface AuditLogRecord {
  id: string;
  userId: string | null;
  userEmail: string | null;
  action: string;
  module: string;
  timestamp: string;
  ipAddress: string | null;
  browser: string | null;
  os: string | null;
  targetResource: string | null;
  beforeValue: string | null;
  afterValue: string | null;
}

interface BackupFile {
  name: string;
  size: number;
  createdAt: string;
}

interface AdminNotification {
  id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export const AdminDashboard: React.FC = () => {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  // Tabs layout selection
  type TabType = 'overview' | 'users' | 'flipbooks' | 'sessions' | 'security' | 'apikeys' | 'storage' | 'jobs' | 'email' | 'backups' | 'logs' | 'settings';
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  
  // Base Data States
  const [stats, setStats] = useState<StatsReport | null>(null);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [flipbooks, setFlipbooks] = useState<GlobalFlipbook[]>([]);
  
  // Super Admin Data States
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryReport | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKeyRecord[]>([]);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlertRecord[]>([]);
  const [ipRules, setIpRules] = useState<IpRuleRecord[]>([]);
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLogRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  
  // Config state keys
  const [appSettings, setAppSettings] = useState<Record<string, string>>({});
  const [emailConfigs, setEmailConfigs] = useState<Record<string, string>>({});

  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Query States
  const [userQuery, setUserQuery] = useState('');
  const [bookQuery, setBookQuery] = useState('');
  const [logTypeQuery, setLogTypeQuery] = useState('');
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [auditSearchQuery, setAuditSearchQuery] = useState('');

  // Action input states
  const [newIp, setNewIp] = useState('');
  const [newIpType, setNewIpType] = useState<'WHITELIST' | 'BLACKLIST'>('BLACKLIST');
  const [newIpNotes, setNewIpNotes] = useState('');
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyPerms, setNewKeyPerms] = useState<string[]>(['READ_FLIPBOOKS']);
  const [createdRawKey, setCreatedRawKey] = useState<string | null>(null);
  const [testEmailAddr, setTestEmailAddr] = useState('');

  const initData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load standard logs & data
      const statsRes = await apiRequest('/admin/stats');
      setStats(statsRes.stats);

      const usersRes = await apiRequest('/admin/users');
      setUsers(usersRes.users);

      const flipbooksRes = await apiRequest('/admin/flipbooks');
      setFlipbooks(flipbooksRes.flipbooks);

      if (isSuperAdmin) {
        // Load Super Admin logs
        await fetchTelemetry();
        await fetchSessions();
        await fetchSecurityData();
        await fetchApiKeys();
        await fetchBackups();
        await fetchSettings();
        await fetchLogs();
        await fetchNotifications();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initialize workspace data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initData();
  }, [isSuperAdmin]);

  // Fetch helpers
  const fetchTelemetry = async () => {
    const res = await apiRequest('/admin/monitor');
    setTelemetry(res.telemetry);
  };

  const fetchSessions = async () => {
    const res = await apiRequest('/admin/sessions');
    setSessions(res.sessions);
  };

  const fetchSecurityData = async () => {
    await apiRequest('/admin/security/stats');
    const alertsRes = await apiRequest('/admin/security/alerts');
    const rulesRes = await apiRequest('/admin/security/ip-rules');
    setSecurityAlerts(alertsRes.alerts);
    setIpRules(rulesRes.rules);
  };

  const fetchApiKeys = async () => {
    const res = await apiRequest('/admin/apikeys');
    setApiKeys(res.keys);
  };

  const fetchBackups = async () => {
    const res = await apiRequest('/admin/backups');
    setBackups(res.backups);
  };

  const fetchSettings = async () => {
    const settingsRes = await apiRequest('/admin/settings');
    setAppSettings(settingsRes.settings);

    const emailRes = await apiRequest('/admin/settings/email');
    setEmailConfigs(emailRes.configs);
  };

  const fetchLogs = async () => {
    const systemRes = await apiRequest(`/admin/logs/system?type=${logTypeQuery}&search=${logSearchQuery}`);
    const auditRes = await apiRequest(`/admin/logs/audit?search=${auditSearchQuery}`);
    setSystemLogs(systemRes.logs);
    setAuditLogs(auditRes.logs);
  };

  const fetchNotifications = async () => {
    const res = await apiRequest('/admin/notifications');
    setNotifications(res.notifications);
  };

  // Base Actions
  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await apiRequest(`/admin/users/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole }),
      });
      setUsers(users.map((u) => u.id === userId ? { ...u, role: newRole as any } : u));
      alert('User role updated successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to update role.');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('WARNING: Deleting this user will permanently remove all their flipbooks and data. Proceed?')) {
      return;
    }
    try {
      await apiRequest(`/admin/users/${userId}`, { method: 'DELETE' });
      setUsers(users.filter((u) => u.id !== userId));
      initData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete user.');
    }
  };

  const handleDeleteFlipbook = async (bookId: string) => {
    if (!window.confirm('Are you sure you want to delete this flipbook? Irreversible.')) {
      return;
    }
    try {
      await apiRequest(`/admin/flipbooks/${bookId}`, { method: 'DELETE' });
      setFlipbooks(flipbooks.filter((f) => f.id !== bookId));
      initData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete flipbook.');
    }
  };

  // Impersonation
  const handleImpersonate = async (userId: string) => {
    const reason = prompt('Please enter a reason for this impersonation audit trail (optional):');
    try {
      const res = await apiRequest(`/admin/impersonate/${userId}`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason || 'Super Admin Impersonation' })
      });
      alert(res.message);
      // Hard reload context into target user session
      window.location.href = '/dashboard';
    } catch (err: any) {
      alert(err.message || 'Impersonation failed');
    }
  };

  // Emergency Access Actions
  const handleEmergencyAction = async (userId: string, actionType: string) => {
    if (!window.confirm(`Are you sure you want to trigger emergency [${actionType}]?`)) return;
    try {
      const res = await apiRequest(`/admin/users/${userId}/${actionType}`, { method: 'POST' });
      alert(res.message);
      const updatedList = await apiRequest('/admin/users');
      setUsers(updatedList.users);
    } catch (err: any) {
      alert(err.message || 'Emergency trigger failed');
    }
  };

  // Session Actions
  const handleRevokeSession = async (sessId: string) => {
    if (!window.confirm('Terminate this session? User will be forced to log in again.')) return;
    try {
      await apiRequest(`/admin/sessions/${sessId}`, { method: 'DELETE' });
      setSessions(sessions.filter((s) => s.id !== sessId));
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Block IPs
  const handleAddIpRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/admin/security/ip-rules', {
        method: 'POST',
        body: JSON.stringify({ ipAddress: newIp, type: newIpType, notes: newIpNotes })
      });
      setNewIp('');
      setNewIpNotes('');
      fetchSecurityData();
      alert('IP configuration saved successfully');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteIpRule = async (id: string) => {
    try {
      await apiRequest(`/admin/security/ip-rules/${id}`, { method: 'DELETE' });
      fetchSecurityData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // API Keys
  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/admin/apikeys', {
        method: 'POST',
        body: JSON.stringify({ name: newKeyName, permissions: newKeyPerms })
      });
      setCreatedRawKey(res.rawKey);
      setNewKeyName('');
      fetchApiKeys();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleApiKey = async (id: string, current: boolean) => {
    try {
      await apiRequest(`/admin/apikeys/${id}/toggle`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !current })
      });
      fetchApiKeys();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteApiKey = async (id: string) => {
    if (!window.confirm('Permanently delete this API key?')) return;
    try {
      await apiRequest(`/admin/apikeys/${id}`, { method: 'DELETE' });
      fetchApiKeys();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Jobs Queue
  const handlePauseQueue = async () => {
    try {
      await apiRequest('/admin/jobs/pause', { method: 'POST' });
      initData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResumeQueue = async () => {
    try {
      await apiRequest('/admin/jobs/resume', { method: 'POST' });
      initData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRetryJob = async (id: string) => {
    try {
      const res = await apiRequest(`/admin/jobs/${id}/retry`, { method: 'POST' });
      alert(res.message);
      initData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReprocessJob = async (id: string) => {
    try {
      const res = await apiRequest(`/admin/jobs/${id}/reprocess`, { method: 'POST' });
      alert(res.message);
      initData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteJob = async (id: string) => {
    if (!window.confirm('Delete job record and files?')) return;
    try {
      const res = await apiRequest(`/admin/jobs/${id}`, { method: 'DELETE' });
      alert(res.message);
      initData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Storage
  const handleRebuildThumbnail = async (id: string) => {
    try {
      await apiRequest(`/admin/storage/rebuild/${id}`, { method: 'POST' });
      alert('Thumbnail cover generated successfully');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRegeneratePages = async (id: string) => {
    try {
      await apiRequest(`/admin/storage/regenerate/${id}`, { method: 'POST' });
      alert('Flipbook sent back to processing queue');
      initData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // const _handleDeleteUnusedFile = async (relPath: string) => {
  //   if (!window.confirm(`Delete unused file [${relPath}] from disk?`)) return;
  //   try {
  //     const encoded = btoa(relPath);
  //     const res = await apiRequest(`/admin/storage/files/${encoded}`, { method: 'DELETE' });
  //     alert(res.message);
  //     initData();
  //   } catch (err: any) {
  //     alert(err.message);
  //   }
  // };

  // Backups
  const handleCreateBackup = async (type: 'db' | 'storage' | 'settings') => {
    try {
      const res = await apiRequest(`/admin/backup/${type}`, { method: 'POST' });
      alert(res.message);
      fetchBackups();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRestoreBackup = async (fileName: string) => {
    if (!window.confirm(`RESTORE database back to snapshot [${fileName}]? This overwrites current table entries.`)) return;
    try {
      const res = await apiRequest('/admin/backup/restore', {
        method: 'POST',
        body: JSON.stringify({ fileName })
      });
      alert(res.message);
      initData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(appSettings)
      });
      alert('General settings saved successfully');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveEmailConfigs = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/admin/settings/email', {
        method: 'PUT',
        body: JSON.stringify(emailConfigs)
      });
      alert('Email server configurations saved successfully');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/admin/settings/email/test', {
        method: 'POST',
        body: JSON.stringify({ recipientEmail: testEmailAddr })
      });
      alert(res.message);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Notifications
  // const _handleMarkNotificationRead = async (id: string) => {
  //   try {
  //     await apiRequest(`/admin/notifications/${id}/read`, { method: 'PUT' });
  //     fetchNotifications();
  //   } catch (err: any) {
  //     console.error(err);
  //   }
  // };

  const handleMarkAllRead = async () => {
    try {
      await apiRequest('/admin/notifications/read-all', { method: 'PUT' });
      fetchNotifications();
    } catch (err: any) {
      console.error(err);
    }
  };

  // Format Helper
  const formatBytes = (bytes: number, decimals = 1) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  const queuePaused = appSettings.queue_paused === 'true';

  // Filters
  const filteredUsers = users.filter(
    (u) => 
      u.email.toLowerCase().includes(userQuery.toLowerCase()) || 
      u.name.toLowerCase().includes(userQuery.toLowerCase())
  );

  const filteredFlipbooks = flipbooks.filter(
    (f) => 
      f.title.toLowerCase().includes(bookQuery.toLowerCase()) || 
      f.creatorEmail.toLowerCase().includes(bookQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div style={styles.fullscreenOverlay}>
        <div style={styles.spinner}></div>
        <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Opening admin panel...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div style={styles.container}>
        <div className="glass-card" style={styles.errorCard}>
          <AlertTriangle size={48} style={{ color: 'var(--error)', marginBottom: '16px' }} />
          <h3 style={{ marginBottom: '12px' }}>Access Prohibited</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{error || 'This workspace is restricted to administrator credentials only.'}</p>
          <Link to="/dashboard" className="glass-btn glass-btn-secondary">
            <ArrowLeft size={16} />
            Back to Workspace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Impersonation Banner Alert */}
      {notifications.some(n => !n.read) && (
        <div style={{
          background: 'rgba(59, 130, 246, 0.15)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: '8px',
          padding: '12px 24px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <AlertCircle size={18} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: '0.85rem' }}>You have {notifications.filter(n => !n.read).length} unread admin alerts.</span>
          </div>
          <button onClick={handleMarkAllRead} style={{ fontSize: '0.75rem', background: 'transparent', color: 'var(--accent)', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
            Mark all read
          </button>
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <Link to="/dashboard" className="glass-btn glass-btn-secondary" style={styles.backBtn}>
          <ArrowLeft size={16} />
          Dashboard
        </Link>
        <div style={styles.headerTitleWrapper}>
          <div style={styles.adminBadgeRow}>
            <h2 style={styles.title}>Admin Control Panel</h2>
            <span style={styles.adminRoleBadge}>{currentUser?.role}</span>
          </div>
          <span style={styles.subtitle}>Manage users, files, server loads, and document privacy settings</span>
        </div>
      </div>

      {/* Tabs Row */}
      <div style={styles.tabsRow}>
        <button onClick={() => setActiveTab('overview')} style={{ ...styles.tabBtn, borderBottom: activeTab === 'overview' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'overview' ? '#ffffff' : 'var(--text-secondary)' }}><Activity size={16} />Overview</button>
        <button onClick={() => setActiveTab('users')} style={{ ...styles.tabBtn, borderBottom: activeTab === 'users' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'users' ? '#ffffff' : 'var(--text-secondary)' }}><Users size={16} />Users ({users.length})</button>
        <button onClick={() => setActiveTab('flipbooks')} style={{ ...styles.tabBtn, borderBottom: activeTab === 'flipbooks' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'flipbooks' ? '#ffffff' : 'var(--text-secondary)' }}><Folder size={16} />Books ({flipbooks.length})</button>
        
        {/* Super Admin Tabs */}
        {isSuperAdmin && (
          <>
            <button onClick={() => setActiveTab('sessions')} style={{ ...styles.tabBtn, borderBottom: activeTab === 'sessions' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'sessions' ? '#ffffff' : 'var(--text-secondary)' }}><Monitor size={16} />Sessions</button>
            <button onClick={() => setActiveTab('security')} style={{ ...styles.tabBtn, borderBottom: activeTab === 'security' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'security' ? '#ffffff' : 'var(--text-secondary)' }}><Shield size={16} />Security</button>
            <button onClick={() => setActiveTab('apikeys')} style={{ ...styles.tabBtn, borderBottom: activeTab === 'apikeys' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'apikeys' ? '#ffffff' : 'var(--text-secondary)' }}><Key size={16} />API Keys</button>
            <button onClick={() => setActiveTab('storage')} style={{ ...styles.tabBtn, borderBottom: activeTab === 'storage' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'storage' ? '#ffffff' : 'var(--text-secondary)' }}><HardDrive size={16} />Storage</button>
            <button onClick={() => setActiveTab('jobs')} style={{ ...styles.tabBtn, borderBottom: activeTab === 'jobs' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'jobs' ? '#ffffff' : 'var(--text-secondary)' }}><RefreshCw size={16} />Jobs</button>
            <button onClick={() => setActiveTab('email')} style={{ ...styles.tabBtn, borderBottom: activeTab === 'email' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'email' ? '#ffffff' : 'var(--text-secondary)' }}><Mail size={16} />Email</button>
            <button onClick={() => setActiveTab('backups')} style={{ ...styles.tabBtn, borderBottom: activeTab === 'backups' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'backups' ? '#ffffff' : 'var(--text-secondary)' }}><Database size={16} />Backups</button>
            <button onClick={() => setActiveTab('logs')} style={{ ...styles.tabBtn, borderBottom: activeTab === 'logs' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'logs' ? '#ffffff' : 'var(--text-secondary)' }}><FileText size={16} />Logs</button>
            <button onClick={() => setActiveTab('settings')} style={{ ...styles.tabBtn, borderBottom: activeTab === 'settings' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'settings' ? '#ffffff' : 'var(--text-secondary)' }}><Settings size={16} />Settings</button>
          </>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="animate-fade-in" style={styles.tabContent}>
          {/* CPU / Telemetry Monitor */}
          {isSuperAdmin && telemetry && (
            <div style={styles.metricsGrid}>
              <div className="glass-card" style={styles.metricCard}>
                <div style={styles.metricHeader}>
                  <span style={styles.metricLabel}>CPU Core Load</span>
                  <Activity size={18} style={{ color: 'var(--primary-light)' }} />
                </div>
                <span style={styles.metricVal}>{telemetry.cpuUsage}%</span>
                <div style={{ background: 'rgba(255,255,255,0.05)', height: '4px', borderRadius: '2px', width: '100%', overflow: 'hidden' }}>
                  <div style={{ background: 'var(--primary)', height: '100%', width: `${telemetry.cpuUsage}%` }} />
                </div>
              </div>
              <div className="glass-card" style={styles.metricCard}>
                <div style={styles.metricHeader}>
                  <span style={styles.metricLabel}>RAM Utilization</span>
                  <HardDrive size={18} style={{ color: '#00d2ff' }} />
                </div>
                <span style={styles.metricVal}>{telemetry.memoryUsage}%</span>
                <div style={{ background: 'rgba(255,255,255,0.05)', height: '4px', borderRadius: '2px', width: '100%', overflow: 'hidden' }}>
                  <div style={{ background: '#00d2ff', height: '100%', width: `${telemetry.memoryUsage}%` }} />
                </div>
              </div>
              <div className="glass-card" style={styles.metricCard}>
                <div style={styles.metricHeader}>
                  <span style={styles.metricLabel}>DB Health</span>
                  <CheckCircle size={18} style={{ color: 'var(--success)' }} />
                </div>
                <span style={{ ...styles.metricVal, color: telemetry.databaseStatus === 'CONNECTED' ? 'var(--success)' : 'var(--error)' }}>
                  {telemetry.databaseStatus}
                </span>
              </div>
              <div className="glass-card" style={styles.metricCard}>
                <div style={styles.metricHeader}>
                  <span style={styles.metricLabel}>API Response Time</span>
                  <Activity size={18} style={{ color: 'var(--warning)' }} />
                </div>
                <span style={styles.metricVal}>{telemetry.apiResponseTime}ms</span>
              </div>
            </div>
          )}

          {/* Core Stats Row */}
          <div style={styles.metricsGrid}>
            <div className="glass-card" style={styles.metricCard}>
              <div style={styles.metricHeader}>
                <span style={styles.metricLabel}>Server Uptime</span>
                <Activity size={18} style={{ color: 'var(--primary-light)' }} />
              </div>
              <span style={styles.metricVal}>{formatUptime(stats.uptime)}</span>
            </div>

            <div className="glass-card" style={styles.metricCard}>
              <div style={styles.metricHeader}>
                <span style={styles.metricLabel}>System Storage</span>
                <HardDrive size={18} style={{ color: '#00d2ff' }} />
              </div>
              <span style={styles.metricVal}>{formatBytes(stats.totalStorage)}</span>
            </div>

            <div className="glass-card" style={styles.metricCard}>
              <div style={styles.metricHeader}>
                <span style={styles.metricLabel}>Total Users</span>
                <Users size={18} style={{ color: '#a855f7' }} />
              </div>
              <span style={styles.metricVal}>{stats.totalUsers}</span>
            </div>

            <div className="glass-card" style={styles.metricCard}>
              <div style={styles.metricHeader}>
                <span style={styles.metricLabel}>Global views</span>
                <Eye size={18} style={{ color: '#10b981' }} />
              </div>
              <span style={styles.metricVal}>{stats.totalViews}</span>
            </div>
          </div>

          {/* Recent Uploads Activity */}
          <div className="glass-card" style={styles.cardSection}>
            <div style={styles.cardHeader}>Recent Document Activity</div>
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.th}>Title</th>
                    <th style={styles.th}>Publisher</th>
                    <th style={styles.th}>File Size</th>
                    <th style={styles.th}>Date Created</th>
                    <th style={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentActivity.map((act) => (
                    <tr key={act.id} style={styles.tableBodyRow}>
                      <td style={styles.td}>{act.title}</td>
                      <td style={styles.td}>{act.creatorEmail}</td>
                      <td style={styles.td}>{formatBytes(act.fileSize)}</td>
                      <td style={styles.td}>{new Date(act.createdAt).toLocaleString()}</td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.statusLabel,
                          backgroundColor: act.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                          color: act.status === 'COMPLETED' ? 'var(--success)' : 'var(--warning)'
                        }}>
                          {act.status.toLowerCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="animate-fade-in" style={styles.tabContent}>
          <div style={styles.searchRow}>
            <div style={styles.searchWrapper}>
              <Search size={18} style={styles.searchIcon} />
              <input
                type="text"
                className="glass-input"
                placeholder="Search user accounts by email or name..."
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                style={styles.searchInput}
              />
            </div>
          </div>

          <div className="glass-card" style={styles.tableCard}>
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.th}>User Info</th>
                    <th style={styles.th}>Privilege Role</th>
                    <th style={styles.th}>Lock/Security Status</th>
                    <th style={styles.th}>Storage</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Super Admin Actions</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} style={styles.tableBodyRow}>
                      <td style={styles.td}>
                        <div style={{ fontWeight: '600' }}>{u.name || 'No Name'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{u.email}</div>
                      </td>
                      <td style={styles.td}>
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          style={styles.tableSelect}
                        >
                          <option value="REGISTERED">REGISTERED</option>
                          <option value="PREMIUM">PREMIUM</option>
                          <option value="ADMIN">ADMIN</option>
                          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                        </select>
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {u.isSuspended && <span style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--error)', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px' }}>SUSPENDED</span>}
                          {u.lockedUntil && new Date(u.lockedUntil) > new Date() && <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning)', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px' }}>LOCKED</span>}
                          {u.twoFactorEnabled ? <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px' }}>2FA ON</span> : <span style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px' }}>2FA OFF</span>}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <div style={{ fontSize: '0.8rem' }}>{u.flipbookCount} flipbooks</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{formatBytes(u.storageUsed)}</div>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          {isSuperAdmin && (
                            <>
                              <button onClick={() => handleImpersonate(u.id)} className="glass-btn glass-btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                                Impersonate
                              </button>
                              <div style={{ position: 'relative' }}>
                                <select onChange={(e) => {
                                  if (e.target.value) {
                                    handleEmergencyAction(u.id, e.target.value);
                                    e.target.value = '';
                                  }
                                }} style={{ ...styles.tableSelect, fontSize: '0.75rem', padding: '4px 8px' }}>
                                  <option value="">Emergency Action</option>
                                  <option value="unlock">Unlock account</option>
                                  <option value="reset-failed">Reset fail count</option>
                                  <option value="force-password-reset">Force password reset</option>
                                  <option value="force-logout">Force logout all</option>
                                  <option value="disable-2fa">Disable 2FA</option>
                                  <option value="verify-email">Verify Email</option>
                                  {u.isSuspended ? <option value="unsuspend">Unsuspend account</option> : <option value="suspend">Suspend account</option>}
                                </select>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="glass-btn glass-btn-secondary"
                          style={styles.tableDeleteBtn}
                          title="Delete account"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Books Tab */}
      {activeTab === 'flipbooks' && (
        <div className="animate-fade-in" style={styles.tabContent}>
          <div style={styles.searchRow}>
            <div style={styles.searchWrapper}>
              <Search size={18} style={styles.searchIcon} />
              <input
                type="text"
                className="glass-input"
                placeholder="Search global flipbooks by title or publisher..."
                value={bookQuery}
                onChange={(e) => setBookQuery(e.target.value)}
                style={styles.searchInput}
              />
            </div>
          </div>

          <div className="glass-card" style={styles.tableCard}>
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.th}>Title</th>
                    <th style={styles.th}>Publisher Email</th>
                    <th style={styles.th}>File Size</th>
                    <th style={styles.th}>Pages</th>
                    <th style={styles.th}>Visibility</th>
                    <th style={styles.th}>Status</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Audit Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFlipbooks.map((f) => (
                    <tr key={f.id} style={styles.tableBodyRow}>
                      <td style={styles.td} title={f.title}>{f.title}</td>
                      <td style={styles.td}>{f.creatorEmail}</td>
                      <td style={styles.td}>{formatBytes(f.fileSize)}</td>
                      <td style={styles.td}>{f.pageCount}</td>
                      <td style={styles.td}>
                        <span style={styles.visTextLabel}>{f.visibility}</span>
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.statusLabel,
                          backgroundColor: f.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: f.status === 'COMPLETED' ? 'var(--success)' : 'var(--error)'
                        }}>
                          {f.status}
                        </span>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <button
                          onClick={() => handleDeleteFlipbook(f.id)}
                          className="glass-btn glass-btn-secondary"
                          style={styles.tableDeleteBtn}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <div className="animate-fade-in" style={styles.tabContent}>
          <div className="glass-card" style={styles.tableCard}>
            <div style={styles.cardHeader}>Active User Sessions</div>
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.th}>User Account</th>
                    <th style={styles.th}>Client Platform</th>
                    <th style={styles.th}>Geographic Origin</th>
                    <th style={styles.th}>Last Activity</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Revoke Access</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id} style={styles.tableBodyRow}>
                      <td style={styles.td}>
                        <div>{s.userName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.userEmail}</div>
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {s.device === 'mobile' ? <Smartphone size={16} /> : s.device === 'tablet' ? <Laptop size={16} /> : <Monitor size={16} />}
                          <div>
                            <div>{s.os}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.browser}</div>
                          </div>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <div>{s.ipAddress}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.country}</div>
                      </td>
                      <td style={styles.td}>
                        <div>{new Date(s.lastActivity).toLocaleString()}</div>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <button onClick={() => handleRevokeSession(s.id)} className="glass-btn" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--error)', padding: '4px 12px', border: 'none', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}>
                          Force Log Out
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="animate-fade-in" style={styles.tabContent}>
          {/* IP Rule Add Form */}
          <div className="glass-card" style={styles.cardSection}>
            <div style={styles.cardHeader}>Manage IP Whitelist & Blacklist</div>
            <form onSubmit={handleAddIpRule} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 2, minWidth: '200px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>IP Address</label>
                <input type="text" className="glass-input" placeholder="e.g. 192.168.1.1" value={newIp} onChange={e => setNewIp(e.target.value)} required />
              </div>
              <div style={{ flex: 1, minWidth: '120px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Rule Type</label>
                <select value={newIpType} onChange={e => setNewIpType(e.target.value as any)} style={{ ...styles.tableSelect, width: '100%', height: '50px', background: 'rgba(255,255,255,0.03)' }}>
                  <option value="BLACKLIST">BLACKLIST</option>
                  <option value="WHITELIST">WHITELIST</option>
                </select>
              </div>
              <div style={{ flex: 3, minWidth: '240px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Notes</label>
                <input type="text" className="glass-input" placeholder="e.g. Office server" value={newIpNotes} onChange={e => setNewIpNotes(e.target.value)} />
              </div>
              <button type="submit" className="glass-btn glass-btn-primary" style={{ height: '50px' }}>Add Rule</button>
            </form>

            <div style={{ ...styles.tableWrapper, marginTop: '24px' }}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.th}>IP Address</th>
                    <th style={styles.th}>Rule Type</th>
                    <th style={styles.th}>Notes</th>
                    <th style={styles.th}>Created At</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ipRules.map((rule) => (
                    <tr key={rule.id} style={styles.tableBodyRow}>
                      <td style={styles.td}>{rule.ipAddress}</td>
                      <td style={styles.td}>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: rule.type === 'BLACKLIST' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                          color: rule.type === 'BLACKLIST' ? 'var(--error)' : 'var(--success)'
                        }}>{rule.type}</span>
                      </td>
                      <td style={styles.td}>{rule.notes || '-'}</td>
                      <td style={styles.td}>{new Date(rule.createdAt).toLocaleString()}</td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <button onClick={() => handleDeleteIpRule(rule.id)} className="glass-btn" style={{ padding: '6px', color: 'var(--error)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                          <Trash size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Security Alerts Log */}
          <div className="glass-card" style={styles.cardSection}>
            <div style={styles.cardHeader}>Recent Security Alerts Log</div>
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.th}>Time</th>
                    <th style={styles.th}>Alert Type</th>
                    <th style={styles.th}>Description</th>
                    <th style={styles.th}>Severity</th>
                    <th style={styles.th}>Client IP</th>
                  </tr>
                </thead>
                <tbody>
                  {securityAlerts.map((a) => (
                    <tr key={a.id} style={styles.tableBodyRow}>
                      <td style={styles.td}>{new Date(a.createdAt).toLocaleString()}</td>
                      <td style={styles.td}><strong style={{ color: 'var(--warning)' }}>{a.type}</strong></td>
                      <td style={styles.td}>{a.description}</td>
                      <td style={styles.td}>
                        <span style={{
                          fontSize: '0.7rem',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: a.severity === 'HIGH' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                          color: a.severity === 'HIGH' ? 'var(--error)' : 'var(--warning)',
                          fontWeight: 'bold'
                        }}>{a.severity}</span>
                      </td>
                      <td style={styles.td}>{a.ipAddress || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* API Keys Tab */}
      {activeTab === 'apikeys' && (
        <div className="animate-fade-in" style={styles.tabContent}>
          <div className="glass-card" style={styles.cardSection}>
            <div style={styles.cardHeader}>Generate System API Access Key</div>
            <form onSubmit={handleCreateApiKey} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: 2, minWidth: '240px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Key Label/Name</label>
                <input type="text" className="glass-input" placeholder="e.g. Server Ingestion Script" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} required />
              </div>
              <div style={{ flex: 1, minWidth: '180px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Permissions Set</label>
                <select multiple value={newKeyPerms} onChange={e => setNewKeyPerms(Array.from(e.target.selectedOptions, o => o.value))} style={{ ...styles.tableSelect, width: '100%', height: '50px', background: 'rgba(255,255,255,0.03)' }}>
                  <option value="READ_FLIPBOOKS">READ_FLIPBOOKS</option>
                  <option value="WRITE_FLIPBOOKS">WRITE_FLIPBOOKS</option>
                  <option value="DELETE_FLIPBOOKS">DELETE_FLIPBOOKS</option>
                  <option value="VIEW_ANALYTICS">VIEW_ANALYTICS</option>
                </select>
              </div>
              <button type="submit" className="glass-btn glass-btn-primary" style={{ height: '50px' }}>Generate API Key</button>
            </form>

            {createdRawKey && (
              <div style={{
                background: 'rgba(16,185,129,0.1)',
                border: '1px solid rgba(16,185,129,0.25)',
                color: 'var(--success)',
                padding: '16px',
                borderRadius: '8px',
                marginTop: '24px',
                wordBreak: 'break-all'
              }}>
                <strong>WARNING: Copy this API key now. It will not be shown again!</strong>
                <div style={{ fontFamily: 'monospace', fontSize: '1.1rem', marginTop: '8px', background: '#020617', padding: '12px', borderRadius: '4px' }}>
                  {createdRawKey}
                </div>
              </div>
            )}

            <div style={{ ...styles.tableWrapper, marginTop: '32px' }}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.th}>Key Name</th>
                    <th style={styles.th}>Permissions Scope</th>
                    <th style={styles.th}>Usage Stats</th>
                    <th style={styles.th}>Created Date</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Active Status</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Revoke</th>
                  </tr>
                </thead>
                <tbody>
                  {apiKeys.map((key) => (
                    <tr key={key.id} style={styles.tableBodyRow}>
                      <td style={styles.td}><strong>{key.name}</strong></td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {key.permissions.map((p, idx) => (
                            <span key={idx} style={{ background: 'rgba(255,255,255,0.05)', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px' }}>{p.replace('_', ' ')}</span>
                          ))}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <div>{key.usageCount} requests</div>
                        {key.lastUsedAt && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Last: {new Date(key.lastUsedAt).toLocaleString()}</div>}
                      </td>
                      <td style={styles.td}>{new Date(key.createdAt).toLocaleDateString()}</td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <button onClick={() => handleToggleApiKey(key.id, key.isActive)} className="glass-btn" style={{ fontSize: '0.75rem', padding: '4px 8px', background: key.isActive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: key.isActive ? 'var(--success)' : 'var(--error)' }}>
                          {key.isActive ? 'Active' : 'Disabled'}
                        </button>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <button onClick={() => handleDeleteApiKey(key.id)} className="glass-btn" style={{ padding: '6px', color: 'var(--error)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                          <Trash size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Storage Tab */}
      {activeTab === 'storage' && (
        <div className="animate-fade-in" style={styles.tabContent}>
          {telemetry && (
            <div style={styles.metricsGrid}>
              <div className="glass-card" style={styles.metricCard}>
                <div style={styles.metricHeader}>
                  <span style={styles.metricLabel}>Total Allocated Storage</span>
                  <HardDrive size={18} />
                </div>
                <span style={styles.metricVal}>{formatBytes(telemetry.maxStorage)}</span>
              </div>
              <div className="glass-card" style={styles.metricCard}>
                <div style={styles.metricHeader}>
                  <span style={styles.metricLabel}>Used Storage Space</span>
                  <HardDrive size={18} style={{ color: 'var(--accent)' }} />
                </div>
                <span style={styles.metricVal}>{formatBytes(telemetry.storageUsage)}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  ({Math.round((telemetry.storageUsage / telemetry.maxStorage) * 100)}% capacity utilized)
                </span>
              </div>
            </div>
          )}

          {/* Broken Files and Thumbnails Rebuilding */}
          <div className="glass-card" style={styles.cardSection}>
            <div style={styles.cardHeader}>Broken File Integrity Check</div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.9rem' }}>The following database records refer to files that do not physically exist on the storage volume.</p>
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.th}>Title</th>
                    <th style={styles.th}>Relative File Path</th>
                    <th style={styles.th}>Reported Size</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Rebuild Thumbnail</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Regenerate Pages</th>
                  </tr>
                </thead>
                <tbody>
                  {flipbooks.filter(f => f.status === 'FAILED').map((fb) => (
                    <tr key={fb.id} style={styles.tableBodyRow}>
                      <td style={styles.td}><strong>{fb.title}</strong></td>
                      <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: '0.8rem' }}>{fb.slug}.pdf</td>
                      <td style={styles.td}>{formatBytes(fb.fileSize)}</td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <button onClick={() => handleRebuildThumbnail(fb.id)} className="glass-btn glass-btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                          Rebuild
                        </button>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <button onClick={() => handleRegeneratePages(fb.id)} className="glass-btn glass-btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                          Regenerate
                        </button>
                      </td>
                    </tr>
                  ))}
                  {flipbooks.filter(f => f.status === 'FAILED').length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ ...styles.td, textAlign: 'center', color: 'var(--text-muted)' }}>No broken file dependencies detected. Excellent integrity.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Jobs Queue Tab */}
      {activeTab === 'jobs' && (
        <div className="animate-fade-in" style={styles.tabContent}>
          <div className="glass-card" style={styles.cardSection}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', marginBottom: '16px' }}>
              <div style={{ fontSize: '1.05rem', fontWeight: '600' }}>Background Job Scheduler Console</div>
              <div>
                {queuePaused ? (
                  <button onClick={handleResumeQueue} className="glass-btn" style={{ background: 'var(--success)', color: '#fff' }}>
                    <Play size={16} /> Resume Processing Queue
                  </button>
                ) : (
                  <button onClick={handlePauseQueue} className="glass-btn" style={{ background: 'var(--warning)', color: '#fff' }}>
                    <Pause size={16} /> Pause Processing Queue
                  </button>
                )}
              </div>
            </div>

            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.th}>Job Title</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Pages Info</th>
                    <th style={styles.th}>Date Queued</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {flipbooks.filter(f => f.status !== 'COMPLETED').map((job) => (
                    <tr key={job.id} style={styles.tableBodyRow}>
                      <td style={styles.td}><strong>{job.title}</strong></td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.statusLabel,
                          backgroundColor: job.status === 'PENDING' ? 'rgba(255,255,255,0.05)' : job.status === 'PROCESSING' ? 'rgba(59,130,246,0.15)' : 'rgba(239,68,68,0.15)',
                          color: job.status === 'PENDING' ? 'var(--text-secondary)' : job.status === 'PROCESSING' ? 'var(--accent)' : 'var(--error)'
                        }}>{job.status}</span>
                      </td>
                      <td style={styles.td}>{job.pageCount} pages</td>
                      <td style={styles.td}>{new Date(job.createdAt).toLocaleString()}</td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          {job.status === 'FAILED' && (
                            <button onClick={() => handleRetryJob(job.id)} className="glass-btn glass-btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>Retry</button>
                          )}
                          <button onClick={() => handleReprocessJob(job.id)} className="glass-btn glass-btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>Reprocess</button>
                          <button onClick={() => handleDeleteJob(job.id)} className="glass-btn" style={{ padding: '4px', color: 'var(--error)', background: 'transparent', border: 'none', cursor: 'pointer' }}><Trash size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {flipbooks.filter(f => f.status !== 'COMPLETED').length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ ...styles.td, textAlign: 'center', color: 'var(--text-muted)' }}>Background queue is idle. No pending jobs in pipeline.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Email Configurations Tab */}
      {activeTab === 'email' && (
        <div className="animate-fade-in" style={styles.tabContent}>
          {/* SMTP Form */}
          <div className="glass-card" style={styles.cardSection}>
            <div style={styles.cardHeader}>SMTP Credentials & Gateway Setup</div>
            <form onSubmit={handleSaveEmailConfigs} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>SMTP Host</label>
                  <input type="text" className="glass-input" value={emailConfigs.smtp_host || ''} onChange={e => setEmailConfigs({ ...emailConfigs, smtp_host: e.target.value })} required />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>SMTP Port</label>
                  <input type="text" className="glass-input" value={emailConfigs.smtp_port || ''} onChange={e => setEmailConfigs({ ...emailConfigs, smtp_port: e.target.value })} required />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>SMTP User</label>
                  <input type="text" className="glass-input" value={emailConfigs.smtp_user || ''} onChange={e => setEmailConfigs({ ...emailConfigs, smtp_user: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>SMTP Password</label>
                  <input type="password" className="glass-input" placeholder="••••••••" value={emailConfigs.smtp_pass || ''} onChange={e => setEmailConfigs({ ...emailConfigs, smtp_pass: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Sender Address (From)</label>
                  <input type="email" className="glass-input" value={emailConfigs.smtp_from || ''} onChange={e => setEmailConfigs({ ...emailConfigs, smtp_from: e.target.value })} required />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Resend API Key (Optional Override)</label>
                  <input type="text" className="glass-input" value={emailConfigs.resend_api_key || ''} onChange={e => setEmailConfigs({ ...emailConfigs, resend_api_key: e.target.value })} />
                </div>
              </div>

               <div style={{ ...styles.cardHeader, marginTop: '24px' }}>Custom Transactional Email Templates</div>
              
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Password Reset Email Body (supports: {"{{reset_link}}"})</label>
                <textarea rows={3} className="glass-input" style={{ width: '100%', resize: 'vertical', fontFamily: 'sans-serif' }} value={emailConfigs.template_password_reset || ''} onChange={e => setEmailConfigs({ ...emailConfigs, template_password_reset: e.target.value })} required />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Email Verification Template (supports: {"{{code}}"})</label>
                <textarea rows={3} className="glass-input" style={{ width: '100%', resize: 'vertical', fontFamily: 'sans-serif' }} value={emailConfigs.template_verification || ''} onChange={e => setEmailConfigs({ ...emailConfigs, template_verification: e.target.value })} required />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Newsletter Template Body</label>
                <textarea rows={3} className="glass-input" style={{ width: '100%', resize: 'vertical', fontFamily: 'sans-serif' }} value={emailConfigs.template_newsletter || ''} onChange={e => setEmailConfigs({ ...emailConfigs, template_newsletter: e.target.value })} required />
              </div>

              <button type="submit" className="glass-btn glass-btn-primary" style={{ width: 'fit-content', marginTop: '16px' }}>Save Configs</button>
            </form>
          </div>

          {/* Test Email Form */}
          <div className="glass-card" style={styles.cardSection}>
            <div style={styles.cardHeader}>Test Mail Dispatch Gate</div>
            <form onSubmit={handleSendTestEmail} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '240px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Send Test Email to:</label>
                <input type="email" className="glass-input" placeholder="admin@example.com" value={testEmailAddr} onChange={e => setTestEmailAddr(e.target.value)} required />
              </div>
              <button type="submit" className="glass-btn glass-btn-secondary" style={{ height: '50px' }}>Send Test Email</button>
            </form>
          </div>
        </div>
      )}

      {/* Backups Tab */}
      {activeTab === 'backups' && (
        <div className="animate-fade-in" style={styles.tabContent}>
          <div className="glass-card" style={styles.cardSection}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', marginBottom: '16px' }}>
              <div style={{ fontSize: '1.05rem', fontWeight: '600' }}>System Backup & Recovery Manager</div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => handleCreateBackup('db')} className="glass-btn glass-btn-primary">
                  Backup Database
                </button>
                <button onClick={() => handleCreateBackup('storage')} className="glass-btn glass-btn-secondary">
                  Backup Metadata
                </button>
                <button onClick={() => handleCreateBackup('settings')} className="glass-btn glass-btn-secondary">
                  Backup Settings
                </button>
              </div>
            </div>

            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.th}>Backup Name</th>
                    <th style={styles.th}>Size</th>
                    <th style={styles.th}>Created Date</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Download</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Restore</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((b, idx) => (
                    <tr key={idx} style={styles.tableBodyRow}>
                      <td style={styles.td}><strong>{b.name}</strong></td>
                      <td style={styles.td}>{formatBytes(b.size)}</td>
                      <td style={styles.td}>{new Date(b.createdAt).toLocaleString()}</td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <a href={`${API_HOST}/api/v1/admin/backups/${b.name}/download`} download className="glass-btn glass-btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                          <Download size={14} /> Download
                        </a>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <button onClick={() => handleRestoreBackup(b.name)} className="glass-btn" style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--success)', padding: '4px 12px', border: 'none', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}>
                          Restore System
                        </button>
                      </td>
                    </tr>
                  ))}
                  {backups.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ ...styles.td, textAlign: 'center', color: 'var(--text-muted)' }}>No backup JSON snapshots found on server. Create one above.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div className="animate-fade-in" style={styles.tabContent}>
          <div className="glass-card" style={styles.cardSection}>
            <div style={styles.cardHeader}>Structured Logs Search</div>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Log Module Type</label>
                <select value={logTypeQuery} onChange={e => { setLogTypeQuery(e.target.value); }} style={{ ...styles.tableSelect, width: '100%', height: '50px', background: 'rgba(255,255,255,0.03)' }}>
                  <option value="">All Categories</option>
                  <option value="AUTH">AUTH (Authentication Logs)</option>
                  <option value="UPLOAD">UPLOAD (Upload Logs)</option>
                  <option value="ANALYTICS">ANALYTICS (Analytics Logs)</option>
                  <option value="ADMIN">ADMIN (Super Admin Actions)</option>
                  <option value="WORKER">WORKER (Job Engine Logs)</option>
                  <option value="EMAIL">EMAIL (SMTP Logs)</option>
                  <option value="API">API (HTTP Endpoint Logs)</option>
                  <option value="DATABASE">DATABASE (SQL Triggers Logs)</option>
                </select>
              </div>
              <div style={{ flex: 2, minWidth: '240px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Search System Messages</label>
                <input type="text" className="glass-input" placeholder="Filter message details..." value={logSearchQuery} onChange={e => setLogSearchQuery(e.target.value)} />
              </div>
              <button onClick={fetchLogs} className="glass-btn glass-btn-primary" style={{ height: '50px' }}>Refresh Search</button>
            </div>

            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.th}>Timestamp</th>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Level</th>
                    <th style={styles.th}>Message Details</th>
                  </tr>
                </thead>
                <tbody>
                  {systemLogs.map((log) => (
                    <tr key={log.id} style={styles.tableBodyRow}>
                      <td style={styles.td}>{new Date(log.createdAt).toLocaleString()}</td>
                      <td style={styles.td}><strong style={{ color: 'var(--primary-light)' }}>{log.type}</strong></td>
                      <td style={styles.td}>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 'bold',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: log.level === 'ERROR' ? 'rgba(239,68,68,0.15)' : log.level === 'WARN' ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)',
                          color: log.level === 'ERROR' ? 'var(--error)' : log.level === 'WARN' ? 'var(--warning)' : 'var(--text-secondary)'
                        }}>{log.level}</span>
                      </td>
                      <td style={styles.td} title={log.details || ''}>{log.message}</td>
                    </tr>
                  ))}
                  {systemLogs.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ ...styles.td, textAlign: 'center', color: 'var(--text-muted)' }}>No logs matched current criteria.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit Logs Trail */}
          <div className="glass-card" style={styles.cardSection}>
            <div style={styles.cardHeader}>Comprehensive Security Audit Logs Trail</div>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
              <input type="text" className="glass-input" placeholder="Search actions, emails, target resources..." value={auditSearchQuery} onChange={e => setAuditSearchQuery(e.target.value)} />
              <button onClick={fetchLogs} className="glass-btn glass-btn-primary">Search Trail</button>
            </div>
            
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.th}>Timestamp</th>
                    <th style={styles.th}>User Account</th>
                    <th style={styles.th}>Action</th>
                    <th style={styles.th}>Module</th>
                    <th style={styles.th}>Target Resource</th>
                    <th style={styles.th}>Before</th>
                    <th style={styles.th}>After</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} style={styles.tableBodyRow}>
                      <td style={styles.td}>{new Date(log.timestamp).toLocaleString()}</td>
                      <td style={styles.td}>{log.userEmail || 'System'}</td>
                      <td style={styles.td}><strong>{log.action}</strong></td>
                      <td style={styles.td}>{log.module}</td>
                      <td style={styles.td}>{log.targetResource || '-'}</td>
                      <td style={styles.td}>{log.beforeValue || '-'}</td>
                      <td style={styles.td}>{log.afterValue || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="animate-fade-in" style={styles.tabContent}>
          <div className="glass-card" style={styles.cardSection}>
            <div style={styles.cardHeader}>Global Application Configs & Limits</div>
            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Website Name</label>
                  <input type="text" className="glass-input" value={appSettings.website_name || ''} onChange={e => setAppSettings({ ...appSettings, website_name: e.target.value })} required />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Timezone</label>
                  <input type="text" className="glass-input" value={appSettings.timezone || ''} onChange={e => setAppSettings({ ...appSettings, timezone: e.target.value })} required />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Currency</label>
                  <input type="text" className="glass-input" value={appSettings.currency || ''} onChange={e => setAppSettings({ ...appSettings, currency: e.target.value })} required />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Max Upload Size (Bytes)</label>
                  <input type="number" className="glass-input" value={appSettings.max_upload_size || ''} onChange={e => setAppSettings({ ...appSettings, max_upload_size: e.target.value })} required />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Max PDF Pages Limit</label>
                  <input type="number" className="glass-input" value={appSettings.max_pdf_pages || ''} onChange={e => setAppSettings({ ...appSettings, max_pdf_pages: e.target.value })} required />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Max Storage Allocation Per User (Bytes)</label>
                  <input type="number" className="glass-input" value={appSettings.max_storage_per_user || ''} onChange={e => setAppSettings({ ...appSettings, max_storage_per_user: e.target.value })} required />
                </div>
              </div>

              {/* Maintenance Toggle */}
              <div style={{ ...styles.cardHeader, marginTop: '24px' }}>Maintenance Mode Controller</div>
              <div style={{ display: 'flex', gap: '24px', alignItems: 'center', marginBottom: '12px' }}>
                <button
                  type="button"
                  onClick={() => {
                    const nextMode = appSettings.maintenance_mode === 'true' ? 'false' : 'true';
                    setAppSettings({ ...appSettings, maintenance_mode: nextMode });
                  }}
                  className="glass-btn"
                  style={{
                    background: appSettings.maintenance_mode === 'true' ? 'var(--error)' : 'rgba(255,255,255,0.05)',
                    color: '#ffffff',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  {appSettings.maintenance_mode === 'true' ? 'Enable Maintenance: ACTIVE' : 'Disable Maintenance: INACTIVE'}
                </button>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Only SUPER ADMIN users will bypass interception filters when active.</span>
              </div>
              
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Custom Intercept Message</label>
                <input type="text" className="glass-input" value={appSettings.maintenance_message || ''} onChange={e => setAppSettings({ ...appSettings, maintenance_message: e.target.value })} />
              </div>

              <button type="submit" className="glass-btn glass-btn-primary" style={{ width: 'fit-content', marginTop: '16px' }}>Save System Settings</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '40px 48px',
    backgroundColor: 'var(--bg-darker)',
    minHeight: '100vh',
    color: 'var(--text-primary)',
  },
  fullscreenOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'var(--bg-darker)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid rgba(255,255,255,0.05)',
    borderTop: '3px solid var(--primary)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  errorCard: {
    maxWidth: '440px',
    margin: '100px auto 0 auto',
    padding: '40px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    marginBottom: '32px',
  },
  backBtn: {
    padding: '8px 16px',
    fontSize: '0.85rem',
  },
  headerTitleWrapper: {
    display: 'flex',
    flexDirection: 'column',
  },
  adminBadgeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  title: {
    fontSize: '1.6rem',
    margin: 0,
  },
  adminRoleBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#ef4444',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    fontSize: '0.65rem',
    fontWeight: 'bold',
    padding: '2px 8px',
    borderRadius: '12px',
    letterSpacing: '0.05em',
  },
  subtitle: {
    color: 'var(--text-secondary)',
    fontSize: '0.9rem',
    marginTop: '4px',
  },
  tabsRow: {
    display: 'flex',
    gap: '16px',
    borderBottom: '1px solid var(--border-color)',
    marginBottom: '32px',
    flexWrap: 'wrap',
    paddingBottom: '4px'
  },
  tabBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 8px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
    transition: 'all var(--transition-fast)',
  },
  tabContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '24px',
  },
  metricCard: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  metricHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
  metricVal: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#ffffff',
  },
  cardSection: {
    padding: '24px',
  },
  cardHeader: {
    fontSize: '1.05rem',
    fontWeight: '600',
    color: '#ffffff',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '14px',
    marginBottom: '16px',
  },
  tableCard: {
    padding: '12px',
  },
  tableWrapper: {
    width: '100%',
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '0.9rem',
  },
  tableHeaderRow: {
    borderBottom: '1px solid var(--border-color)',
  },
  th: {
    padding: '16px',
    color: 'var(--text-secondary)',
    fontWeight: '600',
  },
  tableBodyRow: {
    borderBottom: '1px solid rgba(255,255,255,0.02)',
    transition: 'background var(--transition-fast)',
  },
  td: {
    padding: '16px',
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '240px',
  },
  statusLabel: {
    fontSize: '0.75rem',
    fontWeight: '600',
    padding: '2px 8px',
    borderRadius: '10px',
    textTransform: 'uppercase',
  },
  searchRow: {
    display: 'flex',
  },
  searchWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    flex: 1,
    maxWidth: '440px',
  },
  searchIcon: {
    position: 'absolute',
    left: '16px',
    color: 'var(--text-muted)',
    pointerEvents: 'none',
  },
  searchInput: {
    paddingLeft: '48px',
    paddingTop: '10px',
    paddingBottom: '10px',
  },
  tableSelect: {
    padding: '6px 12px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    color: '#ffffff',
    fontSize: '0.8rem',
    cursor: 'pointer',
    outline: 'none',
  },
  tableDeleteBtn: {
    padding: '6px',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--error)',
  },
  visTextLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    fontWeight: '600',
  },
};

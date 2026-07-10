import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { apiRequest, uploadFileWithProgress, API_HOST } from '../services/api.js';
import { ShareCenterModal } from '../components/ShareCenterModal.js';
import { FlipbookSettingsModal } from '../components/FlipbookSettingsModal.js';
import { ProfileSettingsModal } from '../components/ProfileSettingsModal.js';
import { 
  LogOut, FileUp, Folder, LineChart, Search, ArrowUpDown, 
  Trash2, Share2, ExternalLink, Calendar, FileText, AlertCircle, X, Settings, User, Shield 
} from 'lucide-react';

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
  viewsCount?: number; // Wait, Prisma uses viewsCount or analytics, let's keep fallback
  createdAt: string;
  updatedAt: string;
}

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  
  // State
  const [flipbooks, setFlipbooks] = useState<Flipbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'size'>('date');

  // Upload States
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);



  // Share Modal States
  const [selectedFlipbook, setSelectedFlipbook] = useState<Flipbook | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Settings Modal States
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [settingsFlipbook, setSettingsFlipbook] = useState<Flipbook | null>(null);

  // Profile Modal States
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  // Fetch Flipbooks
  const fetchFlipbooks = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const data = await apiRequest('/flipbooks');
      setFlipbooks(data.flipbooks);
    } catch (err) {
      console.error('Error fetching flipbooks:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Initial Fetch & Status Polling
  useEffect(() => {
    fetchFlipbooks();
  }, []);

  // Polling loop for pending/processing jobs
  useEffect(() => {
    const hasPendingOrProcessing = flipbooks.some(
      (f) => f.status === 'PENDING' || f.status === 'PROCESSING'
    );

    if (!hasPendingOrProcessing) return;

    const interval = setInterval(() => {
      fetchFlipbooks(false);
    }, 3000);

    return () => clearInterval(interval);
  }, [flipbooks]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  // Load PDF.js dynamically from CDN
  const loadPdfJs = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if ((window as any).pdfjsLib) {
        resolve((window as any).pdfjsLib);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        const pdfjsLib = (window as any).pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(pdfjsLib);
      };
      script.onerror = () => reject(new Error('Failed to load PDF processor'));
      document.head.appendChild(script);
    });
  };

  // Generate Thumbnail from first page of PDF
  const generateThumbnailBlob = (file: File): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async function() {
        try {
          const typedarray = new Uint8Array(this.result as ArrayBuffer);
          const pdfjsLib = await loadPdfJs();
          const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
          const page = await pdf.getPage(1);
          
          const viewport = page.getViewport({ scale: 1.0 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          
          // Size for standard thumbnail
          canvas.width = 300;
          canvas.height = 400;

          // Render at fit scale
          const scale = Math.min(canvas.width / viewport.width, canvas.height / viewport.height);
          const scaledViewport = page.getViewport({ scale });
          
          // Clear and fill canvas background
          if (context) {
            context.fillStyle = '#1e293b';
            context.fillRect(0, 0, canvas.width, canvas.height);
            
            const renderContext = {
              canvasContext: context,
              viewport: scaledViewport,
              background: 'transparent'
            };
            await page.render(renderContext).promise;
          }

          canvas.toBlob((blob) => {
            resolve(blob);
          }, 'image/jpeg', 0.85);
        } catch (err) {
          console.error('Failed to generate cover image:', err);
          resolve(null); // Return null, server will use a generic cover
        }
      };
      reader.onerror = () => resolve(null);
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileUpload = async (file: File) => {
    if (file.type !== 'application/pdf') {
      setUploadError('Only PDF files are allowed');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setUploadError('PDF size cannot exceed 50 MB');
      return;
    }

    setUploadError(null);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('title', file.name.replace(/\.[^/.]+$/, ''));

      // Generate cover thumbnail in browser
      const thumbnailBlob = await generateThumbnailBlob(file);
      if (thumbnailBlob) {
        formData.append('thumbnail', thumbnailBlob, 'cover.jpg');
      }

      const response = await uploadFileWithProgress('/flipbooks', formData, (progress) => {
        setUploadProgress(progress);
      });

      // Reset states
      setIsUploading(false);
      setUploadModalOpen(false);
      fetchFlipbooks(false);

      // Open Share Center automatically
      setSelectedFlipbook(response.flipbook);
      setShareModalOpen(true);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload PDF');
      setIsUploading(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const onDragLeave = () => {
    setDragOver(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  // Actions
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this flipbook? All files and analytics will be permanently removed.')) {
      return;
    }

    try {
      await apiRequest(`/flipbooks/${id}`, { method: 'DELETE' });
      setFlipbooks(flipbooks.filter((f) => f.id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete flipbook.');
    }
  };



  // Helper formats
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Total Storage calculation
  const totalStorage = flipbooks.reduce((acc, f) => acc + f.fileSize, 0);
  const storageLimit = 500 * 1024 * 1024; // 500MB
  const storagePercentage = Math.min((totalStorage / storageLimit) * 100, 100);

  // Search & Filter
  const filteredFlipbooks = flipbooks
    .filter((f) => f.title.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'size') {
        return b.fileSize - a.fileSize;
      }
      // date
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <aside style={styles.sidebar} className="glass-card">
        <div style={styles.sidebarHeader}>
          <div style={styles.logoCircle}>F</div>
          <span style={styles.logoText}>FAILOI</span>
        </div>

        <nav style={styles.navMenu}>
          <a href="#workspace" style={{ ...styles.navLink, ...styles.navLinkActive }}>
            <Folder size={18} />
            Workspace
          </a>
          <button 
            type="button"
            onClick={() => setProfileModalOpen(true)} 
            style={{ ...styles.navLink, background: 'none', border: 'none', width: '100%', cursor: 'pointer', textAlign: 'left' }}
          >
            <User size={18} />
            Profile Settings
          </button>
          {user?.role === 'ADMIN' && (
            <Link to="/dashboard/admin" style={styles.navLink}>
              <Shield size={18} />
              Admin Panel
            </Link>
          )}
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={styles.storageWidget}>
            <div style={styles.storageHeader}>
              <span style={styles.storageLabel}>Storage Limit</span>
              <span style={styles.storageValue}>
                {formatBytes(totalStorage, 1)} / {formatBytes(storageLimit, 0)}
              </span>
            </div>
            <div style={styles.progressBarBg}>
              <div style={{ ...styles.progressBarFill, width: `${storagePercentage}%` }}></div>
            </div>
          </div>
          <button onClick={handleLogout} style={styles.logoutBtn} className="glass-btn glass-btn-secondary">
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={styles.mainContent}>
        {/* Top Navbar */}
        <header style={styles.topNav}>
          <div>
            <h2 style={styles.welcomeText}>Workspace</h2>
            <p style={styles.subWelcomeText}>Welcome back, {user?.name || user?.email}</p>
          </div>
          <button onClick={() => setUploadModalOpen(true)} className="glass-btn glass-btn-primary" style={styles.uploadBtn}>
            <FileUp size={16} />
            Upload PDF
          </button>
        </header>

        {/* Search and Sort Toolbar */}
        <div style={styles.toolbar}>
          <div style={styles.searchWrapper}>
            <Search size={18} style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search flipbooks..."
              className="glass-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>
          <div style={styles.sortWrapper}>
            <ArrowUpDown size={16} style={{ color: 'var(--text-muted)' }} />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={styles.selectInput}
            >
              <option value="date">Sort by Date</option>
              <option value="title">Sort by Title</option>
              <option value="size">Sort by File Size</option>
            </select>
          </div>
        </div>

        {/* Content Area */}
        <section style={styles.contentArea}>
          {loading ? (
            <div style={styles.loaderWrapper}>
              <div style={styles.spinner}></div>
            </div>
          ) : filteredFlipbooks.length > 0 ? (
            <div style={styles.grid}>
              {filteredFlipbooks.map((f) => (
                <div key={f.id} className="glass-card" style={styles.flipbookCard}>
                  {/* Thumbnail Cover */}
                  <div style={styles.coverWrapper}>
                    {f.thumbnailPath ? (
                      <img 
                        src={`${API_HOST}/uploads/${f.thumbnailPath}`} 
                        alt={f.title} 
                        style={styles.coverImage} 
                      />
                    ) : (
                      <div style={styles.coverPlaceholder}>
                        <FileText size={48} style={{ color: 'var(--text-muted)' }} />
                      </div>
                    )}
                    {/* Status Overlay */}
                    {f.status !== 'COMPLETED' && (
                      <div style={styles.statusOverlay}>
                        {f.status === 'PENDING' && (
                          <span style={styles.statusBadgePending}>Processing...</span>
                        )}
                        {f.status === 'PROCESSING' && (
                          <span style={styles.statusBadgePending}>Converting...</span>
                        )}
                        {f.status === 'FAILED' && (
                          <span style={styles.statusBadgeFailed}>Conversion Failed</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div style={styles.cardDetails}>
                    <div style={styles.cardHeaderRow}>
                      <h4 style={styles.cardTitle} title={f.title}>{f.title}</h4>
                      <span style={{
                        ...styles.visibilityBadge,
                        backgroundColor: f.visibility === 'PUBLIC' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                        color: f.visibility === 'PUBLIC' ? 'var(--success)' : 'var(--text-secondary)'
                      }}>
                        {f.visibility.toLowerCase()}
                      </span>
                    </div>

                    <div style={styles.metaRow}>
                      <span style={styles.metaItem}>
                        <Calendar size={12} />
                        {new Date(f.createdAt).toLocaleDateString()}
                      </span>
                      <span style={styles.metaItem}>
                        <FileText size={12} />
                        {f.pageCount} Pages
                      </span>
                    </div>

                    <div style={styles.fileSizeText}>
                      Size: {formatBytes(f.fileSize, 1)}
                    </div>

                    {/* Action buttons */}
                    <div style={styles.cardActions}>
                      <a 
                        href={`/f/${f.slug}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="glass-btn glass-btn-secondary"
                        style={{ ...styles.cardActionBtn, pointerEvents: f.status === 'COMPLETED' ? 'auto' : 'none', opacity: f.status === 'COMPLETED' ? 1 : 0.5 }}
                      >
                        <ExternalLink size={14} />
                        View
                      </a>
                      <button 
                        onClick={() => {
                          setSelectedFlipbook(f);
                          setShareModalOpen(true);
                        }} 
                        className="glass-btn glass-btn-secondary"
                        style={{ ...styles.cardActionBtn, pointerEvents: f.status === 'COMPLETED' ? 'auto' : 'none', opacity: f.status === 'COMPLETED' ? 1 : 0.5 }}
                      >
                        <Share2 size={14} />
                        Share
                      </button>
                      <Link 
                        to={`/dashboard/analytics/${f.id}`} 
                        className="glass-btn glass-btn-secondary"
                        style={{ ...styles.cardIconBtn, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', pointerEvents: f.status === 'COMPLETED' ? 'auto' : 'none', opacity: f.status === 'COMPLETED' ? 1 : 0.5 }}
                      >
                        <LineChart size={14} />
                      </Link>
                      <button 
                        onClick={() => {
                          setSettingsFlipbook(f);
                          setSettingsModalOpen(true);
                        }} 
                        className="glass-btn glass-btn-secondary"
                        style={styles.cardIconBtn}
                        title="Settings"
                      >
                        <Settings size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(f.id)} 
                        className="glass-btn glass-btn-secondary"
                        style={{ ...styles.cardIconBtn, color: 'var(--error)' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card" style={styles.emptyCard}>
              <Folder size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
              <h3 style={{ marginBottom: '8px' }}>No Flipbooks Uploaded</h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '320px', marginBottom: '24px' }}>
                Upload your first PDF to convert it into a beautiful, interactive flipbook.
              </p>
              <button onClick={() => setUploadModalOpen(true)} className="glass-btn glass-btn-primary">
                <FileUp size={16} />
                Upload PDF
              </button>
            </div>
          )}
        </section>
      </main>

      {/* Upload Modal Dialog */}
      {uploadModalOpen && (
        <div style={styles.modalBackdrop}>
          <div className="glass-card" style={styles.uploadModal}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0 }}>Upload PDF</h3>
              <button 
                onClick={() => !isUploading && setUploadModalOpen(false)} 
                style={styles.closeModalBtn}
                disabled={isUploading}
              >
                <X size={20} />
              </button>
            </div>

            {uploadError && (
              <div style={styles.errorBanner}>
                <AlertCircle size={16} />
                <span>{uploadError}</span>
              </div>
            )}

            {!isUploading ? (
              <div 
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  ...styles.dropzone,
                  borderColor: dragOver ? 'var(--primary)' : 'var(--border-color)',
                  backgroundColor: dragOver ? 'rgba(0,102,255,0.05)' : 'rgba(255,255,255,0.01)'
                }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept="application/pdf"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files && files.length > 0) handleFileUpload(files[0]);
                  }}
                />
                <FileUp size={48} style={{ color: dragOver ? 'var(--primary-light)' : 'var(--text-muted)', marginBottom: '16px', transition: 'color var(--transition-fast)' }} />
                <h4 style={{ marginBottom: '8px' }}>Drag & Drop PDF here</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>or click to browse from finder (Max. size 50 MB)</p>
              </div>
            ) : (
              <div style={styles.uploadingContainer}>
                <div style={styles.spinner}></div>
                <h4 style={{ marginTop: '16px', marginBottom: '8px' }}>Uploading & Analyzing PDF...</h4>
                <div style={styles.progressContainer}>
                  <div style={styles.progressBarBg}>
                    <div style={{ ...styles.progressBarFill, width: `${uploadProgress}%` }}></div>
                  </div>
                  <span style={styles.progressText}>{uploadProgress}% Completed</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Share Center Modal Dialog */}
      <ShareCenterModal 
        isOpen={shareModalOpen} 
        onClose={() => setShareModalOpen(false)} 
        flipbook={selectedFlipbook} 
      />

      {/* Flipbook Settings Modal Dialog */}
      <FlipbookSettingsModal 
        isOpen={settingsModalOpen} 
        onClose={() => setSettingsModalOpen(false)} 
        flipbook={settingsFlipbook} 
        onUpdate={(updated) => {
          setFlipbooks(flipbooks.map((fb) => fb.id === updated.id ? updated : fb));
        }}
      />

      {/* Profile Settings Modal Dialog */}
      <ProfileSettingsModal 
        isOpen={profileModalOpen} 
        onClose={() => setProfileModalOpen(false)} 
      />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: 'var(--bg-darker)',
  },
  sidebar: {
    width: '260px',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px',
    borderRadius: 0,
    borderRight: '1px solid var(--border-color)',
    borderTop: 'none',
    borderBottom: 'none',
    borderLeft: 'none',
    position: 'sticky',
    top: 0,
    backgroundColor: 'rgba(6, 9, 19, 0.4)',
    backdropFilter: 'blur(20px)',
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '40px',
  },
  logoCircle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--primary) 0%, #00d2ff 100%)',
    fontWeight: 'bold',
    color: '#ffffff',
  },
  logoText: {
    fontFamily: 'var(--font-display)',
    fontWeight: 'bold',
    fontSize: '20px',
    color: '#ffffff',
  },
  navMenu: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flex: 1,
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-secondary)',
    fontSize: '0.95rem',
    fontWeight: '500',
    transition: 'all var(--transition-fast)',
  },
  navLinkActive: {
    backgroundColor: 'rgba(0, 102, 255, 0.1)',
    color: 'var(--primary-light)',
    border: '1px solid rgba(0, 102, 255, 0.15)',
  },
  sidebarFooter: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  storageWidget: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  storageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.8rem',
  },
  storageLabel: {
    color: 'var(--text-secondary)',
  },
  storageValue: {
    color: '#ffffff',
    fontWeight: '500',
  },
  progressBarBg: {
    height: '6px',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: 'var(--primary)',
    borderRadius: '3px',
    transition: 'width 0.3s ease',
  },
  logoutBtn: {
    width: '100%',
  },
  mainContent: {
    flex: 1,
    padding: '40px 48px',
    overflowY: 'auto',
    maxHeight: '100vh',
  },
  topNav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
  },
  welcomeText: {
    fontSize: '1.75rem',
    marginBottom: '4px',
  },
  subWelcomeText: {
    color: 'var(--text-secondary)',
    fontSize: '0.9rem',
  },
  uploadBtn: {
    padding: '10px 20px',
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '32px',
  },
  searchWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    flex: 1,
    maxWidth: '360px',
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
  sortWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  selectInput: {
    padding: '10px 16px',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    outline: 'none',
    cursor: 'pointer',
    fontFamily: 'var(--font-sans)',
  },
  contentArea: {
    minHeight: 'calc(100vh - 260px)',
  },
  loaderWrapper: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '200px',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid rgba(255,255,255,0.05)',
    borderTop: '3px solid var(--primary)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '24px',
  },
  flipbookCard: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  coverWrapper: {
    position: 'relative',
    width: '100%',
    height: '240px',
    background: 'rgba(13, 20, 38, 0.4)',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  coverPlaceholder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(6, 9, 19, 0.65)',
    backdropFilter: 'blur(2px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '12px',
  },
  statusBadgePending: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    color: 'var(--warning)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: '600',
  },
  statusBadgeFailed: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    color: 'var(--error)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: '600',
  },
  cardDetails: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  cardHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '8px',
  },
  cardTitle: {
    fontSize: '1rem',
    color: '#ffffff',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    flex: 1,
  },
  renameWrapper: {
    display: 'flex',
    gap: '6px',
    flex: 1,
  },
  renameInput: {
    padding: '4px 8px',
    fontSize: '0.9rem',
  },
  renameCheckBtn: {
    background: 'var(--primary)',
    border: 'none',
    color: '#ffffff',
    borderRadius: 'var(--radius-sm)',
    padding: '4px 8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  visibilityBadge: {
    fontSize: '0.7rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    padding: '2px 8px',
    borderRadius: '10px',
    letterSpacing: '0.05em',
  },
  metaRow: {
    display: 'flex',
    gap: '16px',
    color: 'var(--text-secondary)',
    fontSize: '0.8rem',
    marginBottom: '12px',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  fileSizeText: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginBottom: '16px',
  },
  cardActions: {
    display: 'flex',
    gap: '8px',
    marginTop: 'auto',
  },
  cardActionBtn: {
    flex: 1,
    padding: '8px 12px',
    fontSize: '0.8rem',
    borderRadius: 'var(--radius-sm)',
  },
  cardIconBtn: {
    padding: '8px',
    borderRadius: 'var(--radius-sm)',
  },
  emptyCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '64px 32px',
    width: '100%',
    maxWidth: '540px',
    background: 'rgba(13, 20, 38, 0.3)',
    margin: '40px auto 0 auto',
  },
  modalBackdrop: {
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
  uploadModal: {
    width: '100%',
    maxWidth: '500px',
    padding: '32px',
    backgroundColor: 'rgba(10, 15, 30, 0.95)',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeModalBtn: {
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
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    padding: '12px 16px',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--error)',
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  dropzone: {
    height: '240px',
    border: '2px dashed var(--border-color)',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    padding: '24px',
  },
  uploadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px 0',
  },
  progressContainer: {
    width: '100%',
    marginTop: '16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  progressText: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
  },
};

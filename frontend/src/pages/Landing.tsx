import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { uploadFileWithProgress } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import { FileUp, Loader2, CheckCircle2, ShieldAlert } from 'lucide-react';

export const Landing: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Upload and Drag States
  const [dragActive, setDragActive] = useState(false);
  const [uploadState, setUploadState] = useState<'IDLE' | 'UPLOADING' | 'PROCESSING' | 'READY'>('IDLE');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileName, setFileName] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic loader for PDF.js CDN
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

  // Generate Thumbnail from PDF
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

          canvas.width = 300;
          canvas.height = 400;

          const scale = Math.min(canvas.width / viewport.width, canvas.height / viewport.height);
          const scaledViewport = page.getViewport({ scale });

          if (context) {
            context.fillStyle = '#0a0f1e';
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
          resolve(null);
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
    setFileName(file.name);
    setUploadState('UPLOADING');
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

      // Upload file relative URL proxied
      const response = await uploadFileWithProgress('/flipbooks', formData, (progress) => {
        setUploadProgress(progress);
        if (progress === 100) {
          setUploadState('PROCESSING');
        }
      });

      setUploadState('READY');

      // Delay navigation slightly so user sees the "Ready" transition
      setTimeout(() => {
        navigate(`/workspace/${response.flipbook.id}`);
      }, 1000);

    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload PDF');
      setUploadState('IDLE');
    }
  };

  // Drag Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const triggerFileSelect = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  return (
    <div style={styles.container}>
      {/* Minimal Header */}
      <nav style={styles.navbar}>
        <div style={styles.navLogo}>
          <span style={styles.logoText}>FAILOI</span>
        </div>
        <div style={styles.navMenu}>
          <a href="#features" style={styles.navLink}>Features</a>
          <a href="#examples" style={styles.navLink}>Examples</a>
          <a href="#pricing" style={styles.navLink}>Pricing</a>
        </div>
        <div style={styles.navActions}>
          {user ? (
            <Link to="/dashboard" className="glass-btn glass-btn-secondary" style={styles.navBtn}>
              Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" style={styles.loginLink}>Log in</Link>
              <Link to="/register" className="glass-btn glass-btn-primary" style={styles.registerBtn}>
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Central Upload Box */}
      <main style={styles.heroContent}>
        <div style={styles.textColumn}>
          <h1 style={styles.heroTitle}>
            Turn your PDF into a flipbook.
          </h1>
          <p style={styles.heroSubtitle}>
            Upload. Flip. Share. <br />
            <span style={{ color: 'var(--text-secondary)' }}>No account required.</span>
          </p>
        </div>

        {/* Dynamic Transforming Upload Box */}
        <div style={styles.uploadColumn}>
          {uploadError && (
            <div style={styles.errorAlert}>
              <ShieldAlert size={16} style={{ marginRight: '8px', flexShrink: 0 }} />
              <span>{uploadError}</span>
            </div>
          )}

          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={uploadState === 'IDLE' ? triggerFileSelect : undefined}
            style={{
              ...styles.dropzone,
              borderColor: dragActive ? 'var(--primary)' : 'rgba(255,255,255,0.08)',
              backgroundColor: dragActive ? 'rgba(var(--primary-rgb), 0.03)' : 'rgba(255,255,255,0.01)',
              cursor: uploadState === 'IDLE' ? 'pointer' : 'default'
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept="application/pdf"
              style={{ display: 'none' }}
            />

            {/* STATE 1: IDLE */}
            {uploadState === 'IDLE' && !dragActive && (
              <div style={styles.dropzoneContent}>
                <div style={styles.iconCircle}>
                  <FileUp size={24} style={{ color: 'var(--primary-light)' }} />
                </div>
                <h3 style={styles.dropzoneTitle}>Drop your PDF here</h3>
                <p style={styles.dropzoneOr}>or choose a file</p>
                <p style={styles.dropzoneMeta}>PDF · Max 50 MB · No sign up required</p>
              </div>
            )}

            {/* STATE 2: DRAG ACTIVE */}
            {uploadState === 'IDLE' && dragActive && (
              <div style={styles.dropzoneContent}>
                <div style={{ ...styles.iconCircle, transform: 'scale(1.1)', borderColor: 'var(--primary)' }}>
                  <FileUp size={24} style={{ color: 'var(--primary)' }} />
                </div>
                <h3 style={{ ...styles.dropzoneTitle, color: 'var(--primary-light)' }}>
                  Drop to create your flipbook
                </h3>
                <p style={styles.dropzoneMeta}>Release to initiate upload</p>
              </div>
            )}

            {/* STATE 3: UPLOADING */}
            {uploadState === 'UPLOADING' && (
              <div style={styles.dropzoneContent}>
                <Loader2 size={24} className="animate-spin" style={{ color: 'var(--primary)', marginBottom: '16px' }} />
                <h4 style={styles.filenameText}>{fileName}</h4>

                {/* Progress bar */}
                <div style={styles.progressBarBg}>
                  <div style={{ ...styles.progressBarFill, width: `${uploadProgress}%` }}></div>
                </div>

                <span style={styles.progressPct}>{uploadProgress}%</span>
                <p style={styles.progressStatus}>Uploading…</p>
              </div>
            )}

            {/* STATE 4: PROCESSING */}
            {uploadState === 'PROCESSING' && (
              <div style={styles.dropzoneContent}>
                <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary-light)', marginBottom: '16px' }} />
                <h4 style={styles.filenameText}>{fileName}</h4>
                <p style={styles.progressStatus}>Creating your flipbook…</p>
                <p style={styles.dropzoneMeta}>Splitting PDF pages</p>
              </div>
            )}

            {/* STATE 5: READY */}
            {uploadState === 'READY' && (
              <div style={styles.dropzoneContent}>
                <CheckCircle2 size={32} style={{ color: 'var(--primary-light)', marginBottom: '16px' }} />
                <h4 style={styles.filenameText}>Ready!</h4>
                <p style={styles.progressStatus}>Redirecting to your workspace...</p>
              </div>
            )}
          </div>

          {/* Under Upload Box Label */}
          <div style={styles.subLabelRow}>
            <span style={styles.subLabelText}>
              Guest flipbooks stay live for 24 hours. Sign in anytime to keep yours.
            </span>
          </div>
        </div>
      </main>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#05070c',
    color: '#f8fafc',
    overflowX: 'hidden',
  },
  navbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 48px',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
    maxWidth: '1280px',
    width: '100%',
    margin: '0 auto',
  },
  navLogo: {
    display: 'flex',
    alignItems: 'center',
  },
  logoText: {
    fontSize: '1rem',
    fontWeight: '700',
    letterSpacing: '0.15em',
    color: '#ffffff',
  },
  navMenu: {
    display: 'flex',
    gap: '32px',
  },
  navLink: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    textDecoration: 'none',
    fontWeight: '500',
    transition: 'color 0.2s',
  },
  navActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
  },
  loginLink: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    textDecoration: 'none',
    fontWeight: '500',
    transition: 'color 0.2s',
  },
  registerBtn: {
    padding: '8px 16px',
    fontSize: '0.85rem',
  },
  navBtn: {
    padding: '8px 16px',
    fontSize: '0.85rem',
  },
  heroContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '64px 24px',
    maxWidth: '800px',
    width: '100%',
    margin: '0 auto',
    gap: '48px',
    textAlign: 'center',
  },
  textColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
  heroTitle: {
    fontSize: '3.5rem',
    fontWeight: '800',
    letterSpacing: '-0.02em',
    lineHeight: '1.1',
    margin: 0,
    color: '#ffffff',
  },
  heroSubtitle: {
    fontSize: '1.25rem',
    fontWeight: '500',
    lineHeight: '1.4',
    margin: 0,
    color: 'var(--text-primary)',
  },
  uploadColumn: {
    width: '100%',
    maxWidth: '480px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  dropzone: {
    border: '2px dashed rgba(255,255,255,0.08)',
    borderRadius: '12px',
    padding: '48px 24px',
    transition: 'all 0.25s ease',
    outline: 'none',
  },
  dropzoneContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  iconCircle: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    border: '1px solid rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.01)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '20px',
    transition: 'all 0.25s ease',
  },
  dropzoneTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#ffffff',
    margin: '0 0 4px 0',
  },
  dropzoneOr: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    margin: '0 0 16px 0',
    textDecoration: 'underline',
  },
  dropzoneMeta: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    margin: 0,
  },
  errorAlert: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    border: '1px solid rgba(239,68,68,0.15)',
    borderRadius: '6px',
    padding: '10px 14px',
    fontSize: '0.8rem',
    color: '#f87171',
    display: 'flex',
    alignItems: 'center',
  },
  subLabelRow: {
    textAlign: 'center',
  },
  subLabelText: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
  },
  filenameText: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: '16px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '300px',
  },
  progressBarBg: {
    width: '100%',
    maxWidth: '240px',
    height: '4px',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: '2px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: 'var(--primary)',
    transition: 'width 0.1s ease',
  },
  progressPct: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: '4px',
  },
  progressStatus: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    margin: 0,
  },
};

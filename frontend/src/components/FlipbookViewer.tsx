import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Minimize2, 
  ArrowLeft, Search, Printer, Download, Share2, BookOpen, Bookmark, 
  Grid, Volume2, VolumeX, Loader2, AlertTriangle
} from 'lucide-react';
// @ts-ignore
import HTMLFlipBook from 'react-pageflip';

const PageFlipBook = HTMLFlipBook as any;

interface FlipbookViewerProps {
  pdfUrl: string;
  bookTitle?: string;
  disableCopy?: boolean;
  disablePrint?: boolean;
  disableDownload?: boolean;
  autoFlip?: boolean;
  showToolbar?: boolean;
  onPageChange?: (page: number) => void;
  onClose?: () => void; // Back button callback
  onDownload?: () => void;
  onShare?: () => void;
}

// ForwardRef Wrapper for react-pageflip compatibility
const FlipPage = React.forwardRef<HTMLDivElement, any>((props, ref) => {
  const isLeft = props.pageNum % 2 === 0;
  const isCover = props.density === 'hard';
  
  return (
    <div 
      ref={ref} 
      className={`page-sheet ${props.className || ''}`} 
      style={{ 
        ...props.style, 
        ...styles.pageWrapper,
        borderTopLeftRadius: isLeft && !isCover ? '4px' : '0px',
        borderBottomLeftRadius: isLeft && !isCover ? '4px' : '0px',
        borderTopRightRadius: !isLeft && !isCover ? '4px' : '0px',
        borderBottomRightRadius: !isLeft && !isCover ? '4px' : '0px',
      }}
      data-density={props.density || 'soft'}
    >
      {/* Dynamic Paper Shadows & Texture overlay */}
      {!isCover && (
        <div style={{
          ...styles.paperGradient,
          background: isLeft 
            ? 'linear-gradient(90deg, rgba(0,0,0,0.15) 0%, rgba(255,255,255,0.02) 8%, transparent 100%)'
            : 'linear-gradient(-90deg, rgba(0,0,0,0.15) 0%, rgba(255,255,255,0.02) 8%, transparent 100%)'
        }} />
      )}
      
      {/* Content wrapper */}
      <div style={styles.pageContent}>
        {props.children}
      </div>

      {/* Realistic Edge Border Shadow to simulate thick pages Stack */}
      <div style={{
        ...styles.pageEdgeShadow,
        [isLeft ? 'left' : 'right']: 0,
        background: isLeft 
          ? 'linear-gradient(90deg, rgba(0,0,0,0.03) 0%, transparent 100%)'
          : 'linear-gradient(-90deg, rgba(0,0,0,0.03) 0%, transparent 100%)'
      }} />
    </div>
  );
});
FlipPage.displayName = 'FlipPage';

export const FlipbookViewer: React.FC<FlipbookViewerProps> = ({
  pdfUrl,
  bookTitle = 'Digital Flipbook',
  disableCopy = false,
  disablePrint = false,
  disableDownload = false,
  autoFlip = false,
  showToolbar = true,
  onPageChange,
  onClose,
  onDownload,
  onShare
}) => {
  const [pdf, setPdf] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1); // 1-indexed for viewer UI
  const [zoom, setZoom] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [aspectRatio, setAspectRatio] = useState(0.707); // Default standard A4
  const [dimensions, setDimensions] = useState({ width: 450, height: 636 });
  
  // Render cache & state
  const [renderedPages, setRenderedPages] = useState<(string | null)[]>([]);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [showThumbnails, setShowThumbnails] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [showSearchList, setShowSearchList] = useState(false);
  const [pageTexts, setPageTexts] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // References
  const flipBookRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const renderingQueue = useRef<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  // Play natural self-contained page turn synthesized noise
  const playFlipSound = useCallback(() => {
    if (!isSoundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      const bufferSize = ctx.sampleRate * 0.45;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      // Synthesize paper whispers
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseNode = ctx.createBufferSource();
      noiseNode.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1100, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.4);
      filter.Q.setValueAtTime(4.0, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.43);

      noiseNode.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noiseNode.start();
    } catch (e) {
      console.warn('Sound synthesis error:', e);
    }
  }, [isSoundEnabled]);

  // Load PDF.js dynamically
  const loadPdfJs = useCallback((): Promise<any> => {
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
      script.onerror = () => reject(new Error('Failed to load PDF library'));
      document.head.appendChild(script);
    });
  }, []);

  const [error, setError] = useState<string | null>(null);

  // Fetch document & extract pages details
  const fetchDoc = useCallback(async () => {
    setError(null);
    setPdf(null);
    console.log('[Viewer] Loading PDF from:', pdfUrl);
    try {
      const pdfjsLib = await loadPdfJs();
      const loadedPdf = await pdfjsLib.getDocument(pdfUrl).promise;

      setPdf(loadedPdf);
      setNumPages(loadedPdf.numPages);
      setRenderedPages(new Array(loadedPdf.numPages).fill(null));
      console.log('[Viewer] PDF loaded, pages count:', loadedPdf.numPages);

      // Read first page viewport to determine perfect aspect ratio
      const firstPage = await loadedPdf.getPage(1);
      const view = firstPage.getViewport({ scale: 1.0 });
      setAspectRatio(view.width / view.height);

      // Run full text search compilation background index
      extractAllPageTexts(loadedPdf);
      console.log('[Viewer] loading state cleared');
    } catch (err: any) {
      console.error('[Viewer] Error loading PDF:', err);
      setError(err.message || 'Failed to load PDF document.');
    }
  }, [pdfUrl, loadPdfJs]);

  useEffect(() => {
    fetchDoc();
  }, [fetchDoc]);

  // Extract texts from all PDF pages for in-book search utility
  const extractAllPageTexts = async (pdfDoc: any) => {
    try {
      const texts: string[] = [];
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const pageString = textContent.items.map((item: any) => item.str).join(' ');
        texts.push(pageString.toLowerCase());
      }
      setPageTexts(texts);
    } catch (e) {
      console.warn('Could not index PDF text content:', e);
    }
  };

  // Perform search queries
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearchList(false);
      return;
    }
    
    setIsSearching(true);
    const delayDebounce = setTimeout(() => {
      const query = searchQuery.toLowerCase().trim();
      const matches: number[] = [];
      pageTexts.forEach((text, idx) => {
        if (text.includes(query)) {
          matches.push(idx + 1);
        }
      });
      setSearchResults(matches);
      setShowSearchList(true);
      setIsSearching(false);
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, pageTexts]);

  // Render a specific PDF page onto canvas, then save as compressed high-res image
  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdf || renderingQueue.current.has(pageNum)) return;
    renderingQueue.current.add(pageNum);

    try {
      const page = await pdf.getPage(pageNum);
      // Render at 1.8x scale for extremely crisp, high-definition displays (no blurry rendering)
      const scale = 1.8;
      const viewport = page.getViewport({ scale });
      
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, viewport.width, viewport.height);
        
        await page.render({
          canvasContext: ctx,
          viewport: viewport,
        }).promise;
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85); // JPEG compression saves GPU memory
        setRenderedPages((prev) => {
          const next = [...prev];
          next[pageNum - 1] = dataUrl;
          return next;
        });
      }
    } catch (err) {
      console.error(`Error rendering page ${pageNum}:`, err);
    } finally {
      renderingQueue.current.delete(pageNum);
    }
  }, [pdf]);

  // Virtualization effect: Lazy loads adjacent pages, and unloads distant ones
  useEffect(() => {
    if (!pdf || numPages === 0) return;
    
    // Lazy-load range: currentPage +/- 3 pages
    const range = 3;
    const start = Math.max(1, currentPage - range);
    const end = Math.min(numPages, currentPage + range);

    // Unload distant page images
    setRenderedPages((prev) => {
      let changed = false;
      const next = prev.map((url, index) => {
        const pageNum = index + 1;
        if (url && (pageNum < start || pageNum > end)) {
          changed = true;
          return null; // Free memory
        }
        return url;
      });
      return changed ? next : prev;
    });

    // Render new pages inside active range
    for (let p = start; p <= end; p++) {
      if (!renderedPages[p - 1]) {
        renderPage(p);
      }
    }
  }, [currentPage, pdf, numPages, renderPage]);

  // Dynamic layout auto-resizer based on viewport bounds
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      if (!container) return;
      
      const isMobile = window.innerWidth < 820;
      const verticalOffset = isFullscreen ? 160 : 220;
      
      const maxContainerWidth = container.clientWidth - 48;
      const maxContainerHeight = window.innerHeight - verticalOffset;

      let bookW = isMobile ? maxContainerWidth : maxContainerWidth / 2;
      let bookH = bookW / aspectRatio;

      // Restrict if too tall for screen
      if (bookH > maxContainerHeight) {
        bookH = maxContainerHeight;
        bookW = bookH * aspectRatio;
      }

      setDimensions({
        width: Math.floor(bookW),
        height: Math.floor(bookH)
      });
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call
    
    // Delay slightly to wait for DOM transitions
    const t = setTimeout(handleResize, 150);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(t);
    };
  }, [aspectRatio, isFullscreen]);

  // Watch autoFlip setting
  useEffect(() => {
    if (!autoFlip || numPages === 0) return;
    const interval = setInterval(() => {
      const pf = flipBookRef.current?.pageFlip();
      if (pf) pf.flipNext();
    }, 4500);
    return () => clearInterval(interval);
  }, [autoFlip, numPages]);

  // Navigate keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const pf = flipBookRef.current?.pageFlip();
      if (!pf) return;
      if (e.key === 'ArrowRight' || e.key === ' ') {
        pf.flipNext();
        playFlipSound();
      } else if (e.key === 'ArrowLeft') {
        pf.flipPrev();
        playFlipSound();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playFlipSound]);

  // Fullscreen toggle event listener
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const handlePageFlip = (e: any) => {
    // react-pageflip events trigger with new index (0-indexed)
    const newPage = e.data + 1;
    setCurrentPage(newPage);
    playFlipSound();
    if (onPageChange) onPageChange(newPage);
  };

  const jumpToPage = (pageNum: number) => {
    const pf = flipBookRef.current?.pageFlip();
    if (pf) {
      // react-pageflip uses 0-indexed page numbers
      if (typeof pf.turnToPage === 'function') {
        pf.turnToPage(pageNum - 1);
      } else if (typeof pf.flip === 'function') {
        pf.flip(pageNum - 1);
      }
      playFlipSound();
    }
  };

  const toggleFullscreen = () => {
    const elem = containerRef.current;
    if (!elem) return;

    if (!isFullscreen) {
      elem.requestFullscreen().catch(err => console.error(err));
    } else {
      document.exitFullscreen();
    }
  };

  const toggleBookmark = () => {
    setBookmarks(prev => {
      if (prev.includes(currentPage)) {
        return prev.filter(p => p !== currentPage);
      } else {
        return [...prev, currentPage].sort((a, b) => a - b);
      }
    });
  };

  const handlePrint = () => {
    if (disablePrint) return;
    window.print();
  };

  const handleDownload = () => {
    if (disableDownload) return;
    if (onDownload) onDownload();
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `${bookTitle}.pdf`;
    link.click();
  };

  const handleShare = () => {
    if (onShare) onShare();
    if (navigator.share) {
      navigator.share({
        title: bookTitle,
        url: window.location.href
      }).catch(err => console.warn(err));
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Share URL copied to clipboard!');
    }
  };

  return (
    <div 
      ref={containerRef} 
      style={{
        ...styles.viewerContainer,
        userSelect: disableCopy ? 'none' : 'auto',
        WebkitUserSelect: disableCopy ? 'none' : 'auto'
      }}
      id="failoi-reader-container"
    >
      {/* 1. TOP TOOLBAR */}
      {showToolbar && (
        <header style={styles.topToolbar}>
          <div style={styles.toolbarLeft}>
            {onClose && (
              <button onClick={onClose} style={styles.navBackBtn} title="Back to Dashboard">
                <ArrowLeft size={18} />
                <span>Exit</span>
              </button>
            )}
            <span style={styles.titleText}>{bookTitle}</span>
          </div>

          {/* Dynamic page search */}
          <div style={styles.searchWrapper}>
            <div style={styles.searchBar}>
              <Search size={16} style={{ color: 'var(--text-secondary)' }} />
              <input 
                type="text" 
                placeholder="Search in book..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchInput}
              />
              {isSearching && <Loader2 size={14} className="animate-spin" style={{ color: 'var(--primary)' }} />}
            </div>

            {/* Search Result Dropdown popover */}
            {showSearchList && searchResults.length > 0 && (
              <div style={styles.searchResultsDropdown} className="glass-card">
                <h4 style={styles.dropdownHeader}>Matches found ({searchResults.length}):</h4>
                <div style={styles.dropdownList}>
                  {searchResults.map((pageNo) => (
                    <button 
                      key={pageNo} 
                      onClick={() => {
                        jumpToPage(pageNo);
                        setShowSearchList(false);
                      }}
                      style={styles.dropdownItem}
                    >
                      <BookOpen size={14} style={{ color: 'var(--primary)' }} />
                      <span>Jump to page {pageNo}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={styles.toolbarRight}>
            {/* Zoom controls */}
            <div style={styles.zoomButtons}>
              <button onClick={() => setZoom(z => Math.max(0.6, z - 0.15))} style={styles.toolIconBtn} title="Zoom Out">
                <ZoomOut size={16} />
              </button>
              <span style={styles.zoomText}>{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(2.0, z + 0.15))} style={styles.toolIconBtn} title="Zoom In">
                <ZoomIn size={16} />
              </button>
            </div>

            {/* Audio volume toggler */}
            <button onClick={() => setIsSoundEnabled(!isSoundEnabled)} style={styles.toolIconBtn} title="Toggle Sound">
              {isSoundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>

            {/* Fullscreen toggler */}
            <button onClick={toggleFullscreen} style={styles.toolIconBtn} title="Toggle Fullscreen">
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          </div>
        </header>
      )}

      {/* 2. MAIN READING AREA */}
      <main 
        style={{
          ...styles.bookWorkspace,
          transform: `scale(${zoom})`,
          transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        {error ? (
          <div style={styles.errorFileBox}>
            <AlertTriangle size={48} style={{ color: 'var(--error)' }} />
            <h3 style={{ marginTop: '16px' }}>Failed to load Flipbook</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '0.95rem' }}>{error}</p>
            <button
              onClick={fetchDoc}
              className="glass-btn glass-btn-primary"
              style={{ marginTop: '20px' }}
            >
              Retry
            </button>
          </div>
        ) : pdf ? (
          <div 
            style={{
              ...styles.bookPlacementShadow,
              width: window.innerWidth < 820 ? `${dimensions.width}px` : `${dimensions.width * 2}px`,
              height: `${dimensions.height}px`
            }}
          >
            {/* HTMLFlipBook Component */}
            <PageFlipBook
              width={dimensions.width}
              height={dimensions.height}
              size="stretch"
              minWidth={280}
              maxWidth={800}
              minHeight={360}
              maxHeight={1000}
              maxShadowOpacity={0.5}
              showCover={true}
              mobileScrollSupport={true}
              onFlip={handlePageFlip}
              ref={flipBookRef}
              className="failoi-flipbook"
            >
              {/* Cover pages and inner soft sheets */}
              {Array.from({ length: numPages }).map((_, index) => {
                const pageNum = index + 1;
                const isCover = pageNum === 1 || pageNum === numPages;
                
                return (
                  <FlipPage 
                    key={pageNum} 
                    pageNum={pageNum} 
                    density={isCover ? 'hard' : 'soft'}
                  >
                    {renderedPages[index] ? (
                      <img 
                        src={renderedPages[index] || ''} 
                        alt={`Page ${pageNum}`} 
                        style={styles.pageImage} 
                      />
                    ) : (
                      <div style={styles.loadingPageBox}>
                        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)' }} />
                        <span style={styles.loadingText}>FAILOI Rendering Page {pageNum}...</span>
                      </div>
                    )}
                  </FlipPage>
                );
              })}
            </PageFlipBook>
          </div>
        ) : (
          <div style={styles.loadingFileBox}>
            <Loader2 size={48} className="animate-spin" style={{ color: 'var(--primary)' }} />
            <h3 style={{ marginTop: '16px' }}>Loading FAILOI Interactive Reader...</h3>
          </div>
        )}
      </main>

      {/* 3. THUMBNAIL DRAWER OVERLAY */}
      {showThumbnails && pdf && (
        <div style={styles.thumbnailsDrawer} className="glass-card animate-fade-in">
          <div style={styles.drawerHeader}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Page Thumbnails</h3>
            <button onClick={() => setShowThumbnails(false)} style={styles.drawerCloseBtn}>Close</button>
          </div>
          <div style={styles.thumbnailsGrid}>
            {Array.from({ length: numPages }).map((_, index) => {
              const pageNum = index + 1;
              return (
                <div 
                  key={pageNum} 
                  style={{
                    ...styles.thumbCard,
                    borderColor: currentPage === pageNum ? 'var(--primary)' : 'var(--border-color)'
                  }}
                  onClick={() => {
                    jumpToPage(pageNum);
                    setShowThumbnails(false);
                  }}
                >
                  <div style={styles.thumbImageWrapper}>
                    {renderedPages[index] ? (
                      <img src={renderedPages[index]!} alt="" style={styles.thumbImg} />
                    ) : (
                      <div style={styles.thumbLoader}><Loader2 size={16} className="animate-spin" /></div>
                    )}
                  </div>
                  <span style={styles.thumbPageNo}>Page {pageNum}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. BOTTOM TOOLBAR */}
      {showToolbar && (
        <footer style={styles.bottomToolbar}>
          {/* Progress bar */}
          <div style={styles.progressRow}>
            <div style={styles.progressBarBg}>
              <div 
                style={{
                  ...styles.progressBarFill,
                  width: `${(currentPage / (numPages || 1)) * 100}%`
                }} 
              />
            </div>
            <span style={styles.progressText}>
              {currentPage} / {numPages || 1} ({Math.round((currentPage / (numPages || 1)) * 100)}%)
            </span>
          </div>

          <div style={styles.footerControlsRow}>
            <div style={styles.footerControlsLeft}>
              {/* Previous Page arrow */}
              <button 
                onClick={() => {
                  const pf = flipBookRef.current?.pageFlip();
                  if (pf) pf.flipPrev();
                }} 
                style={styles.footerBtn}
                className="glass-btn glass-btn-secondary"
                disabled={currentPage <= 1}
              >
                <ChevronLeft size={16} />
                <span>Prev</span>
              </button>

              {/* Thumbnail toggle */}
              <button 
                onClick={() => setShowThumbnails(!showThumbnails)} 
                style={styles.footerBtn}
                className="glass-btn glass-btn-secondary"
              >
                <Grid size={16} />
                <span>Thumbnails</span>
              </button>

              {/* Bookmark button */}
              <button 
                onClick={toggleBookmark} 
                style={{
                  ...styles.footerBtn,
                  color: bookmarks.includes(currentPage) ? '#f59e0b' : 'inherit'
                }}
                className="glass-btn glass-btn-secondary"
              >
                <Bookmark size={16} />
                <span>{bookmarks.includes(currentPage) ? 'Bookmarked' : 'Bookmark'}</span>
              </button>
            </div>

            <div style={styles.footerControlsRight}>
              {/* Share Trigger */}
              <button onClick={handleShare} style={styles.footerBtn} className="glass-btn glass-btn-secondary">
                <Share2 size={16} />
                <span>Share</span>
              </button>

              {/* Print Trigger */}
              {!disablePrint && (
                <button onClick={handlePrint} style={styles.footerBtn} className="glass-btn glass-btn-secondary">
                  <Printer size={16} />
                  <span>Print</span>
                </button>
              )}

              {/* Download Trigger */}
              {!disableDownload && (
                <button onClick={handleDownload} style={styles.footerBtn} className="glass-btn glass-btn-secondary">
                  <Download size={16} />
                  <span>Download</span>
                </button>
              )}

              {/* Next Page arrow */}
              <button 
                onClick={() => {
                  const pf = flipBookRef.current?.pageFlip();
                  if (pf) pf.flipNext();
                }} 
                style={styles.footerBtn}
                className="glass-btn glass-btn-primary"
                disabled={currentPage >= numPages}
              >
                <span>Next</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </footer>
      )}

      {/* Styled components custom scrollbars & float animations */}
      <style>{`
        .failoi-flipbook {
          box-shadow: 0 30px 60px rgba(0,0,0,0.6);
          border-radius: 6px;
        }
        .page-sheet {
          box-sizing: border-box;
          box-shadow: inset 0 0 40px rgba(0,0,0,0.06);
        }
        .spinner {
          border: 3px solid rgba(255,255,255,0.05);
          border-top: 3px solid var(--primary);
          border-radius: 50%;
          width: 24px;
          height: 24px;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  viewerContainer: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    backgroundColor: '#060913',
    backgroundImage: 'radial-gradient(circle at 50% 50%, #0d1527 0%, #05070f 100%)',
    position: 'relative',
    overflow: 'hidden',
    color: '#f8fafc',
  },
  topToolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    backgroundColor: 'rgba(6, 9, 19, 0.75)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
    zIndex: 40,
  },
  toolbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  navBackBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '4px',
    padding: '6px 12px',
    color: '#ffffff',
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
  titleText: {
    fontWeight: 'bold',
    fontSize: '1.05rem',
    fontFamily: 'var(--font-display)',
    letterSpacing: '0.02em',
  },
  searchWrapper: {
    position: 'relative',
    width: '260px',
  },
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '20px',
    padding: '6px 14px',
  },
  searchInput: {
    background: 'none',
    border: 'none',
    color: '#ffffff',
    outline: 'none',
    fontSize: '0.85rem',
    width: '100%',
  },
  searchResultsDropdown: {
    position: 'absolute',
    top: '42px',
    left: 0,
    width: '100%',
    maxHeight: '220px',
    overflowY: 'auto',
    zIndex: 50,
    padding: '10px',
    background: 'rgba(10, 15, 30, 0.95)',
    border: '1px solid rgba(0, 102, 255, 0.15)',
    borderRadius: '8px',
    backdropFilter: 'blur(20px)',
  },
  dropdownHeader: {
    margin: '0 0 8px 0',
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
  },
  dropdownList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'none',
    border: 'none',
    color: '#ffffff',
    padding: '8px 10px',
    textAlign: 'left',
    width: '100%',
    cursor: 'pointer',
    borderRadius: '4px',
    fontSize: '0.85rem',
    transition: 'background 0.2s',
    outline: 'none',
  },
  toolbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  zoomButtons: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '16px',
    padding: '3px 8px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  zoomText: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    minWidth: '36px',
    textAlign: 'center',
  },
  toolIconBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    outline: 'none',
    transition: 'color 0.2s, background 0.2s',
  },
  bookWorkspace: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px 24px',
    overflow: 'auto',
  },
  bookPlacementShadow: {
    position: 'relative',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageWrapper: {
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    position: 'relative',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paperGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 10,
  },
  pageEdgeShadow: {
    position: 'absolute',
    top: 0,
    width: '4px',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 8,
  },
  pageContent: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  pageImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    display: 'block',
  },
  loadingPageBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    backgroundColor: '#ffffff',
    color: '#0f172a',
    gap: '12px',
  },
  loadingText: {
    fontSize: '0.8rem',
    color: '#64748b',
    fontWeight: '500',
  },
  loadingFileBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px',
  },
  errorFileBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px',
    textAlign: 'center' as const,
  },
  thumbnailsDrawer: {
    position: 'absolute',
    bottom: '90px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '90%',
    maxWidth: '850px',
    maxHeight: '260px',
    background: 'rgba(10, 15, 30, 0.95)',
    border: '1px solid rgba(0, 102, 255, 0.15)',
    borderRadius: '12px',
    padding: '16px',
    backdropFilter: 'blur(20px)',
    zIndex: 45,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  drawerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    paddingBottom: '8px',
  },
  drawerCloseBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--primary-light)',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '500',
  },
  thumbnailsGrid: {
    display: 'flex',
    gap: '16px',
    overflowX: 'auto',
    paddingBottom: '8px',
  },
  thumbCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    alignItems: 'center',
    cursor: 'pointer',
    border: '2px solid transparent',
    borderRadius: '6px',
    padding: '4px',
    transition: 'all 0.2s',
  },
  thumbImageWrapper: {
    width: '80px',
    height: '110px',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: '4px',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  thumbLoader: {
    color: 'var(--text-secondary)',
  },
  thumbPageNo: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
  },
  bottomToolbar: {
    display: 'flex',
    flexDirection: 'column',
    padding: '12px 24px 20px 24px',
    backgroundColor: 'rgba(6, 9, 19, 0.85)',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
    zIndex: 40,
    gap: '12px',
  },
  progressRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%',
  },
  progressBarBg: {
    flex: 1,
    height: '6px',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: 'var(--primary)',
    borderRadius: '3px',
    transition: 'width 0.2s ease-out',
  },
  progressText: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    fontWeight: '500',
    minWidth: '100px',
    textAlign: 'right',
  },
  footerControlsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%',
    flexWrap: 'wrap',
    gap: '16px',
  },
  footerControlsLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  footerControlsRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  footerBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    fontSize: '0.85rem',
  },
};

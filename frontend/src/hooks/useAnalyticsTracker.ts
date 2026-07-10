import { useEffect, useRef, useState } from 'react';
import { BASE_URL } from '../services/api.js';



export const useAnalyticsTracker = (
  flipbookId: string | undefined,
  currentPage: number,
  embedded = false
) => {
  const sessionIdRef = useRef<string>('');
  const visitorIdRef = useRef<string>('');
  const pagesReadRef = useRef<Set<number>>(new Set([1])); // Always starts on page 1
  const durationRef = useRef<number>(0);
  
  // Track action triggers
  const [downloaded, setDownloaded] = useState(false);
  const [shared, setShared] = useState(false);
  const [sharePlatform, setSharePlatform] = useState<string | null>(null);

  // Generate a random ID
  const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

  // Initialize Session
  useEffect(() => {
    if (!flipbookId) return;

    // Get or create Visitor ID (persists across visits)
    let visitorId = localStorage.getItem('fb_visitor_id');
    if (!visitorId) {
      visitorId = `vis_${generateId()}`;
      localStorage.setItem('fb_visitor_id', visitorId);
    }
    visitorIdRef.current = visitorId;

    // Create unique session ID for this viewing session
    sessionIdRef.current = `sess_${generateId()}`;
    durationRef.current = 0;
    pagesReadRef.current = new Set([currentPage || 1]);

    // Send initial ping
    sendPacket();

    // Start accumulative duration timer (updates every 5 seconds)
    const interval = setInterval(() => {
      durationRef.current += 5;
      sendPacket();
    }, 5000);

    // Sync on unmount or tab close
    const handleBeforeUnload = () => {
      sendPacket();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      sendPacket(); // Flush remaining
    };
  }, [flipbookId]);

  // Track page changes
  useEffect(() => {
    if (!flipbookId) return;
    if (currentPage > 0) {
      const prevSize = pagesReadRef.current.size;
      pagesReadRef.current.add(currentPage);
      
      // If we read a new page, trigger immediate sync
      if (pagesReadRef.current.size > prevSize) {
        sendPacket();
      }
    }
  }, [currentPage, flipbookId]);

  // Helper to send tracking packet
  const sendPacket = async () => {
    if (!flipbookId || !sessionIdRef.current) return;

    const packet = {
      sessionId: sessionIdRef.current,
      flipbookId,
      visitorId: visitorIdRef.current,
      duration: durationRef.current,
      pagesRead: Array.from(pagesReadRef.current),
      downloaded,
      shared,
      sharePlatform,
      embedded,
      referrer: document.referrer || 'direct'
    };

    try {
      // Use standard fetch (unauthenticated is fine, tracking is public)
      await fetch(`${BASE_URL}/analytics/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(packet),
      });
    } catch (err) {
      console.warn('[AnalyticsTracker] Failed to send ping:', err);
    }
  };

  // Action wrappers to trigger immediate tracking
  const trackDownload = () => {
    setDownloaded(true);
    // Force immediate sync
    setTimeout(() => sendPacket(), 100);
  };

  const trackShare = (platform: string) => {
    setShared(true);
    setSharePlatform(platform);
    // Force immediate sync
    setTimeout(() => sendPacket(), 100);
  };

  return {
    trackDownload,
    trackShare
  };
};

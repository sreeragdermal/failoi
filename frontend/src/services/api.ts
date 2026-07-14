export const API_HOST = '';
export const BASE_URL = '/api/v1';

let accessToken: string | null = null;
let refreshPromise: Promise<string> | null = null;
let inMemoryCsrfToken: string | null = null;
let csrfPromise: Promise<string> | null = null;

export const setCsrfToken = (token: string | null) => {
  inMemoryCsrfToken = token;
};

export const ensureCsrfToken = async (): Promise<string> => {
  if (inMemoryCsrfToken) {
    return inMemoryCsrfToken;
  }
  if (csrfPromise) {
    return csrfPromise;
  }

  csrfPromise = (async () => {
    try {
      console.log('[CSRF Client] Fetching CSRF token from backend...');
      const csrfRes = await fetch(`${BASE_URL}/auth/csrf`, {
        method: 'GET',
        headers: accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {},
        credentials: 'include',
      });
      if (csrfRes.ok) {
        const csrfData = await csrfRes.json();
        if (csrfData && csrfData.csrfToken) {
          inMemoryCsrfToken = csrfData.csrfToken;
          return csrfData.csrfToken;
        }
      }
      throw new Error('Failed to fetch CSRF token');
    } catch (err) {
      console.error('[CSRF Client] Fetch request threw error:', err);
      throw err;
    } finally {
      csrfPromise = null;
    }
  })();

  return csrfPromise;
};

// Helper to read cookies client-side
const getCookie = (name: string): string | null => {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  if (match) return match[2];
  return null;
};

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

// Helper to handle token refresh to avoid race conditions with multiple concurrent failed requests
const handleTokenRefresh = async (): Promise<string> => {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // IMPORTANT: include credentials to send and receive cookies cross-origin
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Refresh failed');
      }

      const data = await response.json();
      setAccessToken(data.accessToken);
      if (data.csrfToken) {
        setCsrfToken(data.csrfToken);
      }
      return data.accessToken;
    } catch (err) {
      setAccessToken(null);
      throw err;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

export const apiRequest = async (path: string, options: RequestInit = {}): Promise<any> => {
  const method = options.method || 'GET';
  const isMutation = !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());

  // Automatically pre-fetch the CSRF token before performing any mutation if we do not have one in memory
  if (isMutation && !inMemoryCsrfToken && !path.includes('/auth/csrf') && !path.includes('/auth/login') && !path.includes('/auth/register') && !path.includes('/auth/refresh')) {
    try {
      console.log('[CSRF Client] Pre-fetching CSRF token from backend for request:', path);
      await ensureCsrfToken();
    } catch (csrfErr) {
      console.error('[CSRF Client] Pre-fetch request threw error:', csrfErr);
    }
  }

  const url = `${BASE_URL}${path}`;
  const headers = new Headers(options.headers || {});

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  // Inject CSRF double submit token if token/cookie is set
  const csrfToken = inMemoryCsrfToken || getCookie('csrfToken');
  if (csrfToken) {
    headers.set('X-CSRF-Token', csrfToken);
  }

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: 'include',
  };

  let response = await fetch(url, fetchOptions);

  // If unauthorized, attempt to refresh token (bypass for public slug reader requests)
  if (
    (response.status === 401 || response.status === 403) &&
    !path.includes('/auth/login') &&
    !path.includes('/auth/register') &&
    !path.includes('/flipbooks/slug/')
  ) {
    try {
      const newToken = await handleTokenRefresh();
      
      // Update header with new token and retry
      headers.set('Authorization', `Bearer ${newToken}`);
      // Refresh CSRF header after refresh
      const refreshedCsrf = inMemoryCsrfToken || getCookie('csrfToken');
      if (refreshedCsrf) {
        headers.set('X-CSRF-Token', refreshedCsrf);
      }
      response = await fetch(url, {
        ...fetchOptions,
        headers,
      });
    } catch (refreshErr) {
      // If refresh fails, clear token and bubble up the error
      setAccessToken(null);
      window.dispatchEvent(new CustomEvent('auth-expired'));
      throw new Error('Your session has expired. Please log in again.');
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = 'Request failed';
    try {
      const errorObj = JSON.parse(errorText);
      errorMessage = errorObj.error || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return null;
  }

  const data = await response.json();
  if (data && data.csrfToken) {
    setCsrfToken(data.csrfToken);
  }
  return data;
};

export const uploadFileWithProgress = async (
  path: string,
  formData: FormData,
  onProgress: (percent: number) => void
): Promise<any> => {
  // Pre-fetch CSRF token if not in memory
  let csrfToken: string = '';
  try {
    csrfToken = await ensureCsrfToken();
  } catch (err) {
    // Fallback to cookie check if the API call failed
    csrfToken = getCookie('csrfToken') || '';
  }

  const executeUpload = (token: string, isRetry = false): Promise<any> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const url = `${BASE_URL}${path}`;

      xhr.open('POST', url, true);
      xhr.withCredentials = true; // Send secure cookies cross-origin

      const authTok = getAccessToken();
      if (authTok) {
        xhr.setRequestHeader('Authorization', `Bearer ${authTok}`);
      }

      if (token) {
        xhr.setRequestHeader('X-CSRF-Token', token);
      }

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            resolve(xhr.responseText);
          }
        } else if (xhr.status === 403 && !isRetry) {
          // Check if it's a CSRF error
          let isCsrfError = false;
          try {
            const errorObj = JSON.parse(xhr.responseText);
            if (errorObj.error && errorObj.error.includes('CSRF')) {
              isCsrfError = true;
            }
          } catch {
            if (xhr.responseText && xhr.responseText.includes('CSRF')) {
              isCsrfError = true;
            }
          }

          if (isCsrfError) {
            console.warn('[CSRF Client] CSRF validation failed on initial upload attempt. Retrying with fresh token...');
            // 1. Clear memory token
            setCsrfToken(null);
            // 2. Fetch fresh token
            try {
              const freshToken = await ensureCsrfToken();
              // 3. Retry upload exactly once
              const retryRes = await executeUpload(freshToken, true);
              resolve(retryRes);
            } catch (retryErr) {
              reject(retryErr);
            }
          } else {
            reject(new Error(xhr.responseText || 'Upload failed'));
          }
        } else {
          let errorMessage = 'Upload failed';
          try {
            const errorObj = JSON.parse(xhr.responseText);
            errorMessage = errorObj.error || errorMessage;
          } catch {
            errorMessage = xhr.responseText || errorMessage;
          }
          reject(new Error(errorMessage));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error during upload'));
      };

      xhr.send(formData);
    });
  };

  return executeUpload(csrfToken);
};


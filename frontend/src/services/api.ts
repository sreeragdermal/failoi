export const API_HOST = import.meta.env.VITE_API_URL || 'http://localhost:5005';
export const BASE_URL = `${API_HOST}/api/v1`;

let accessToken: string | null = null;
let refreshPromise: Promise<string> | null = null;
let inMemoryCsrfToken: string | null = null;

export const setCsrfToken = (token: string | null) => {
  inMemoryCsrfToken = token;
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

  // If unauthorized, attempt to refresh token
  if ((response.status === 401 || response.status === 403) && !path.includes('/auth/login') && !path.includes('/auth/register')) {
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

export const uploadFileWithProgress = (
  path: string,
  formData: FormData,
  onProgress: (percent: number) => void
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = `${BASE_URL}${path}`;

    xhr.open('POST', url, true);
    xhr.withCredentials = true; // Send secure cookies cross-origin

    const token = getAccessToken();
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    // Set CSRF token on XMLHttpRequest
    const csrfToken = inMemoryCsrfToken || getCookie('csrfToken');
    if (csrfToken) {
      xhr.setRequestHeader('X-CSRF-Token', csrfToken);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const resJson = JSON.parse(xhr.responseText);
          resolve(resJson);
        } catch {
          resolve(xhr.responseText);
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


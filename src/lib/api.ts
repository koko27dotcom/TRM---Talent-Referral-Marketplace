/**
 * Centralized API Client for TRM Referral Platform
 * Production-ready with environment-based configuration
 */

// Environment-based API URL configuration
// Priority: VITE_API_URL env var > window.location.origin (same-origin) > fallback
const getApiBaseUrl = (): string => {
  // Check for explicit environment variable first
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // In production (Render), API is on same origin
  if (import.meta.env.PROD) {
    return '/api/v1';
  }
  
  // Development fallback - backend runs on port 3000
  return 'http://localhost:3000/api/v1';
};

export const API_BASE_URL = getApiBaseUrl();

// Request/Response types
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface RequestConfig {
  headers?: Record<string, string>;
  skipAuth?: boolean;
}

/**
 * Get authentication token from localStorage
 */
const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

/**
 * Build request headers with authentication
 */
const buildHeaders = (config?: RequestConfig): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...config?.headers,
  };

  if (!config?.skipAuth) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
};

/**
 * Handle API response and errors
 */
const handleResponse = async <T>(response: Response): Promise<ApiResponse<T>> => {
  const contentType = response.headers.get('content-type');
  
  if (!response.ok) {
    // Try to parse error response
    try {
      if (contentType?.includes('application/json')) {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        };
      }
    } catch {
      // JSON parsing failed
    }
    
    return {
      success: false,
      error: `HTTP ${response.status}: ${response.statusText}`,
    };
  }

  // Parse successful response
  try {
    if (contentType?.includes('application/json')) {
      const data = await response.json();
      return {
        success: true,
        data: data.data || data,
        message: data.message,
      };
    }
    
    // Non-JSON response
    const text = await response.text();
    return {
      success: true,
      data: text as unknown as T,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to parse response',
    };
  }
};

/**
 * Centralized API client with standardized methods
 */
export const api = {
  /**
   * GET request
   */
  async get<T = unknown>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: buildHeaders(config),
        credentials: 'include',
      });
      
      return handleResponse<T>(response);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  },

  /**
   * POST request
   */
  async post<T = unknown>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: buildHeaders(config),
        credentials: 'include',
        body: data ? JSON.stringify(data) : undefined,
      });
      
      return handleResponse<T>(response);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  },

  /**
   * PUT request
   */
  async put<T = unknown>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: buildHeaders(config),
        credentials: 'include',
        body: data ? JSON.stringify(data) : undefined,
      });
      
      return handleResponse<T>(response);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  },

  /**
   * PATCH request
   */
  async patch<T = unknown>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method: 'PATCH',
        headers: buildHeaders(config),
        credentials: 'include',
        body: data ? JSON.stringify(data) : undefined,
      });
      
      return handleResponse<T>(response);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  },

  /**
   * DELETE request
   */
  async delete<T = unknown>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: buildHeaders(config),
        credentials: 'include',
        body: data ? JSON.stringify(data) : undefined,
      });
      
      return handleResponse<T>(response);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  },
};

/**
 * Legacy fetch wrapper for backward compatibility
 * Use the api object for new code
 */
export const apiFetch = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAuthToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });
};

// Export for convenience
export default api;

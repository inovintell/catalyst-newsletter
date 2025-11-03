/**
 * API Client without Authentication
 */

export interface ApiRequestOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
  ok: boolean;
}

/**
 * Base API client class
 */
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl || process.env.NEXT_PUBLIC_APP_URL || '';
  }

  /**
   * Make an API request
   */
  async request<T = any>(
    url: string,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const { headers = {}, ...fetchOptions } = options;

    // Build full URL
    const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;

    // Add default content-type for JSON requests
    const finalHeaders = { ...headers };
    if (
      fetchOptions.body &&
      typeof fetchOptions.body === 'string' &&
      !headers['Content-Type']
    ) {
      finalHeaders['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(fullUrl, {
        ...fetchOptions,
        headers: finalHeaders
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      console.error('API request error:', error);
      return {
        error: error instanceof Error ? error.message : 'Network error',
        status: 0,
        ok: false
      };
    }
  }

  /**
   * Handle API response
   */
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');

    if (response.ok) {
      if (isJson) {
        const data = await response.json();
        return {
          data,
          status: response.status,
          ok: true
        };
      } else {
        const text = await response.text();
        return {
          data: text as any,
          status: response.status,
          ok: true
        };
      }
    } else {
      let error = `Request failed with status ${response.status}`;

      if (isJson) {
        try {
          const errorData = await response.json();
          error = errorData.error || errorData.message || error;
        } catch {
          // Ignore JSON parse errors
        }
      }

      return {
        error,
        status: response.status,
        ok: false
      };
    }
  }

  /**
   * GET request
   */
  async get<T = any>(url: string, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      ...options,
      method: 'GET'
    });
  }

  /**
   * POST request
   */
  async post<T = any>(
    url: string,
    data?: any,
    options?: ApiRequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  /**
   * PUT request
   */
  async put<T = any>(
    url: string,
    data?: any,
    options?: ApiRequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  /**
   * PATCH request
   */
  async patch<T = any>(
    url: string,
    data?: any,
    options?: ApiRequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(url: string, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      ...options,
      method: 'DELETE'
    });
  }
}

// Export a singleton instance
export const apiClient = new ApiClient();

// Export the class for custom instances
export { ApiClient };

// Convenience functions for common API calls
export const api = {
  // Newsletter endpoints
  newsletters: {
    list: () => apiClient.get('/api/newsletters'),
    get: (id: string) => apiClient.get(`/api/newsletters/${id}`),
    create: (data: any) => apiClient.post('/api/newsletters', data),
    update: (id: string, data: any) => apiClient.put(`/api/newsletters/${id}`, data),
    delete: (id: string) => apiClient.delete(`/api/newsletters/${id}`),
    generate: (data: any) => apiClient.post('/api/generate', data),
    refine: (id: string, data: any) => apiClient.post(`/api/refine/${id}`, data)
  },

  // Source endpoints
  sources: {
    list: () => apiClient.get('/api/sources'),
    create: (data: any) => apiClient.post('/api/sources', data),
    update: (id: string, data: any) => apiClient.put(`/api/sources/${id}`, data),
    delete: (id: string) => apiClient.delete(`/api/sources/${id}`)
  },

  // Agent configuration endpoints
  agentConfig: {
    get: () => apiClient.get('/api/agent-config'),
    update: (data: any) => apiClient.put('/api/agent-config', data)
  },

  // Health check
  health: () => apiClient.get('/api/health')
};
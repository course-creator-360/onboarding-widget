const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

export async function apiCall(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE}${endpoint}`;
  console.log('[API] Calling:', url);
  console.log('[API] API_BASE:', API_BASE);
  
  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include', // Send cookies
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    console.log('[API] Response status:', response.status);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'API request failed');
    }
    
    return response.json();
  } catch (error) {
    console.error('[API] Fetch error:', error);
    console.error('[API] URL was:', url);
    throw error;
  }
}

// Auth API calls
export const auth = {
  register: (data: { username: string; email: string; password: string }) =>
    apiCall('/api/auth/register', { 
      method: 'POST', 
      body: JSON.stringify(data) 
    }),
  
  login: (data: { username: string; password: string }) =>
    apiCall('/api/auth/login', { 
      method: 'POST', 
      body: JSON.stringify(data) 
    }),
  
  logout: () =>
    apiCall('/api/auth/logout', { method: 'POST' }),
  
  me: () =>
    apiCall('/api/auth/me'),
};

// Agency API calls
export const agency = {
  status: () => apiCall('/api/agency/status'),
  locations: () => apiCall('/api/agency/locations'),
  clear: () => apiCall('/api/installation?locationId=agency', { method: 'DELETE' }),
};


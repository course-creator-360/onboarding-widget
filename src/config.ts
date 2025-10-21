/**
 * Environment-aware configuration
 * Automatically detects if running on Vercel and uses appropriate URLs
 */

/**
 * Get the base URL for the application
 * Uses VERCEL_URL for Vercel deployments, falls back to localhost
 */
export function getBaseUrl(): string {
  // Explicit override (highest priority)
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL;
  }
  
  // Vercel deployment
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // Local development
  const port = process.env.PORT || 4002;
  return `http://localhost:${port}`;
}

/**
 * Get the OAuth redirect URI
 */
export function getRedirectUri(): string {
  // Explicit override
  if (process.env.GHL_REDIRECT_URI) {
    return process.env.GHL_REDIRECT_URI;
  }
  
  // Auto-construct from base URL
  const baseUrl = getBaseUrl();
  return `${baseUrl}/oauth/callback`;
}

/**
 * Check if running in production (Vercel)
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
}

/**
 * Get environment name
 */
export function getEnvironment(): string {
  if (process.env.VERCEL_ENV) {
    return process.env.VERCEL_ENV; // 'production', 'preview', or 'development'
  }
  return process.env.NODE_ENV || 'development';
}


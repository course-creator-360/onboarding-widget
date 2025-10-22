import { getAgencyInstallation, getInstallation, upsertInstallation, getAgencyInstallationByAccountId, getAllAgencyInstallations } from './db';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const GHL_TOKEN_URL = 'https://services.leadconnectorhq.com/oauth/token';

// Cache location-to-company mapping to avoid repeated API calls
const locationCompanyCache = new Map<string, string>();

/**
 * Refresh an expired OAuth token using the refresh token
 */
async function refreshAccessToken(installation: any): Promise<string | null> {
  const clientId = process.env.GHL_CLIENT_ID;
  const clientSecret = process.env.GHL_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    console.error('[GHL API] Cannot refresh token: Missing client credentials');
    return null;
  }
  
  if (!installation.refreshToken) {
    console.error('[GHL API] Cannot refresh token: No refresh token available');
    return null;
  }
  
  try {
    console.log(`[GHL API] Refreshing access token for ${installation.locationId || 'agency'}...`);
    
    const body = new URLSearchParams();
    body.set('grant_type', 'refresh_token');
    body.set('refresh_token', installation.refreshToken);
    body.set('client_id', clientId);
    body.set('client_secret', clientSecret);
    
    const response = await fetch(GHL_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[GHL API] Token refresh failed:', response.status, errorText);
      return null;
    }
    
    const tokenJson = await response.json() as any;
    
    // Update installation with new tokens
    const updatedInstallation = await upsertInstallation({
      locationId: installation.locationId,
      accountId: installation.accountId,
      accessToken: tokenJson.access_token,
      refreshToken: tokenJson.refresh_token || installation.refreshToken, // Keep old if not provided
      expiresAt: tokenJson.expires_in ? Date.now() + tokenJson.expires_in * 1000 : undefined,
      scope: tokenJson.scope || installation.scope,
      tokenType: installation.tokenType
    });
    
    console.log(`[GHL API] Token refreshed successfully for ${installation.locationId || 'agency'}, expires at: ${new Date(updatedInstallation.expiresAt || 0).toISOString()}`);
    
    return tokenJson.access_token;
    
  } catch (error) {
    console.error('[GHL API] Error refreshing token:', error);
    return null;
  }
}

/**
 * Check if a token is expired or about to expire (within 5 minutes)
 */
function isTokenExpired(installation: any): boolean {
  if (!installation.expiresAt) {
    // If no expiration time, assume it's valid (shouldn't happen but be safe)
    return false;
  }
  
  const now = Date.now();
  const bufferTime = 5 * 60 * 1000; // 5 minutes buffer
  const expiresWithBuffer = installation.expiresAt - bufferTime;
  
  return now >= expiresWithBuffer;
}

/**
 * Fetch location details to determine which company/agency owns it
 * Uses any available agency token for the lookup
 */
async function getLocationCompanyId(locationId: string): Promise<string | null> {
  // Check cache first
  if (locationCompanyCache.has(locationId)) {
    return locationCompanyCache.get(locationId)!;
  }
  
  // Get any available agency token for the lookup
  const agencies = await getAllAgencyInstallations();
  if (agencies.length === 0) {
    console.log('[GHL API] No agency installations available for location lookup');
    return null;
  }
  
  // Try each agency token until we successfully fetch location details
  for (const agency of agencies) {
    try {
      const response = await fetch(
        `${GHL_API_BASE}/locations/${locationId}`,
        {
          headers: {
            'Authorization': `Bearer ${agency.accessToken}`,
            'Version': '2021-07-28',
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        const companyId = data.location?.companyId || data.companyId;
        
        if (companyId) {
          // Cache the result
          locationCompanyCache.set(locationId, companyId);
          console.log(`[GHL API] Location ${locationId} belongs to company ${companyId}`);
          return companyId;
        }
      }
    } catch (error) {
      console.error(`[GHL API] Error fetching location details with agency ${agency.accountId}:`, error);
      continue;
    }
  }
  
  console.log(`[GHL API] Could not determine company ID for location ${locationId}`);
  return null;
}

/**
 * Get OAuth token for API calls (agency or location-specific)
 * Automatically refreshes token if expired
 * Supports multi-agency deployments by looking up the correct agency token
 */
export async function getAuthToken(locationId: string): Promise<string | null> {
  // First, try location-specific token (takes precedence)
  let locationInstall = await getInstallation(locationId);
  if (locationInstall?.accessToken) {
    // Check if token is expired
    if (isTokenExpired(locationInstall)) {
      console.log(`[GHL API] Location token expired for ${locationId}, refreshing...`);
      const newToken = await refreshAccessToken(locationInstall);
      if (newToken) {
        return newToken;
      } else {
        console.error(`[GHL API] Failed to refresh location token for ${locationId}`);
        // Fall through to try agency token
      }
    } else {
      return locationInstall.accessToken;
    }
  }
  
  // Try to find the correct agency token based on location's company ID
  const companyId = await getLocationCompanyId(locationId);
  if (companyId) {
    const agencyInstall = await getAgencyInstallationByAccountId(companyId);
    if (agencyInstall?.accessToken) {
      // Check if token is expired
      if (isTokenExpired(agencyInstall)) {
        console.log(`[GHL API] Agency token expired for company ${companyId}, refreshing...`);
        const newToken = await refreshAccessToken(agencyInstall);
        if (newToken) {
          return newToken;
        } else {
          console.error(`[GHL API] Failed to refresh agency token for company ${companyId}`);
        }
      } else {
        return agencyInstall.accessToken;
      }
    }
  }
  
  // Fallback: Try any agency token (backward compatibility for single-agency deployments)
  let agencyInstall = await getAgencyInstallation();
  if (agencyInstall?.accessToken) {
    // Check if token is expired
    if (isTokenExpired(agencyInstall)) {
      console.log('[GHL API] Fallback agency token expired, refreshing...');
      const newToken = await refreshAccessToken(agencyInstall);
      if (newToken) {
        return newToken;
      } else {
        console.error('[GHL API] Failed to refresh fallback agency token');
      }
    } else {
      return agencyInstall.accessToken;
    }
  }
  
  return null;
}

/**
 * Check if a location has any domain configured
 * Returns true if at least 1 domain exists, false otherwise
 */
export async function checkLocationDomain(locationId: string): Promise<boolean> {
  const token = await getAuthToken(locationId);
  
  if (!token) {
    console.log('[GHL API] No auth token available for domain check - agency OAuth not completed');
    return false;
  }
  
  try {
    console.log(`[GHL API] Checking domain for location: ${locationId}`);
    
    const response = await fetch(
      `${GHL_API_BASE}/locations/${locationId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[GHL API] Failed to fetch location: ${response.status}`, errorText);
      
      if (response.status === 401) {
        console.error('[GHL API] Token is invalid or expired. Run agency OAuth again.');
      }
      
      return false;
    }
    
    const data = await response.json();
    
    // Simple boolean check: does location have any domain?
    const hasDomain = !!(
      data.location?.customDomain || 
      data.location?.domain ||
      data.customDomain ||
      data.domain
    );
    
    console.log(`[GHL API] Domain check for ${locationId}: ${hasDomain}`, 
      data.location?.customDomain || data.customDomain || 'no domain');
    return hasDomain;
    
  } catch (error) {
    console.error('[GHL API] Error checking domain:', error);
    return false;
  }
}

/**
 * Validate if OAuth token is still valid
 * Returns true if token works, false if expired/invalid
 */
export async function validateToken(locationId: string): Promise<boolean> {
  const token = await getAuthToken(locationId);
  
  if (!token) {
    return false;
  }
  
  try {
    // Make a simple API call to test token validity
    const response = await fetch(
      `${GHL_API_BASE}/locations/${locationId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Version': '2021-07-28'
        }
      }
    );
    
    // Token is valid if we don't get 401
    if (response.status === 401) {
      console.error('[GHL API] Token validation failed: 401 Unauthorized');
      return false;
    }
    
    return response.ok;
    
  } catch (error) {
    console.error('[GHL API] Error validating token:', error);
    return false;
  }
}

/**
 * Check if a location has any products/courses created
 * Returns true if at least 1 product exists, false otherwise
 */
export async function checkLocationProducts(locationId: string): Promise<boolean> {
  const token = await getAuthToken(locationId);
  
  if (!token) {
    console.log('[GHL API] No auth token available for products check');
    return false;
  }
  
  try {
    console.log(`[GHL API] Checking products for location: ${locationId}`);
    
    const response = await fetch(
      `${GHL_API_BASE}/products/?locationId=${locationId}&limit=1`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[GHL API] Failed to fetch products: ${response.status}`, errorText);
      return false;
    }
    
    const data = await response.json();
    
    // Log the full API response for debugging
    console.log(`[GHL API] Products API Response:`, JSON.stringify(data, null, 2));
    
    // Check if any products exist - ONLY check array length, not metadata
    // Metadata (total/count) might be present even when array is empty
    const productsArray = data.products || data.data || [];
    const arrayLength = Array.isArray(productsArray) ? productsArray.length : 0;
    const hasProducts = arrayLength > 0;
    
    console.log(`[GHL API] Products check for ${locationId}: ${hasProducts}`, 
      `(array length: ${arrayLength}, isArray: ${Array.isArray(productsArray)})`);
    
    if (hasProducts && productsArray.length > 0) {
      console.log(`[GHL API] First product:`, productsArray[0]);
    }
    
    return hasProducts;
    
  } catch (error) {
    console.error('[GHL API] Error checking products:', error);
    return false;
  }
}

/**
 * Check if a location has payment integration connected
 * Detects all GHL payment providers including:
 * - Stripe, PayPal, Authorize.net, NMI, Square
 * - Easy Pay Direct, Noomerik, Deposyt, PayTabs, PayMob
 * - Madison, Eway, MOYASAR, PayPlus, Cybersource
 * - Meps, GoCardless, Razorpay, Clover, Paystack
 * - Payfast, PagBank, linked2checkout, PPayOS, MontyPay
 * - AdminiPay, Coastal Pay, CWA, ECI EZPay, NGnair
 * - Sumit Payments, Dime Pay, Padlock Pay
 * - Manual Payment Methods (Cash on Delivery, Custom Payment Methods)
 * Returns true if any payment provider or manual payment method is connected
 */
export async function checkPaymentIntegration(locationId: string): Promise<boolean> {
  const token = await getAuthToken(locationId);
  
  if (!token) {
    console.log('[GHL API] No auth token available for payment check');
    return false;
  }
  
  try {
    console.log(`[GHL API] Checking payment integration for location: ${locationId}`);
    
    // Check for connected payment providers
    const response = await fetch(
      `${GHL_API_BASE}/locations/${locationId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      console.error(`[GHL API] Failed to fetch location for payment check: ${response.status}`);
      return false;
    }
    
    const data = await response.json();
    const location = data.location || data;
    
    // Log full location object to see available fields (only in development)
    if (process.env.NODE_ENV !== 'production') {
      console.log('[GHL API] Location object keys:', Object.keys(location));
    }
    
    // Check for any payment provider integration
    // Supports: Stripe, PayPal, Authorize.net, NMI, Square, 40+ other providers, and Manual Payment Methods
    const hasPayment = !!(
      // Generic payment fields
      location.paymentIntegration ||
      location.paymentProviders ||
      location.paymentProvider ||
      location.paymentGateway ||
      location.merchantAccount ||
      
      // Manual Payment Methods (Cash on Delivery, Custom Payment Methods)
      location.manualPaymentMethods ||
      location.customPaymentMethods ||
      location.manualPayment ||
      location.cashOnDelivery ||
      location.customPayment ||
      location.manualPaymentEnabled ||
      
      // Stripe
      location.stripeAccountId ||
      location.stripeConnected ||
      location.stripe ||
      
      // PayPal
      location.paypalAccountId ||
      location.paypalConnected ||
      location.paypal ||
      
      // Authorize.net
      location.authorizeNetAccountId ||
      location.authorizeNetConnected ||
      
      // NMI
      location.nmiAccountId ||
      location.nmiConnected ||
      
      // Square
      location.squareAccountId ||
      location.squareConnected ||
      location.square ||
      
      // Other providers (generic check)
      location.merchantId ||
      location.gatewayId ||
      location.processorId
    );
    
    // Log which specific fields were found
    if (hasPayment) {
      const foundFields = Object.keys(location).filter(key => 
        key.toLowerCase().includes('payment') ||
        key.toLowerCase().includes('stripe') ||
        key.toLowerCase().includes('paypal') ||
        key.toLowerCase().includes('merchant') ||
        key.toLowerCase().includes('gateway') ||
        key.toLowerCase().includes('processor') ||
        key.toLowerCase().includes('manual') ||
        key.toLowerCase().includes('cash') ||
        key.toLowerCase().includes('custom')
      );
      console.log(`[GHL API] Payment check for ${locationId}: TRUE - Fields found:`, foundFields);
    } else {
      console.log(`[GHL API] Payment check for ${locationId}: FALSE - No payment fields found`);
    }
    
    return hasPayment;
    
  } catch (error) {
    console.error('[GHL API] Error checking payment integration:', error);
    return false;
  }
}

/**
 * Check all onboarding statuses via GHL API
 * Can be extended to check courses, products, payments
 */
export async function checkAllOnboardingSteps(locationId: string): Promise<{
  domainConnected: boolean;
  courseCreated: boolean;
  paymentIntegrated: boolean;
}> {
  const token = await getAuthToken(locationId);
  
  if (!token) {
    return { 
      domainConnected: false,
      courseCreated: false,
      paymentIntegrated: false
    };
  }
  
  try {
    // Check all statuses in parallel for better performance
    const [domainConnected, courseCreated, paymentIntegrated] = await Promise.all([
      checkLocationDomain(locationId),
      checkLocationProducts(locationId),
      checkPaymentIntegration(locationId)
    ]);
    
    return { domainConnected, courseCreated, paymentIntegrated };
    
  } catch (error) {
    console.error('[GHL API] Error checking onboarding steps:', error);
    return { 
      domainConnected: false,
      courseCreated: false,
      paymentIntegrated: false
    };
  }
}


import HighLevel from '@gohighlevel/api-client';
import { getAgencyInstallation, getInstallation, getAgencyInstallationByAccountId, parseAgencyLocationId, getSubAccount, registerSubAccount } from './db';

// Cache location-to-company mapping
const locationCompanyCache = new Map<string, string>();

/**
 * Initialize HighLevel SDK client with proper OAuth token
 * Automatically selects the right token (location-specific or agency)
 * Supports multi-agency deployments
 */
export async function getSDKClient(locationId: string): Promise<HighLevel> {
  const clientId = process.env.GHL_CLIENT_ID;
  const clientSecret = process.env.GHL_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error('GHL_CLIENT_ID and GHL_CLIENT_SECRET must be set');
  }
  
  console.log(`[GHL SDK] Getting SDK client for locationId: ${locationId}`);
  
  // Check if this is an agency pattern (agency:{companyId})
  const agencyCompanyId = parseAgencyLocationId(locationId);
  if (agencyCompanyId) {
    console.log(`[GHL SDK] Detected agency pattern, companyId: ${agencyCompanyId}`);
    const installation = await getAgencyInstallationByAccountId(agencyCompanyId);
    if (installation?.accessToken) {
      console.log(`[GHL SDK] Using agency token for company: ${agencyCompanyId}`);
      return new HighLevel({
        clientId,
        clientSecret,
        agencyAccessToken: installation.accessToken
      });
    }
  }
  
  // First, try location-specific token
  let installation = await getInstallation(locationId);
  
  // If no location-specific token, try to find the correct agency token
  if (!installation?.accessToken) {
    console.log(`[GHL SDK] No location-specific token, looking up agency token for location: ${locationId}`);
    
    // Try to get company ID from cache or fetch it
    const companyId = await getLocationCompanyId(locationId);
    if (companyId) {
      console.log(`[GHL SDK] Found companyId: ${companyId}, fetching agency token`);
      installation = await getAgencyInstallationByAccountId(companyId);
    }
    
    // Fallback: Try any agency token (backward compatibility for single-agency deployments)
    if (!installation?.accessToken) {
      console.log(`[GHL SDK] No specific agency token found, trying fallback agency token`);
      installation = await getAgencyInstallation();
    }
  }
  
  if (!installation?.accessToken) {
    throw new Error('No OAuth token available - agency authorization required');
  }
  
  // Initialize SDK with OAuth token
  // Use locationAccessToken or agencyAccessToken based on token type
  const config: any = {
    clientId,
    clientSecret,
  };
  
  if (installation.tokenType === 'agency') {
    console.log(`[GHL SDK] Using agency token (accountId: ${installation.accountId})`);
    config.agencyAccessToken = installation.accessToken;
  } else {
    console.log(`[GHL SDK] Using location token (locationId: ${installation.locationId})`);
    config.locationAccessToken = installation.accessToken;
  }
  
  const ghl = new HighLevel(config);
  
  return ghl;
}

/**
 * Fetch location details to determine which company/agency owns it
 * Uses the single agency's token to look up the location
 * OPTIMIZED: Checks SubAccount table first, then uses agency token
 */
async function getLocationCompanyId(locationId: string): Promise<string | null> {
  // Check in-memory cache first
  if (locationCompanyCache.has(locationId)) {
    console.log(`[GHL SDK] Using cached companyId for location ${locationId}`);
    return locationCompanyCache.get(locationId)!;
  }
  
  console.log(`[GHL SDK] Looking up companyId for location: ${locationId}`);
  
  // OPTIMIZATION: Check SubAccount table for persisted mapping (fast database lookup)
  const subAccount = await getSubAccount(locationId);
  if (subAccount?.companyId) {
    console.log(`[GHL SDK] Found companyId in SubAccount table: ${subAccount.companyId} (fast path)`);
    locationCompanyCache.set(locationId, subAccount.companyId);
    return subAccount.companyId;
  }
  
  console.log(`[GHL SDK] No SubAccount mapping found, looking up with agency token`);
  
  // Get the agency installation (single-agency mode)
  const agency = await getAgencyInstallation();
  if (!agency?.accessToken) {
    console.log('[GHL SDK] No agency installation available');
    return null;
  }
  
  const clientId = process.env.GHL_CLIENT_ID;
  const clientSecret = process.env.GHL_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    console.log('[GHL SDK] Missing OAuth credentials');
    return null;
  }
  
  try {
    console.log(`[GHL SDK] Using agency token for accountId: ${agency.accountId}`);
    
    const ghl = new HighLevel({ 
      clientId, 
      clientSecret,
      agencyAccessToken: agency.accessToken
    });
    
    const response = await ghl.locations.getLocation({ locationId });
    
    if (response?.location?.companyId) {
      const companyId = response.location.companyId;
      const locationName = response.location.name;
      
      // Cache the result in memory
      locationCompanyCache.set(locationId, companyId);
      
      // Persist to SubAccount table for future fast lookups
      console.log(`[GHL SDK] Location ${locationId} belongs to company ${companyId}, persisting mapping`);
      await registerSubAccount({
        locationId,
        accountId: agency.accountId || companyId,
        locationName,
        companyId,
      });
      
      return companyId;
    } else {
      console.log(`[GHL SDK] No companyId in response`);
      return null;
    }
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    console.log(`[GHL SDK] Agency cannot access location ${locationId}: ${errorMsg}`);
    return null;
  }
}

/**
 * Search for a specific location by ID using direct lookup
 * More efficient than fetching all locations when looking for one
 * Uses getLocation API which directly fetches by ID
 * OPTIMIZED: Uses single agency token (single-agency mode)
 */
export async function searchLocationById(locationId: string): Promise<any | null> {
  try {
    console.log(`[GHL SDK] Searching for location by ID: ${locationId}`);
    
    const clientId = process.env.GHL_CLIENT_ID;
    const clientSecret = process.env.GHL_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      console.error('[GHL SDK] Missing GHL_CLIENT_ID or GHL_CLIENT_SECRET');
      return null;
    }
    
    // OPTIMIZATION: Check SubAccount table for cached location data
    const subAccount = await getSubAccount(locationId);
    if (subAccount) {
      console.log(`[GHL SDK] Found location in SubAccount table (cached), fetching fresh data`);
    }
    
    // Get the agency installation (single-agency mode)
    const agency = await getAgencyInstallation();
    if (!agency?.accessToken) {
      console.error('[GHL SDK] No agency installation available');
      return null;
    }
    
    try {
      console.log(`[GHL SDK] Using agency token for accountId: ${agency.accountId}`);
      
      const ghl = new HighLevel({
        clientId,
        clientSecret,
        agencyAccessToken: agency.accessToken
      });
      
      const response = await ghl.locations.getLocation({ locationId });
      
      if (response?.location && response.location.id === locationId) {
        console.log(`[GHL SDK] Found location: ${response.location.name}`);
        
        // Cache the company mapping in memory
        if (response.location.companyId) {
          locationCompanyCache.set(locationId, response.location.companyId);
        }
        
        // Persist to SubAccount table for future fast lookups
        const accountId = agency.accountId || response.location.companyId;
        if (accountId) {
          await registerSubAccount({
            locationId,
            accountId,
            locationName: response.location.name,
            companyId: response.location.companyId,
          });
        }
        
        return response.location;
      }
      
      console.log(`[GHL SDK] Location ${locationId} not found or not accessible`);
      return null;
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      console.log(`[GHL SDK] Agency cannot access location ${locationId}: ${errorMsg}`);
      return null;
    }
  } catch (error) {
    console.error('[GHL SDK] Error searching for location by ID:', error);
    return null;
  }
}

/**
 * Validate that a locationId belongs to the agency
 * Returns location details if valid, null otherwise
 * Uses direct ID lookup - most efficient, no need to fetch all locations
 */
export async function validateLocationId(locationId: string): Promise<{
  valid: boolean;
  location?: any;
  companyId?: string;
}> {
  try {
    // Use searchLocationById which does direct lookup with proper error handling
    const location = await searchLocationById(locationId);
    
    if (location) {
      return {
        valid: true,
        location: location,
        companyId: location.companyId
      };
    }
    
    return { valid: false };
  } catch (error) {
    console.error('[GHL SDK] Error validating locationId:', error);
    return { valid: false };
  }
}


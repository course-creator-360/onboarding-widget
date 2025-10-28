import HighLevel from '@gohighlevel/api-client';
import { getAgencyInstallation, getInstallation, getAgencyInstallationByAccountId, getAllAgencyInstallations, parseAgencyLocationId } from './db';

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
 * Uses SDK to query location information from any available agency token
 */
async function getLocationCompanyId(locationId: string): Promise<string | null> {
  // Check cache first
  if (locationCompanyCache.has(locationId)) {
    console.log(`[GHL SDK] Using cached companyId for location ${locationId}`);
    return locationCompanyCache.get(locationId)!;
  }
  
  console.log(`[GHL SDK] Looking up companyId for location: ${locationId}`);
  
  // Get all available agency tokens for the lookup
  const agencies = await getAllAgencyInstallations();
  if (agencies.length === 0) {
    console.log('[GHL SDK] No agency installations available for location lookup');
    return null;
  }
  
  console.log(`[GHL SDK] Found ${agencies.length} agency installation(s) to try`);
  
  // Try each agency token until we successfully fetch location details
  for (const agency of agencies) {
    try {
      const clientId = process.env.GHL_CLIENT_ID;
      const clientSecret = process.env.GHL_CLIENT_SECRET;
      
      if (!clientId || !clientSecret) continue;
      
      console.log(`[GHL SDK] Trying agency token for accountId: ${agency.accountId}`);
      
      const ghl = new HighLevel({ 
        clientId, 
        clientSecret,
        agencyAccessToken: agency.accessToken
      });
      
      const response = await ghl.locations.getLocation({ locationId });
      
      if (response?.location?.companyId) {
        const companyId = response.location.companyId;
        // Cache the result
        locationCompanyCache.set(locationId, companyId);
        console.log(`[GHL SDK] Location ${locationId} belongs to company ${companyId}`);
        return companyId;
      } else {
        console.log(`[GHL SDK] No companyId in response from agency ${agency.accountId}`);
      }
    } catch (error: any) {
      // Log error but continue to next agency
      const errorMsg = error?.message || String(error);
      console.log(`[GHL SDK] Agency ${agency.accountId} cannot access location ${locationId}: ${errorMsg}`);
      continue;
    }
  }
  
  console.log(`[GHL SDK] Could not determine company ID for location ${locationId} with any available agency token`);
  return null;
}

/**
 * Fetch all locations for an agency
 */
export async function getAgencyLocations(companyId?: string): Promise<any[]> {
  try {
    const clientId = process.env.GHL_CLIENT_ID;
    const clientSecret = process.env.GHL_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      throw new Error('GHL_CLIENT_ID and GHL_CLIENT_SECRET must be set');
    }
    
    // Get agency installation
    let installation;
    if (companyId) {
      installation = await getAgencyInstallationByAccountId(companyId);
    } else {
      installation = await getAgencyInstallation();
    }
    
    if (!installation?.accessToken) {
      throw new Error('No agency OAuth token available');
    }
    
    const ghl = new HighLevel({ 
      clientId, 
      clientSecret,
      agencyAccessToken: installation.accessToken
    });
    
    // Fetch all locations using the SDK
    const response = await ghl.locations.searchLocations({
      companyId: installation.accountId,
      limit: '100' // API expects string
    });
    
    return response.locations || [];
  } catch (error) {
    console.error('[GHL SDK] Error fetching agency locations:', error);
    return [];
  }
}

/**
 * Validate that a locationId belongs to the agency
 * Returns location details if valid, null otherwise
 */
export async function validateLocationId(locationId: string): Promise<{
  valid: boolean;
  location?: any;
  companyId?: string;
}> {
  try {
    // Try to get location details using SDK
    const ghl = await getSDKClient(locationId);
    const response = await ghl.locations.getLocation({ locationId });
    
    if (response?.location && response.location.id === locationId) {
      // Cache the company mapping
      if (response.location.companyId) {
        locationCompanyCache.set(locationId, response.location.companyId);
      }
      
      return {
        valid: true,
        location: response.location,
        companyId: response.location.companyId
      };
    }
    
    return { valid: false };
  } catch (error) {
    console.error('[GHL SDK] Error validating locationId:', error);
    
    // Try fallback: fetch all locations and check
    try {
      const locations = await getAgencyLocations();
      const foundLocation = locations.find(loc => loc.id === locationId);
      
      if (foundLocation) {
        // Cache the company mapping
        if (foundLocation.companyId) {
          locationCompanyCache.set(locationId, foundLocation.companyId);
        }
        
        return {
          valid: true,
          location: foundLocation,
          companyId: foundLocation.companyId
        };
      }
    } catch (fallbackError) {
      console.error('[GHL SDK] Fallback validation also failed:', fallbackError);
    }
    
    return { valid: false };
  }
}


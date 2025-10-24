import HighLevel from '@gohighlevel/api-client';
import { getAgencyInstallation, getInstallation, getAgencyInstallationByAccountId, getAllAgencyInstallations } from './db';

// Cache location-to-company mapping
const locationCompanyCache = new Map<string, string>();

/**
 * Initialize HighLevel SDK client with agency OAuth token
 * Automatically handles token refresh
 */
export async function getSDKClient(locationId: string): Promise<HighLevel> {
  const clientId = process.env.GHL_CLIENT_ID;
  const clientSecret = process.env.GHL_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error('GHL_CLIENT_ID and GHL_CLIENT_SECRET must be set');
  }
  
  // First, try location-specific token
  let installation = await getInstallation(locationId);
  
  // If no location-specific token, try to find the correct agency token
  if (!installation?.accessToken) {
    // Try to get company ID from cache or fetch it
    const companyId = await getLocationCompanyId(locationId);
    if (companyId) {
      installation = await getAgencyInstallationByAccountId(companyId);
    }
    
    // Fallback: Try any agency token
    if (!installation?.accessToken) {
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
    config.agencyAccessToken = installation.accessToken;
  } else {
    config.locationAccessToken = installation.accessToken;
  }
  
  const ghl = new HighLevel(config);
  
  return ghl;
}

/**
 * Fetch location details to determine which company/agency owns it
 */
async function getLocationCompanyId(locationId: string): Promise<string | null> {
  // Check cache first
  if (locationCompanyCache.has(locationId)) {
    return locationCompanyCache.get(locationId)!;
  }
  
  // Get any available agency token for the lookup
  const agencies = await getAllAgencyInstallations();
  if (agencies.length === 0) {
    console.log('[GHL SDK] No agency installations available for location lookup');
    return null;
  }
  
  // Try each agency token until we successfully fetch location details
  for (const agency of agencies) {
    try {
      const clientId = process.env.GHL_CLIENT_ID;
      const clientSecret = process.env.GHL_CLIENT_SECRET;
      
      if (!clientId || !clientSecret) continue;
      
      const ghl = new HighLevel({ 
        clientId, 
        clientSecret,
        agencyAccessToken: agency.accessToken
      });
      
      const location = await ghl.locations.getLocation({ locationId });
      
      if (location?.location?.companyId) {
        // Cache the result
        locationCompanyCache.set(locationId, location.location.companyId);
        console.log(`[GHL SDK] Location ${locationId} belongs to company ${location.location.companyId}`);
        return location.location.companyId;
      }
    } catch (error) {
      console.error(`[GHL SDK] Error fetching location details with agency ${agency.accountId}:`, error);
      continue;
    }
  }
  
  console.log(`[GHL SDK] Could not determine company ID for location ${locationId}`);
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


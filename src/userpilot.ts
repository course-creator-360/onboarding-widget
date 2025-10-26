type EventProps = Record<string, unknown> | undefined;

function getUserpilotKey(): string | undefined {
  const env = process.env.NODE_ENV ?? 'development';
  if (env === 'production') return process.env.USERPILOT_API_KEY;
  return process.env.USERPILOT_STAGE_API_KEY ?? process.env.USERPILOT_API_KEY;
}

/**
 * Track events to Userpilot (server-side via REST API)
 * Note: User identification should be done client-side using the browser SDK
 */
export async function sendUserpilotEvent(
  identifierType: 'locationId' | 'userId',
  identifier: string,
  eventName: string,
  properties?: EventProps
): Promise<void> {
  const token = getUserpilotKey();
  if (!token) return;
  
  const base = process.env.USERPILOT_API_BASE || 'https://api.userpilot.io';
  const body = {
    user: {
      id: identifier,
      attributes: { identifierType }
    },
    event: {
      name: eventName,
      properties: properties ?? {}
    }
  };
  
  try {
    await fetch(base.replace(/\/$/, '') + '/v1/track/event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });
  } catch (error) {
    console.error(`[Userpilot] Error tracking event ${eventName}:`, error);
  }
}




import { Router } from 'express';
import { cancelBooking } from '../db';
import { sseBroker } from '../sse';
import { getCC360AdminConfig } from '../cc360-admin';

const router = Router();

router.post('/booking/cancel', async (req, res) => {
  const { locationId } = req.body as { locationId?: string };
  
  if (!locationId) {
    return res.status(400).json({ error: 'locationId is required' });
  }
  
  const { apiKey, apiBaseUrl } = getCC360AdminConfig();
  
  try {
    console.log(`[Booking Cancel] Marking booking as cancelled for ${locationId}`);
    
    if (apiKey) {
      console.log(`[Booking Cancel] Sending bookingCancelled data to external API for ${locationId}`);
      
      const bookingPayload = {
        locationId: locationId,
        bookingCancelled: true
      };
      
      const externalApiResponse = await fetch(`${apiBaseUrl}/api/customers/survey`, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookingPayload)
      });
      
      if (!externalApiResponse.ok) {
        const errorText = await externalApiResponse.text();
        console.error(`[Booking Cancel] ❌ External API error: ${externalApiResponse.status} - ${errorText}`);
      } else {
        console.log(`[Booking Cancel] ✅ Booking cancelled data sent to external API successfully`);
      }
    } else {
      console.warn('[Booking Cancel] No API key configured, skipping external API sync');
    }
    
    const status = await cancelBooking(locationId);
    await sseBroker.broadcastStatus(locationId);
    console.log(`[Booking Cancel] Booking cancelled successfully for ${locationId}`);
    res.json(status);
  } catch (error) {
    console.error('[Booking Cancel] Error cancelling booking:', error);
    res.status(500).json({ 
      error: 'Failed to cancel booking',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/booking/check', async (req, res) => {
  const locationId = req.query.locationId as string;
  
  if (!locationId) {
    return res.status(400).json({ error: 'locationId is required' });
  }
  
  const { apiKey, apiBaseUrl } = getCC360AdminConfig();
  
  try {
    console.log(`[Booking Check] Checking booking data for ${locationId}`);
    
    if (!apiKey) {
      console.warn('[Booking Check] No API key configured, returning no data');
      return res.json({ hasBookingData: false, bookingData: null });
    }
    
    const response = await fetch(`${apiBaseUrl}/api/customers/booking?locationId=${locationId}`, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Booking Check] ❌ External API error: ${response.status} - ${errorText}`);
      return res.json({ hasBookingData: false, bookingData: null });
    }
    
    const bookingData = await response.json();
    console.log(`[Booking Check] ✅ Booking data received:`, bookingData);
    
    const hasBookingData = bookingData && Object.keys(bookingData).length > 0 && bookingData.data !== null && bookingData.data !== undefined;
    
    res.json({ hasBookingData, bookingData });
  } catch (error) {
    console.error('[Booking Check] Error checking booking data:', error);
    res.json({ hasBookingData: false, bookingData: null, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// ---------------------------------------------------------------------------
// Calendar proxy routes – forward to cc360-customers-admin calendar endpoints
// ---------------------------------------------------------------------------

router.get('/booking/calendars', async (_req, res) => {
  const { apiKey, apiBaseUrl } = getCC360AdminConfig();

  if (!apiKey) {
    return res.status(503).json({ error: 'Calendar service not configured' });
  }

  try {
    const response = await fetch(`${apiBaseUrl}/api/calendars/free-slots`, {
      headers: { 'x-api-key': apiKey }
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[Booking Calendars] ❌ ${response.status}: ${text}`);
      return res.status(response.status).json({ error: 'Failed to fetch calendars' });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('[Booking Calendars] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/booking/slots', async (req, res) => {
  const { calendarId, startDate, endDate, timezone } = req.query as Record<string, string>;

  if (!calendarId || !startDate || !endDate) {
    return res.status(400).json({ error: 'calendarId, startDate and endDate are required' });
  }

  const { apiKey, apiBaseUrl } = getCC360AdminConfig();

  if (!apiKey) {
    return res.status(503).json({ error: 'Calendar service not configured' });
  }

  try {
    const qs = new URLSearchParams({ calendarId, startDate, endDate });
    if (timezone) qs.set('timezone', timezone);

    const response = await fetch(`${apiBaseUrl}/api/calendars/free-slots?${qs}`, {
      headers: { 'x-api-key': apiKey }
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[Booking Slots] ❌ ${response.status}: ${text}`);
      return res.status(response.status).json({ error: 'Failed to fetch slots' });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('[Booking Slots] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/booking/book', async (req, res) => {
  const { calendarId, contactId, selectedSlot, selectedTimezone, title, notes, locationId } = req.body;

  if (!calendarId || !selectedSlot) {
    return res.status(400).json({ error: 'calendarId and selectedSlot are required' });
  }

  const { apiKey, apiBaseUrl } = getCC360AdminConfig();

  if (!apiKey) {
    return res.status(503).json({ error: 'Calendar service not configured' });
  }

  try {
    console.log(`[Booking Book] Booking slot ${selectedSlot} on calendar ${calendarId}`);

    const response = await fetch(`${apiBaseUrl}/api/calendars/book`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ calendarId, contactId, selectedSlot, selectedTimezone, title, notes, locationId })
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[Booking Book] ❌ ${response.status}: ${text}`);
      return res.status(response.status).json({ error: 'Failed to book appointment', details: text });
    }

    const data = await response.json();
    console.log(`[Booking Book] ✅ Appointment booked`);

    if (locationId) {
      try {
        const surveyPayload = { locationId, bookingCompleted: true };
        await fetch(`${apiBaseUrl}/api/customers/survey`, {
          method: 'POST',
          headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify(surveyPayload)
        });
      } catch (syncErr) {
        console.error('[Booking Book] Failed to sync booking status:', syncErr);
      }
    }

    res.json(data);
  } catch (error) {
    console.error('[Booking Book] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

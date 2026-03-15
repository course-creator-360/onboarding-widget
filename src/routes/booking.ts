import { Router } from 'express';
import { cancelBooking } from '../db';
import { sseBroker } from '../sse';
import { getCC360AdminConfig } from '../cc360-admin';

const router = Router();

// Onboarding calendar: internal reps 9–5 MT; Extendly overflow + after-hours (Notion ticket: Extendly overflow routing)
const ONBOARDING_PRIMARY_CALENDAR_ID = process.env.ONBOARDING_PRIMARY_CALENDAR_ID || 'k0yrAymNvet7hUvzBxTh';
const ONBOARDING_EXTENDLY_CALENDAR_ID = process.env.ONBOARDING_EXTENDLY_CALENDAR_ID || '';
const BUSINESS_HOURS_MT = { start: 9, end: 17 }; // 9 AM - 5 PM Mountain

function isSlotInBusinessHoursMT(isoSlot: string): boolean {
  const d = new Date(isoSlot);
  const mtStr = d.toLocaleString('en-US', { hour: '2-digit', hour12: false, timeZone: 'America/Denver' });
  const mt = parseInt(mtStr, 10);
  return mt >= BUSINESS_HOURS_MT.start && mt < BUSINESS_HOURS_MT.end;
}

function parseSlotsByDate(data: { slots?: Record<string, string[]> }): Record<string, string[]> {
  const raw = data.slots ?? (data as unknown as Record<string, string[]>);
  if (typeof raw !== 'object') return {};
  return raw;
}

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
    
    const hasBookingData = !!(bookingData?.bookingData && Object.keys(bookingData.bookingData).length > 0);
    
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
  const { calendarId, startDate, endDate, timezone, overflow } = req.query as Record<string, string>;

  if (!calendarId || !startDate || !endDate) {
    return res.status(400).json({ error: 'calendarId, startDate and endDate are required' });
  }

  const { apiKey, apiBaseUrl } = getCC360AdminConfig();

  if (!apiKey) {
    return res.status(503).json({ error: 'Calendar service not configured' });
  }

  const useOverflow = overflow === '1' || overflow === 'true';
  const isOnboardingPrimary = calendarId === ONBOARDING_PRIMARY_CALENDAR_ID;
  if (useOverflow && isOnboardingPrimary && ONBOARDING_EXTENDLY_CALENDAR_ID) {
    return handleSlotsWithOverflow(req, res, { startDate, endDate, timezone });
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

async function handleSlotsWithOverflow(
  req: import('express').Request,
  res: import('express').Response,
  params: { startDate: string; endDate: string; timezone?: string }
) {
  const { apiKey, apiBaseUrl } = getCC360AdminConfig();
  const { startDate, endDate, timezone } = params;

  try {
    const qsBase = new URLSearchParams({ startDate, endDate });
    if (timezone) qsBase.set('timezone', timezone);

    const [primaryRes, extendlyRes] = await Promise.all([
      fetch(`${apiBaseUrl}/api/calendars/free-slots?${new URLSearchParams({ ...Object.fromEntries(qsBase), calendarId: ONBOARDING_PRIMARY_CALENDAR_ID })}`, {
        headers: { 'x-api-key': apiKey! }
      }),
      fetch(`${apiBaseUrl}/api/calendars/free-slots?${new URLSearchParams({ ...Object.fromEntries(qsBase), calendarId: ONBOARDING_EXTENDLY_CALENDAR_ID })}`, {
        headers: { 'x-api-key': apiKey! }
      })
    ]);

    if (!primaryRes.ok) {
      const text = await primaryRes.text();
      console.error(`[Booking Slots Overflow] Primary ❌ ${primaryRes.status}: ${text}`);
      return res.status(primaryRes.status).json({ error: 'Failed to fetch primary slots' });
    }
    if (!extendlyRes.ok) {
      const text = await extendlyRes.text();
      console.error(`[Booking Slots Overflow] Extendly ❌ ${extendlyRes.status}: ${text}`);
      return res.status(extendlyRes.status).json({ error: 'Failed to fetch overflow slots' });
    }

    const primaryByDate = parseSlotsByDate(await primaryRes.json());
    const extendlyByDate = parseSlotsByDate(await extendlyRes.json());

    const merged: Record<string, Array<{ iso: string; calendarId: string; source: 'internal' | 'extendly' }>> = {};
    const allDates = new Set([...Object.keys(primaryByDate), ...Object.keys(extendlyByDate)]);

    for (const dateStr of Array.from(allDates).sort()) {
      const primarySlots = primaryByDate[dateStr] ?? [];
      const extendlySlots = extendlyByDate[dateStr] ?? [];
      const internal: Array<{ iso: string; calendarId: string; source: 'internal' | 'extendly' }> = [];
      const extendlyAfterHours: Array<{ iso: string; calendarId: string; source: 'internal' | 'extendly' }> = [];
      const extendlyInBusinessHours: Array<{ iso: string; calendarId: string; source: 'internal' | 'extendly' }> = [];

      for (const iso of primarySlots) {
        if (isSlotInBusinessHoursMT(iso)) {
          internal.push({ iso, calendarId: ONBOARDING_PRIMARY_CALENDAR_ID, source: 'internal' });
        }
      }
      for (const iso of extendlySlots) {
        if (isSlotInBusinessHoursMT(iso)) {
          extendlyInBusinessHours.push({ iso, calendarId: ONBOARDING_EXTENDLY_CALENDAR_ID, source: 'extendly' });
        } else {
          extendlyAfterHours.push({ iso, calendarId: ONBOARDING_EXTENDLY_CALENDAR_ID, source: 'extendly' });
        }
      }

      merged[dateStr] = [
        ...internal,
        ...extendlyAfterHours,
        ...(internal.length === 0 ? extendlyInBusinessHours : [])
      ].sort((a, b) => a.iso.localeCompare(b.iso));
    }

    const slotsForWidget: Record<string, string[]> = {};
    const slotMeta: Record<string, Array<{ calendarId: string; source: 'internal' | 'extendly' }>> = {};
    for (const [dateStr, arr] of Object.entries(merged)) {
      slotsForWidget[dateStr] = arr.map(s => s.iso);
      slotMeta[dateStr] = arr.map(s => ({ calendarId: s.calendarId, source: s.source }));
    }

    res.json({ slots: slotsForWidget, slotMeta });
  } catch (error) {
    console.error('[Booking Slots Overflow] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

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
        const bookingPayload = {
          locationId,
          bookingData: {
            appointmentId: data.appointment?.id ?? null,
            calendarId,
            selectedSlot,
            selectedTimezone,
            title: title || 'CC360 Onboarding Call',
            bookedAt: new Date().toISOString(),
          }
        };
        await fetch(`${apiBaseUrl}/api/customers/booking`, {
          method: 'POST',
          headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify(bookingPayload)
        });
        console.log(`[Booking Book] ✅ Booking data synced to admin for ${locationId}`);
      } catch (syncErr) {
        console.error('[Booking Book] Failed to sync booking data:', syncErr);
      }
    }

    res.json(data);
  } catch (error) {
    console.error('[Booking Book] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

import { Router } from 'express';
import { cancelBooking } from '../db';
import { sseBroker } from '../sse';

const router = Router();

router.post('/booking/cancel', async (req, res) => {
  const { locationId } = req.body as { locationId?: string };
  
  if (!locationId) {
    return res.status(400).json({ error: 'locationId is required' });
  }
  
  const apiKey = process.env.CC360_CUSTOMERS_ADMIN_API_KEY || process.env.CC360_CUSTOMERS_API_KEY;
  const apiBaseUrl = process.env.CC360_CUSTOMERS_ADMIN_API_BASE_URL || 'https://cc360-customers-admin.vercel.app';
  
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
  
  const apiKey = process.env.CC360_CUSTOMERS_ADMIN_API_KEY || process.env.CC360_CUSTOMERS_API_KEY;
  const apiBaseUrl = process.env.CC360_CUSTOMERS_ADMIN_API_BASE_URL || 'https://cc360-customers-admin.vercel.app';
  
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

export default router;

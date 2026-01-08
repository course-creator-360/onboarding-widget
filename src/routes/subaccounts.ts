import { Router } from 'express';
import { getSubAccount, getSubAccountsByAgency, getAllSubAccounts, getSubAccountStats, deactivateSubAccount, getAgencyForLocation, getAgencyInstallation } from '../db';

const router = Router();

router.get('/sub-accounts', async (req, res) => {
  try {
    const accountId = req.query.accountId as string | undefined;
    
    if (accountId) {
      const subAccounts = await getSubAccountsByAgency(accountId);
      return res.json({
        success: true,
        count: subAccounts.length,
        subAccounts
      });
    } else {
      const subAccounts = await getAllSubAccounts();
      return res.json({
        success: true,
        count: subAccounts.length,
        subAccounts
      });
    }
  } catch (error) {
    console.error('[API] Error fetching sub-accounts:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch sub-accounts',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/sub-accounts/verify/:locationId', async (req, res) => {
  try {
    const locationId = req.params.locationId;
    if (!locationId) {
      return res.status(400).json({ error: 'locationId is required' });
    }
    
    const agencyAccountId = await getAgencyForLocation(locationId);
    
    if (!agencyAccountId) {
      return res.json({
        success: true,
        isUnderAgency: false,
        locationId,
        message: 'Location is not registered under any agency'
      });
    }
    
    const subAccount = await getSubAccount(locationId);
    
    const agencyInstallation = await getAgencyInstallation();
    
    return res.json({
      success: true,
      isUnderAgency: true,
      locationId,
      agencyAccountId,
      isActive: subAccount?.isActive,
      locationName: subAccount?.locationName,
      firstAccessedAt: subAccount?.firstAccessedAt,
      lastAccessedAt: subAccount?.lastAccessedAt,
      agencyAuthorized: agencyInstallation?.accountId === agencyAccountId
    });
  } catch (error) {
    console.error('[API] Error verifying sub-account:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to verify sub-account',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/sub-accounts/:locationId', async (req, res) => {
  try {
    const locationId = req.params.locationId;
    if (!locationId) {
      return res.status(400).json({ error: 'locationId is required' });
    }
    
    const subAccount = await getSubAccount(locationId);
    
    if (!subAccount) {
      return res.status(404).json({
        success: false,
        error: 'Sub-account not found'
      });
    }
    
    return res.json({
      success: true,
      subAccount
    });
  } catch (error) {
    console.error('[API] Error fetching sub-account:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch sub-account',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/sub-accounts/stats/:accountId', async (req, res) => {
  try {
    const accountId = req.params.accountId;
    if (!accountId) {
      return res.status(400).json({ error: 'accountId is required' });
    }
    
    const stats = await getSubAccountStats(accountId);
    
    return res.json({
      success: true,
      accountId,
      stats
    });
  } catch (error) {
    console.error('[API] Error fetching sub-account stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch sub-account stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/sub-accounts/:locationId/deactivate', async (req, res) => {
  try {
    const locationId = req.params.locationId;
    if (!locationId) {
      return res.status(400).json({ error: 'locationId is required' });
    }
    
    const subAccount = await deactivateSubAccount(locationId);
    
    if (!subAccount) {
      return res.status(404).json({
        success: false,
        error: 'Sub-account not found'
      });
    }
    
    return res.json({
      success: true,
      message: 'Sub-account deactivated successfully',
      subAccount
    });
  } catch (error) {
    console.error('[API] Error deactivating sub-account:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to deactivate sub-account',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;

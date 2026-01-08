import { Router } from 'express';
import { hasAgencyAuthorization, getAgencyInstallation } from '../db';

const router = Router();

router.get('/agency/status', async (req, res) => {
  const hasAgency = await hasAgencyAuthorization();
  const agencyInstallation = await getAgencyInstallation();
  
  return res.json({
    authorized: hasAgency,
    installation: agencyInstallation ? {
      accountId: agencyInstallation.accountId,
      expiresAt: agencyInstallation.expiresAt,
      createdAt: agencyInstallation.createdAt
    } : null
  });
});

export default router;

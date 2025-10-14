import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import oauthRouter from './oauth';
import webhookRouter from './webhooks';
import { getOnboardingStatus, setDismissed, updateOnboardingStatus } from './db';
import { sseBroker } from './sse';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Mount routers under /api for serverless compatibility
app.use('/api/oauth', oauthRouter);
app.use('/api/webhooks', webhookRouter);

app.get('/api/healthz', (_req, res) => res.json({ ok: true }));

app.get('/api/status', (req, res) => {
  const locationId = (req.query.locationId as string) || '';
  if (!locationId) return res.status(400).json({ error: 'locationId is required' });
  return res.json(getOnboardingStatus(locationId));
});

app.post('/api/dismiss', (req, res) => {
  const { locationId } = req.body as { locationId?: string };
  if (!locationId) return res.status(400).json({ error: 'locationId is required' });
  const status = setDismissed(locationId, true);
  sseBroker.broadcastStatus(locationId);
  res.json(status);
});

app.post('/api/mock/set', (req, res) => {
  const { locationId, updates } = req.body as { locationId?: string; updates?: Record<string, unknown> };
  if (!locationId) return res.status(400).json({ error: 'locationId is required' });
  const status = updateOnboardingStatus(locationId, {
    domainConnected: updates?.domainConnected as boolean | undefined,
    courseCreated: updates?.courseCreated as boolean | undefined,
    productAttached: updates?.productAttached as boolean | undefined,
    paymentIntegrated: updates?.paymentIntegrated as boolean | undefined,
    dismissed: updates?.dismissed as boolean | undefined
  });
  sseBroker.broadcastStatus(locationId);
  res.json(status);
});

app.get('/api/events', (req, res) => {
  const locationId = (req.query.locationId as string) || '';
  if (!locationId) return res.status(400).end();
  sseBroker.addClient(locationId, res);
  sseBroker.broadcastStatus(locationId);
});

app.use('/public', express.static(path.join(process.cwd(), 'public')));
app.get('/widget.js', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'widget.js'));
});

export default app;



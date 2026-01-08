import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import oauthRouter from './oauth';
import webhookRouter from './webhooks';
import {
  configRouter,
  statusRouter,
  locationRouter,
  installationRouter,
  agencyRouter,
  bookingRouter,
  surveyRouter,
  subaccountsRouter
} from './routes';

const app = express();

const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    if (!origin) return callback(null, true);
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.use('/api/oauth', oauthRouter);
app.use('/api/webhooks', webhookRouter);

app.use('/oauth', oauthRouter);
app.use('/install', oauthRouter);

app.use('/api', configRouter);
app.use('/api', statusRouter);
app.use('/api', locationRouter);
app.use('/api', installationRouter);
app.use('/api', agencyRouter);
app.use('/api', bookingRouter);
app.use('/api', surveyRouter);
app.use('/api', subaccountsRouter);

app.use((req, res, next) => {
  const host = req.get('host') || '';
  const preferredDomain = process.env.PREFERRED_DOMAIN;
  
  if (preferredDomain && !host.includes(preferredDomain)) {
    const protocol = req.secure || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const redirectUrl = `${protocol}://${preferredDomain}${req.originalUrl}`;
    console.log(`[Redirect] ${host} → ${preferredDomain}`);
    return res.redirect(301, redirectUrl);
  }
  
  next();
});

app.use('/public', express.static(path.join(process.cwd(), 'public')));
app.get('/widget.js', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'widget.js'));
});
app.get('/widget-styles.js', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'widget-styles.js'));
});
app.get('/widget-analytics.js', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'widget-analytics.js'));
});
app.get('/widget-ui.js', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'widget-ui.js'));
});
app.get('/widget-core.js', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'widget-core.js'));
});

app.get('/', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

export default app;

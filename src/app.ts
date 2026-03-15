import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import oauthRouter from './oauth';
import webhookRouter from './webhooks';
import { getBaseUrl, isProduction } from './config';
import initRouter from './routes/init';
import {
  configRouter,
  statusRouter,
  locationRouter,
  installationRouter,
  agencyRouter,
  bookingRouter,
  surveyRouter,
  subaccountsRouter,
  sessionsRouter
} from './routes';

const app = express();

// Widget is embedded on dynamic GHL customer domains, so CORS must be permissive
// by default. Set CORS_ALLOWED_ORIGINS to restrict to specific origins if needed.
function getAllowedOrigins(): string[] | null {
  if (process.env.CORS_ALLOWED_ORIGINS) {
    return process.env.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim());
  }
  return null;
}

const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    if (!origin) return callback(null, true);
    const allowed = getAllowedOrigins();
    if (!allowed) return callback(null, true);
    if (allowed.includes(origin) || allowed.includes('*')) {
      return callback(null, true);
    }
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '4mb' }));
app.use(cookieParser());

app.use('/api/oauth', oauthRouter);
app.use('/api/webhooks', webhookRouter);

app.use('/oauth', oauthRouter);
app.use('/install', oauthRouter);

app.use('/api', initRouter);
app.use('/api', configRouter);
app.use('/api', statusRouter);
app.use('/api', locationRouter);
app.use('/api', installationRouter);
app.use('/api', agencyRouter);
app.use('/api', bookingRouter);
app.use('/api', surveyRouter);
app.use('/api', subaccountsRouter);
app.use('/api', sessionsRouter);

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

const widgetFiles = ['widget.js', 'widget-styles.js', 'widget-analytics.js', 'widget-ui.js', 'widget-core.js', 'widget-bundle.js'];
for (const file of widgetFiles) {
  app.get(`/${file}`, (_req, res) => {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.sendFile(path.join(process.cwd(), 'public', file));
  });
}

app.get('/', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

export default app;

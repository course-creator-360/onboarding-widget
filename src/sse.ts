import { Response } from 'express';
import { getOnboardingStatus } from './db';

type Client = { res: Response };

class SSEBroker {
  private locationIdToClients = new Map<string, Set<Client>>();

  addClient(locationId: string, res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const clients = this.locationIdToClients.get(locationId) ?? new Set<Client>();
    clients.add({ res });
    this.locationIdToClients.set(locationId, clients);

    const heartbeat = setInterval(() => {
      try {
        res.write(`event: ping\n`);
        res.write(`data: {"ts": ${Date.now()}}\n\n`);
      } catch {}
    }, 25000);

    res.on('close', () => {
      clearInterval(heartbeat);
      const current = this.locationIdToClients.get(locationId);
      if (!current) return;
      for (const client of current) {
        if (client.res === res) current.delete(client);
      }
      if (current.size === 0) this.locationIdToClients.delete(locationId);
    });
  }

  broadcastStatus(locationId: string): void {
    const clients = this.locationIdToClients.get(locationId);
    if (!clients || clients.size === 0) return;
    const status = getOnboardingStatus(locationId);
    const payload = JSON.stringify({ type: 'status', payload: status });
    for (const client of clients) {
      try {
        client.res.write(`event: message\n`);
        client.res.write(`data: ${payload}\n\n`);
      } catch {}
    }
  }
}

export const sseBroker = new SSEBroker();




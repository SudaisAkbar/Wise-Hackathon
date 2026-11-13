import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { projectRoot } from './config.js';
import { api } from './routes/api.js';
import { PaymentError } from './payments/provider.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '50kb' }));

  app.use('/api', api);
  app.use('/api', (req, res) => {
    res.status(404).json({ error: { code: 'not_found', message: 'No such endpoint.' } });
  });

  // Serve the built interface, so one command runs the whole demo.
  const dist = path.join(projectRoot, 'client', 'dist');
  const indexFile = path.join(dist, 'index.html');
  if (fs.existsSync(indexFile)) {
    app.use(express.static(dist));
    app.use((req, res, next) => (req.method === 'GET' ? res.sendFile(indexFile) : next()));
  } else {
    app.get('/', (req, res) => {
      res.type('text/plain').send('The interface is not built yet. Run "npm run build" in the project folder, then restart.');
    });
  }

  // One place where every error becomes a clear JSON answer.
  // eslint-disable-next-line no-unused-vars
  app.use((error, req, res, next) => {
    if (error instanceof PaymentError) {
      return res.status(error.status).json({ error: { code: error.code, message: error.message, ...error.extra } });
    }
    if (error?.type === 'entity.parse.failed') {
      return res.status(400).json({ error: { code: 'bad_json', message: 'The request body is not valid JSON.' } });
    }
    console.error('[server] unexpected error', error);
    return res.status(500).json({ error: { code: 'server_error', message: 'Something went wrong on the server.' } });
  });

  return app;
}

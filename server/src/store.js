// In-memory state for the demo. Restarting the server (or POST /api/demo/reset)
// brings everything back to the seed data.
import { createSeed } from './data/seed.js';
import { config } from './config.js';

let counter = 2000;
export const nextId = (prefix) => `${prefix}-${++counter}`;

function fresh() {
  return {
    ...createSeed(),
    quotes: new Map(),
    sessions: new Map(),
    helperRequests: [],
    settings: { voiceLimit: config.voiceLimitEur }
  };
}

export const store = fresh();

export function resetStore() {
  const next = fresh();
  for (const key of Object.keys(store)) delete store[key];
  Object.assign(store, next);
}

export function findRecipient(id) {
  return store.recipients.find((recipient) => recipient.id === id) || null;
}

export function addAlert(type, title, detail = '') {
  const alert = { id: nextId('al'), type, title, detail, createdAt: new Date().toISOString() };
  store.alerts.unshift(alert);
  return alert;
}

// Recipient shape that is safe and small enough to send to the browser.
export function publicRecipient(recipient) {
  if (!recipient) return null;
  const { match, ...rest } = recipient;
  return rest;
}

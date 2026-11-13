import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));
export const serverRoot = path.resolve(here, '..');
export const projectRoot = path.resolve(serverRoot, '..');

// One .env at the project root is enough; server/.env also works.
dotenv.config({
  path: [path.join(projectRoot, '.env'), path.join(serverRoot, '.env')],
  quiet: true
});

const number = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const config = {
  appName: 'Ask Wise (prototype)',
  port: number(process.env.PORT, 3000),

  // Assistant brain. Without a key the built-in rule parser is used.
  anthropicApiKey: (process.env.ANTHROPIC_API_KEY || '').trim(),
  claudeModel: (process.env.CLAUDE_MODEL || 'claude-haiku-5-5').trim(),
  claudeTimeoutMs: number(process.env.CLAUDE_TIMEOUT_MS, 6000),

  // Wise Help Centre answers. Articles are fetched live from this address.
  helpBaseUrl: (process.env.WISE_HELP_BASE_URL || 'https://wise.com').trim(),
  helpLiveFetch: (process.env.HELP_LIVE_FETCH || 'true').trim() !== 'false',
  helpTimeoutMs: number(process.env.HELP_TIMEOUT_MS, 5000),

  // Voice match: a spoken request must sound like the enrolled owner.
  voiceprintFile: (process.env.VOICEPRINT_FILE || '').trim(),
  voiceTokenTtlMs: number(process.env.VOICE_TOKEN_TTL_MS, 120000),

  // Demo safety settings.
  demoPin: (process.env.DEMO_PIN || '1234').trim(),
  voiceLimitEur: number(process.env.VOICE_LIMIT_EUR, 300),
  maxPinAttempts: 3,
  arrivalDelayMs: number(process.env.ARRIVAL_DELAY_MS, 4000)
};

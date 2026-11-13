// Picks the understanding engine: Claude when a key is set, the built-in rules
// otherwise, and the rules again if Claude is slow or unreachable.
import { config } from '../../config.js';
import { understandWithRules } from './rules.js';
import { isClaudeConfigured, understandWithClaude } from './claude.js';

let lastFailure = null;

export function engineStatus() {
  return {
    engine: isClaudeConfigured() ? 'claude' : 'rules',
    model: isClaudeConfigured() ? config.claudeModel : null,
    lastFailure
  };
}

export async function understand(text, context, { claude = understandWithClaude } = {}) {
  if (isClaudeConfigured()) {
    try {
      const result = await claude(text, context);
      lastFailure = null;
      return result;
    } catch (error) {
      lastFailure = { at: new Date().toISOString(), message: String(error?.message || error).slice(0, 200) };
      console.warn(`[assistant] Claude unavailable, using built-in rules: ${lastFailure.message}`);
      return { ...understandWithRules(text, context), engine: 'rules-fallback' };
    }
  }
  return understandWithRules(text, context);
}

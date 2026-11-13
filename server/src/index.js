import { config } from './config.js';
import { createApp } from './app.js';
import { engineStatus } from './assistant/nlu/index.js';

const app = createApp();

app.listen(config.port, () => {
  const ai = engineStatus();
  const brain = ai.engine === 'claude' ? `Claude (${ai.model})` : 'built-in rules (add ANTHROPIC_API_KEY to .env to use Claude)';
  console.log('');
  console.log(`  ${config.appName} is running. Demo data only, no real money.`);
  console.log(`  Open        http://localhost:${config.port}   (Chrome or Edge, for the microphone)`);
  console.log(`  Assistant   ${brain}`);
  console.log(`  Demo PIN    ${config.demoPin}`);
  console.log('');
});

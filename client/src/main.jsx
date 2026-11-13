import React from 'react';
import { createRoot } from 'react-dom/client';

// Fonts from the design: Inter for text, Archivo (condensed, black) for the big
// headlines. Oswald covers Cyrillic headlines; Noto covers Urdu and Hindi.
import '@fontsource-variable/inter';
import '@fontsource-variable/archivo/standard.css';
import '@fontsource-variable/oswald';
import '@fontsource/noto-nastaliq-urdu/400.css';
import '@fontsource/noto-nastaliq-urdu/700.css';
import '@fontsource/noto-sans-devanagari/400.css';
import '@fontsource/noto-sans-devanagari/700.css';
import './styles.css';

import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

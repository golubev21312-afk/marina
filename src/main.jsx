import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { installErrorReporter } from './lib/errors';
import './styles/tokens.css';
import './styles/malachite.css';
import './styles/decor.css';

installErrorReporter();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

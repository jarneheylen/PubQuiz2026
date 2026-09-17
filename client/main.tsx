import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { QuizProvider } from './state/QuizProvider';

import './styles/theme.css';
import './styles/ui.css';
import './styles/wheel.css';
import './styles/screens.css';

const container = document.getElementById('root');
if (!container) throw new Error('Geen #root element gevonden in index.html');

createRoot(container).render(
  <StrictMode>
    <QuizProvider>
      <App />
    </QuizProvider>
  </StrictMode>,
);

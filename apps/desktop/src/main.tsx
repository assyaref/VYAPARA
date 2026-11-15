import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/inter';
import App from './App';

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(React.createElement(App));
}
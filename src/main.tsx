import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/rotas';
import { pedirArmazenamentoPersistente } from './ui/armazenamento';
import './ui/tema.css';
import './ui/layout.css';

void pedirArmazenamentoPersistente();

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('Elemento #raiz não encontrado');

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

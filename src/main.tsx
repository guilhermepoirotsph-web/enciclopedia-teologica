import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ProvedorSessao } from './dados/sessao';
import './estilo.css';
import './partes.css';
import './telas.css';

// Marca que o JS subiu. O CSS usa .sem-js para garantir que nada dependa de
// animação para ser legível — se este arquivo nunca rodar, o site ainda lê.
document.documentElement.classList.remove('sem-js');

createRoot(document.getElementById('raiz')!).render(
  <StrictMode>
    <BrowserRouter>
      <ProvedorSessao>
        <App />
      </ProvedorSessao>
    </BrowserRouter>
  </StrictMode>
);

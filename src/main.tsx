import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ProvedorSessao } from './dados/sessao';
import { carregarConfig } from './dados/configuracao';
import { lerConfigPublica } from './dados/fonte';
import './estilo.css';
import './partes.css';
import './telas.css';
import './radio.css';

// Marca que o JS subiu. O CSS usa .sem-js para garantir que nada dependa de
// animação para ser legível — se este arquivo nunca rodar, o site ainda lê.
document.documentElement.classList.remove('sem-js');

function montar() {
  createRoot(document.getElementById('raiz')!).render(
    <StrictMode>
      {/* basename acompanha o `base` do Vite: no domínio próprio é '/', no
          GitHub Pages sem domínio é '/repo/'. Sem isso, publicar em subpasta
          faz todo link interno apontar para a raiz do domínio e o site vira
          uma sequência de 404. */}
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <ProvedorSessao>
          <App />
        </ProvedorSessao>
      </BrowserRouter>
    </StrictMode>
  );
}

/**
 * A configuração entra ANTES da primeira renderização.
 *
 * É o que faz o painel valer: WhatsApp, Pix e trilha sonora cadastrados pelo
 * autor chegam às páginas sem precisar de contexto nem de re-render. Já vem com
 * teto de tempo e cache no navegador lá dentro.
 *
 * Nada aqui usa `await` de nível superior de propósito: o esbuild recusa gerar
 * o pacote de entrada quando ele é assíncrono, e o build quebra inteiro.
 *
 * E o `catch` não é enfeite — se a configuração falhar por qualquer motivo, o
 * site sobe com os padrões. Configuração nunca pode ser motivo de tela preta.
 */
carregarConfig(lerConfigPublica).catch(() => {}).finally(montar);

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { host: '127.0.0.1', port: 5178 },
  build: {
    // Sem sourcemap em produção: o código do painel não precisa ficar legível.
    // (Dissuasão, não proteção — a proteção real é a RLS do banco.)
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          // three só é baixado por causa do hero; gsap, por causa do scroll;
          // marked/dompurify, só quando alguém abre um estudo. Separados, a
          // primeira tela não carrega o que ainda não vai usar.
          tres: ['three'],
          gsap: ['gsap'],
          texto: ['marked', 'dompurify'],
        },
      },
    },
  },
});

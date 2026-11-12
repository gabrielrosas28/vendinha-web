import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const BASE = mode === 'computador' ? '/' : '/vendinha-web/';
  return {
    base: BASE,
    plugins: [
      react(),
      VitePWA({
        registerType: 'prompt',
        injectRegister: false,
        includeAssets: [],
        includeManifestIcons: false,
        manifest: {
          name: 'Vendinha',
          short_name: 'Vendinha',
          description: 'Caixa da Feirinha do Empreendedorismo do Colégio Santa Chiara',
          lang: 'pt-BR',
          start_url: BASE,
          scope: BASE,
          display: 'standalone',
          orientation: 'any',
          background_color: '#F4F7FB',
          theme_color: '#F4F7FB',
          icons: [
            { src: 'icones/icone-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icones/icone-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icones/icone-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,webp,wav,ttf,txt,ico}'],
          navigateFallback: `${BASE}index.html`,
          cleanupOutdatedCaches: true,
        },
      }),
    ],
  };
});

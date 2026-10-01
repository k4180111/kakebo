import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Заставляет Vite слушать ВСЕ сетевые интерфейсы (IPv4 и IPv6)
    port: 5173,
    strictPort: true, // Не менять порт автоматически, если он занят
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
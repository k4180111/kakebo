import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// OPFS SAHI (синхронный доступ к файлам из основного потока) требует этих заголовков.
const opfsHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0', // Заставляет Vite слушать ВСЕ сетевые интерфейсы (IPv4 и IPv6)
    port: 5173,
    strictPort: true, // Не менять порт автоматически, если он занят
    headers: opfsHeaders,
  },
  preview: {
    headers: opfsHeaders,
  },
});
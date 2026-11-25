import { defineConfig } from 'vite';
export default defineConfig({ base: '/japan-saves/', build: { target: 'es2022', chunkSizeWarningLimit: 1200 } });

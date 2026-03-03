import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
    root: 'src',
    publicDir: '../public',
    plugins: [react()],
    build: {
        outDir: '../dist',
        emptyOutDir: true,
        // MV3 service workers cannot use dynamic imports — disable code splitting
        modulePreload: false,
        rollupOptions: {
            input: {
                // Popup page
                'popup/index': resolve(__dirname, 'src/popup/index.html'),
                // Content script (injected into YouTube) -> Moved to vite.content.config.js
                // Background service worker
                'background/service-worker': resolve(__dirname, 'src/background/service-worker.js'),
            },
            output: {
                // No hash in filenames — manifest.json references exact names
                entryFileNames: '[name].js',
                chunkFileNames: 'chunks/[name].js',
                assetFileNames: (assetInfo) => {
                    if (assetInfo.name?.endsWith('.css')) {
                        return 'content/content.css';
                    }
                    return 'assets/[name][extname]';
                },
            },
        },
    },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
    root: 'src',
    publicDir: false, // Don't copy publicDir assets again (handled by main build)
    plugins: [react()],
    build: {
        outDir: '../dist',
        emptyOutDir: false, // Don't wipe dist (main build runs first)
        modulePreload: false,
        rollupOptions: {
            input: {
                'content/index': resolve(__dirname, 'src/content/index.jsx'),
            },
            output: {
                entryFileNames: '[name].js',
                format: 'iife',
                name: 'ContentScript', // Global variable name for IIFE
                extend: true,
                inlineDynamicImports: true, // Force single file bundle
            },
        },
    },
    define: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    },
});

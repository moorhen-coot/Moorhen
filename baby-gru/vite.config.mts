//import react from '@vitejs/plugin-react-swc';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import checker from 'vite-plugin-checker';
import crossOriginIsolation from 'vite-plugin-cross-origin-isolation';
import { VitePWA } from 'vite-plugin-pwa';
import topLevelAwait from 'vite-plugin-top-level-await';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
    css: {
        preprocessorOptions: {
            scss: {
                api: 'modern',
            },
        },
    },
    plugins: [
        react({ babel: { plugins: ['babel-plugin-react-compiler'] } }),
        //react(),
        wasm(),
        topLevelAwait(),
        crossOriginIsolation(),
        checker({
            typescript: {
                root: './',
                tsconfigPath: 'tsconfig.json',
            },
        }),
        VitePWA({
            registerType: 'autoUpdate',
            workbox: {
                maximumFileSizeToCacheInBytes: 30 * 1024 * 1024,
            },
            devOptions: {
                enabled: true,
                type: 'module',
            },
            manifest: {
                name: 'Moorhen',
                short_name: 'Moorhen',
                description: 'Moorhen is a molecular graphics web application based on the Coot desktop program.',
                theme_color: '#000000',
                background_color: '#ffffff',
                display: 'standalone',
                scope: '/',
                start_url: '/',
                icons: [
                    {
                        src: '/baby-gru/favicon.ico',
                        sizes: '64x64 32x32 24x24 16x16',
                        type: 'image/x-icon',
                        purpose: 'any',
                    },
                    {
                        src: '/baby-gru/logo44.png',
                        type: 'image/png',
                        sizes: '44x44',
                        purpose: 'any',
                    },
                    {
                        src: '/baby-gru/logo71.png',
                        type: 'image/png',
                        sizes: '71x71',
                        purpose: 'any',
                    },
                    {
                        src: '/baby-gru/logo150.png',
                        type: 'image/png',
                        sizes: '150x150',
                        purpose: 'any',
                    },
                    {
                        src: '/baby-gru/logo192.png',
                        type: 'image/png',
                        sizes: '192x192',
                        purpose: 'any',
                    },
                    {
                        src: '/baby-gru/logo310x150.png',
                        type: 'image/png',
                        sizes: '310x150',
                        purpose: 'any',
                    },
                    {
                        src: '/baby-gru/logo310.png',
                        type: 'image/png',
                        sizes: '310x310',
                        purpose: 'any',
                    },
                    {
                        src: '/baby-gru/logo50.png',
                        type: 'image/png',
                        sizes: '50x50',
                        purpose: 'any',
                    },
                    {
                        src: '/baby-gru/logo512.png',
                        type: 'image/png',
                        sizes: '512x512',
                        purpose: 'any',
                    },
                    {
                        src: '/baby-gru/splash620x300.png',
                        type: 'image/png',
                        sizes: '620x300',
                        purpose: 'any',
                    },
                ],
            },
        }),
        {
            name: 'configure-response-headers',
            configureServer: server => {
                server.middlewares.use((_req, res, next) => {
                    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
                    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
                    next();
                });
            },
        },
    ],
    server: {
        headers: {
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Embedder-Policy': 'require-corp',
        },
        watch: {
            ignored: ['**/public/monomers/**', '**/public/**.wasm', '**/public/**.data', '**/public/pixmaps/**', '**/public/tutorials/**'],
        },
    },
    // Remove the lib build configuration for PWA mode
    build: {
        minify: true,
        sourcemap: true,
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom'],
                    ui: ['@mui/material', '@mui/icons-material'],
                },
            },
        },
    },
    base: './',
    optimizeDeps: {
        exclude: ['iris-validation-backend'],
    },
});

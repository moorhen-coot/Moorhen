import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import crossOriginIsolation from 'vite-plugin-cross-origin-isolation';
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import checker from 'vite-plugin-checker';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern',
        }
      }
    },
    plugins: [
        react(),
        wasm(),
        topLevelAwait(),
        crossOriginIsolation(),
        checker({ typescript: {
            root: './',
            tsconfigPath: 'tsconfig.json'

        }}),
        VitePWA({
            registerType: "autoUpdate",
            workbox: {
                maximumFileSizeToCacheInBytes: 30 * 1024 * 1024
            },
            devOptions: {
                enabled: true,
                type: "module"
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
                        type: 'image/x-icon'
                    },
                    {
                        src: '/baby-gru/logo192.png',
                        type: 'image/png',
                        sizes: '192x192'
                    },
                    {
                        src: '/baby-gru/logo512.png',
                        type: 'image/png',
                        sizes: '512x512'
                    }
                ]
            }
        }),
        {
            name: "configure-response-headers",
            configureServer: (server) => {
                server.middlewares.use((_req, res, next) => {
                    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
                    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
                    next();
                });
            },
        },
    ],
    server: {
        headers: {
            "Cross-Origin-Opener-Policy": "same-origin",
            "Cross-Origin-Embedder-Policy": "require-corp"
        },
        watch: {
            ignored: [
                '**/public/monomers/**',
                '**/public/**.wasm',
                '**/public/**.data',
                '**/public/pixmaps/**',
                '**/public/tutorials/**'
            ]
        }
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
                }
            }
        },
    },
    base: './',
    optimizeDeps: {
        exclude: ['iris-validation-backend']
      }
});

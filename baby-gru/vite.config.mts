import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
//import react from "@vitejs/plugin-react-swc";
import crossOriginIsolation from "vite-plugin-cross-origin-isolation";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import checker from "vite-plugin-checker";

export default defineConfig({
    css: {
        preprocessorOptions: {
            scss: {
                api: "modern",
            },
        },
    },
    plugins: [
        react({
            babel: {
                plugins: ["babel-plugin-react-compiler"],
            },
        }),
        wasm(),
        topLevelAwait(),
        crossOriginIsolation(),
        checker({
            typescript: {
                root: "./",
                tsconfigPath: "tsconfig.json",
            },
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
            "Cross-Origin-Embedder-Policy": "require-corp",
        },
        watch: {
            ignored: [
                "**/public/monomers/**",
                "**/public/**.wasm",
                "**/public/**.data",
                "**/public/pixmaps/**",
                "**/public/tutorials/**",
            ],
        },
    },
    build: {
        lib: {
            entry: "./src/moorhen.ts",
            name: "Moorhen",
            fileName: "moorhen",
        },
        minify: true,
        sourcemap: "inline",
        rollupOptions: {
            external: ["react", "react-dom"],
        },
    },
    base: "./",
    optimizeDeps: {
        exclude: ["iris-validation-backend"],
    },
});

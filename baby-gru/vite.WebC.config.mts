import fs from "fs";
import path from "path";
import { defineConfig, mergeConfig, type Plugin } from "vite";
import mainConfig from "./vite.config.mts";

/**
 * Dev-only: serves a monomer library from outside the Vite root for webcomponent-monomers.html.
 * GET /test-monomers/index.json -> ["a/A00.cif", ...]; GET /test-monomers/<path> -> the file.
 * Defaults to ../../monomers; override with MOORHEN_TEST_MONOMERS_DIR.
 */
const testMonomersPlugin = (): Plugin => {
    const root = path.resolve(process.env.MOORHEN_TEST_MONOMERS_DIR ?? path.resolve(__dirname, "../../monomers"));
    const prefix = "/test-monomers/";
    let index: string[] | null = null;

    const buildIndex = (): string[] => {
        if (!fs.existsSync(root)) return [];
        const files: string[] = [];
        for (const dir of fs.readdirSync(root).sort()) {
            // Monomer sub-directories are single characters (0-9, a-z); skip list/, README etc.
            if (dir.length !== 1 || !fs.statSync(path.join(root, dir)).isDirectory()) continue;
            for (const file of fs.readdirSync(path.join(root, dir)).sort()) {
                if (file.endsWith(".cif")) files.push(`${dir}/${file}`);
            }
        }
        return files;
    };

    return {
        name: "moorhen-test-monomers",
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                if (!req.url?.startsWith(prefix)) return next();
                res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
                const rel = decodeURIComponent(req.url.slice(prefix.length).split("?")[0]);
                if (rel === "index.json") {
                    index ??= buildIndex();
                    res.setHeader("Content-Type", "application/json");
                    res.end(JSON.stringify({ root, files: index }));
                    return;
                }
                const filePath = path.resolve(root, rel);
                if (!filePath.startsWith(root + path.sep) || !fs.existsSync(filePath)) {
                    res.statusCode = 404;
                    res.end(`Not found: ${rel}`);
                    return;
                }
                res.setHeader("Content-Type", "text/plain");
                fs.createReadStream(filePath).pipe(res);
            });
        },
    };
};

const webComponentConfig = defineConfig({
    publicDir: "dist/public",
    plugins: [testMonomersPlugin()],
});

export default mergeConfig(webComponentConfig, mainConfig);

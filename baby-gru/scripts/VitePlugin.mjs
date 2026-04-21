import { cpSync, existsSync, mkdirSync } from "fs";
import { resolve } from "path";

/**
 * Vite plugin to copy Moorhen assets from
 * node_modules/moorhen/public/MoorhenAssets into public/MoorhenAssets.
 *
 * @param {Object} [options]
 * @param {string} [options.source='node_modules/moorhen/public/MoorhenAssets'] Source directory to copy from.
 * @param {string} [options.destination='public/MoorhenAssets'] Destination directory to copy into.
 * @returns {import('vite').Plugin}
 */
export function copyMoorhenAssetsToPublic(options = {}) {
    const sourceDir = resolve(process.cwd(), options.source ?? "node_modules/moorhen/public/MoorhenAssets");
    const destinationDir = resolve(process.cwd(), options.destination ?? "public/MoorhenAssets");
    let copied = false;

    const copyAssets = () => {
        if (copied) return;

        if (!existsSync(sourceDir)) {
            console.warn(`[copy-moorhen-assets-to-public] Source not found: ${sourceDir}`);
            return;
        }

        mkdirSync(destinationDir, { recursive: true });
        cpSync(sourceDir, destinationDir, { recursive: true, force: true });
        copied = true;
        console.info(`[copy-moorhen-assets-to-public] Copied assets to ${destinationDir}`);
    };

    return {
        name: "copy-moorhen-assets-to-public",
        configureServer() {
            copyAssets();
        },
        buildStart() {
            copyAssets();
        },
    };
}

export default copyMoorhenAssetsToPublic;

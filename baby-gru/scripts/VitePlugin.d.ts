import type { Plugin } from 'vite';

export interface CopyMoorhenAssetsToPublicOptions {
    source?: string;
    destination?: string;
}

export declare function copyMoorhenAssetsToPublic(
    options?: CopyMoorhenAssetsToPublicOptions
): Plugin;

export default copyMoorhenAssetsToPublic;

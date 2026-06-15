const crypto = require('node:crypto');

const appendTestExports = (source) => {
    let transformed = source.replace(/^.*importScripts\([^\n]*\);\n?/gm, '');

    const onMessagePattern = /(let\s+)?onmessage\s*=\s*function\s*\(e\)\s*\{/g;
    let lastMatch = null;
    for (const match of transformed.matchAll(onMessagePattern)) {
        lastMatch = match;
    }

    if (!lastMatch || lastMatch.index === undefined) {
        throw new Error('Unable to locate CootWorker onmessage handler for Jest transform');
    }

    transformed = `${transformed.slice(0, lastMatch.index)}const onmessage = function (e) {${transformed.slice(lastMatch.index + lastMatch[0].length)}`;
    transformed = transformed.replace(/\nexport\s*\{\s*doCootCommand\s*,\s*setModules\s*\};?\n?$/m, '\n');
    transformed += '\nfunction setModules(arg0, arg1) { molecules_container = arg0; cootModule = arg1; }\nmodule.exports = { doCootCommand, setModules };\n';

    return transformed;
};

module.exports = {
    getCacheKey(sourceText, sourcePath, configString, options) {
        const configValue = typeof configString === 'string' ? configString : JSON.stringify(configString ?? {});
        const optionsValue = JSON.stringify(options ?? {});
        return crypto
            .createHash('sha256')
            .update('coot-worker-transform-v2')
            .update(sourceText)
            .update(sourcePath)
            .update(configValue)
            .update(optionsValue)
            .digest('hex');
    },
    process(sourceText, sourcePath) {
        if (!sourcePath.endsWith('/public/MoorhenAssets/wasm/CootWorker.js')) {
            return { code: sourceText };
        }

        return { code: appendTestExports(sourceText) };
    },
};
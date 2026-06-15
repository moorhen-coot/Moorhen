const crypto = require('node:crypto');

const CAP_MARKER = 'var pthreadPoolSize=32;';

const patchPthreadPoolSize = (source) => {
    if (!source.includes(CAP_MARKER)) {
        return source;
    }

    // Keep the cap test-only and configurable while preventing invalid values.
    return source.replace(
        CAP_MARKER,
        'var __mhPts=Number(globalThis.process?.env?.MOORHEN_TEST_PTHREAD_POOL_SIZE??4);if(!Number.isFinite(__mhPts)||__mhPts<1)__mhPts=1;if(__mhPts>32)__mhPts=32;var pthreadPoolSize=__mhPts;'
    );
};

module.exports = {
    getCacheKey(sourceText, sourcePath, configString, options) {
        const configValue = typeof configString === 'string' ? configString : JSON.stringify(configString ?? {});
        const optionsValue = JSON.stringify(options ?? {});

        return crypto
            .createHash('sha256')
            .update('moorhen-transform-v1')
            .update(sourceText)
            .update(sourcePath)
            .update(configValue)
            .update(optionsValue)
            .digest('hex');
    },

    process(sourceText, sourcePath) {
        if (!sourcePath.endsWith('/public/MoorhenAssets/wasm/moorhen.js')) {
            return { code: sourceText };
        }

        return { code: patchPthreadPoolSize(sourceText) };
    },
};
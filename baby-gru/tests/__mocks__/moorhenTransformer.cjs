const crypto = require('node:crypto');

// The statement that sets the size of the pthread worker pool. The size is whatever was given
// to -sPTHREAD_POOL_SIZE: a number, or an expression such as Module.moorhenPthreadPoolSize.
const CAP_MARKER = /var pthreadPoolSize=[^;]+;/;

const patchPthreadPoolSize = (source) => {
    if (!CAP_MARKER.test(source)) {
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
            .update('moorhen-transform-v2')
            .update(sourceText)
            .update(sourcePath)
            .update(configValue)
            .update(optionsValue)
            .digest('hex');
    },

    process(sourceText, sourcePath) {
        // Both the 32-bit (moorhen.js) and the 64-bit (moorhen64.js) builds.
        if (!/\/public\/MoorhenAssets\/wasm\/moorhen(?:64)?(?:\.js)?$/.test(sourcePath)) {
            return { code: sourceText };
        }

        return { code: patchPthreadPoolSize(sourceText) };
    },
};

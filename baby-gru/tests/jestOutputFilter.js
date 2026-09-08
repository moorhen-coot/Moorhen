const fs = require("node:fs")

const HEAP_RESIZE_DEBUG_PATTERN = /Heap resize call from .* Success: (true|false)/
const originalWriteSync = fs.writeSync

function getChunkText(chunk, encoding) {
    if (typeof chunk === "string") return chunk
    if (Buffer.isBuffer(chunk)) return chunk.toString(typeof encoding === "string" ? encoding : "utf8")
    return ""
}

function getSuppressedLength(args) {
    const chunk = args[1]
    if (typeof chunk === "string") {
        const encoding = typeof args[3] === "string" ? args[3] : "utf8"
        return Buffer.byteLength(chunk, encoding)
    }
    if (Buffer.isBuffer(chunk)) {
        return typeof args[3] === "number" ? args[3] : chunk.length
    }
    return 0
}

fs.writeSync = function patchedWriteSync(...args) {
    const fd = args[0]
    const chunk = args[1]
    const encoding = typeof args[3] === "string" ? args[3] : undefined
    const text = getChunkText(chunk, encoding)

    if (fd === 2 && HEAP_RESIZE_DEBUG_PATTERN.test(text)) {
        return getSuppressedLength(args)
    }

    return originalWriteSync.apply(this, args)
}

afterAll(() => {
    fs.writeSync = originalWriteSync
})

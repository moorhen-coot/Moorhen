/**
 * GPU time of a span of passes in one command encoder, read back in the background, for status
 * lines: the whole span, and the segments between marks along it.
 *
 * A mark is a timestamp written at the beginning or end of a pass; mark 0 starts the span and the
 * last mark ends it. Segment i runs from mark i to mark i + 1, so it includes any passes between
 * the two that are not marked themselves.
 *
 * Needs the device's "timestamp-query" feature; create() returns null without it. While a reading
 * is in flight, spans are not timed (writes() returns null), so nothing ever waits on the GPU.
 * Browsers quantise timestamps (Chrome to 0.1 ms without its unsafe-APIs flag), so a single short
 * segment is coarse; the mean of many is what to read.
 */
const QUERY_RESOLVE = 0x0200, COPY_SRC = 0x0004, COPY_DST = 0x0008, MAP_READ = 0x0001;
const MAP_MODE_READ = 0x0001;

export type PassTimestamps = GPUComputePassTimestampWrites & GPURenderPassTimestampWrites;

/** The timestamp writes for one pass: marks at its beginning and/or end. */
export type MarkPass = (beginMark?: number, endMark?: number) => PassTimestamps;

export interface SpanTiming {
    /** Mean of the whole span (first mark to last), ms. */
    meanMs: number;
    /** The longest whole span, ms. */
    maxMs: number;
    /** Spans timed. */
    count: number;
    /** Mean of each segment, ms. */
    segmentsMs: number[];
}

export class GpuSpanTimer {
    private reading = false;
    private destroyed = false;
    private pending = false;
    private sum = 0;
    private max = 0;
    private count = 0;
    private readonly segmentSums: number[];

    private constructor(private readonly marks: number, private readonly querySet: GPUQuerySet,
                        private readonly resolved: GPUBuffer, private readonly readback: GPUBuffer) {
        this.segmentSums = new Array(marks - 1).fill(0);
    }

    /** `marks`: at least 2, the start and the end. */
    static create(device: GPUDevice, label: string, marks = 2): GpuSpanTimer | null {
        if (!device.features.has("timestamp-query")) return null;
        return new GpuSpanTimer(marks,
            device.createQuerySet({ label: `${label} timestamps`, type: "timestamp", count: marks }),
            device.createBuffer({ label: `${label} timestamps resolved`, size: 8 * marks, usage: QUERY_RESOLVE | COPY_SRC }),
            device.createBuffer({ label: `${label} timestamps read`, size: 8 * marks, usage: MAP_READ | COPY_DST }));
    }

    /**
     * Time this span: gives the writes for a pass that carries marks. Every mark must be written
     * by some pass of the span. Null to leave the span untimed (a reading is still in flight).
     */
    writes(): MarkPass | null {
        if (this.reading || this.pending || this.destroyed) return null;
        this.pending = true;
        return (beginMark, endMark) => ({
            querySet: this.querySet,
            ...(beginMark !== undefined ? { beginningOfPassWriteIndex: beginMark } : {}),
            ...(endMark !== undefined ? { endOfPassWriteIndex: endMark } : {}),
        });
    }

    /**
     * After the span's last pass, in the same encoder, if writes() gave writes. Then call
     * collect() once the encoder is submitted.
     */
    resolve(encoder: GPUCommandEncoder): void {
        encoder.resolveQuerySet(this.querySet, 0, this.marks, this.resolved, 0);
        encoder.copyBufferToBuffer(this.resolved, 0, this.readback, 0, 8 * this.marks);
    }

    /** After the submit: read the span's times in the background. */
    collect(): void {
        if (!this.pending) return;
        this.pending = false;
        this.reading = true;
        this.readback.mapAsync(MAP_MODE_READ).then(() => {
            const t = new BigUint64Array(this.readback.getMappedRange(), 0, this.marks).slice();
            this.readback.unmap();
            this.reading = false;
            if (this.destroyed) return this.release();
            // A span whose timestamps went backwards (a reset, or a quirk) is not a time.
            for (let i = 1; i < this.marks; i++) if (t[i] < t[i - 1]) return;
            const ms = (a: bigint, b: bigint) => Number(b - a) / 1e6;
            const total = ms(t[0], t[this.marks - 1]);
            this.sum += total;
            this.max = Math.max(this.max, total);
            this.count++;
            for (let i = 0; i < this.marks - 1; i++) this.segmentSums[i] += ms(t[i], t[i + 1]);
        }).catch(() => {
            this.reading = false;
            if (this.destroyed) this.release();
        });
    }

    /** The times since the last take; then start again. */
    take(): SpanTiming {
        const n = this.count;
        const out = {
            meanMs: n ? this.sum / n : 0, maxMs: this.max, count: n,
            segmentsMs: this.segmentSums.map(s => (n ? s / n : 0)),
        };
        this.sum = 0;
        this.max = 0;
        this.count = 0;
        this.segmentSums.fill(0);
        return out;
    }

    destroy(): void {
        this.destroyed = true;
        if (!this.reading) this.release();
    }

    private release(): void {
        this.querySet.destroy();
        this.resolved.destroy();
        this.readback.destroy();
    }
}

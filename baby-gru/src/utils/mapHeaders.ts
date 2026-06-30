export type MRCHeaderJson = {
    dimensions: {
        nx: number;
        ny: number;
        nz: number;
        mode: number;
    };
    start: {
        nxstart: number;
        nystart: number;
        nzstart: number;
    };
    sampling: {
        mx: number;
        my: number;
        mz: number;
    };
    unitCell: {
        cella: { x: number; y: number; z: number };
        cellb: { alpha: number; beta: number; gamma: number };
    };
    axisMapping: {
        mapc: number;
        mapr: number;
        maps: number;
    };
    statistics: {
        dmin: number;
        dmax: number;
        dmean: number;
        rms: number;
    };
    spaceGroup: {
        ispg: number;
    };
    extendedHeader: {
        nSymbt: number;
        extType: string;
        extraWords: number[];
    };
    format: {
        map: string;
        nversion: number;
        machineStamp: number[];
        littleEndian: boolean;
    };
    labels: {
        nlabl: number;
        values: string[];
    };
};

export type MTZColumnHeader = {
    label: string;
    type: string;
    min?: number;
    max?: number;
    datasetId?: number;
};

export type MTZHeaderJson = {
    format: {
        magic: string;
        headerStartWord: number;
        headerStartByte: number;
        machineStamp: number[];
        littleEndian: boolean;
    };
    records: {
        version?: string;
        title?: string;
        ncol?: number;
        nref?: number;
        nbatch?: number;
        cell?: number[];
        sort?: number[];
        syminf?: {
            nSymOps?: number;
            nPrimitiveOps?: number;
            latticeType?: string;
            spaceGroupNumber?: number;
            spaceGroupName?: string;
            pointGroupName?: string;
            raw: string;
        };
        symm: string[];
        reso?: {
            low?: number;
            high?: number;
            raw: string;
        };
        valm?: number;
        nDif?: number;
        columns: MTZColumnHeader[];
        projects: { id: number; name: string }[];
        crystals: { id: number; name: string }[];
        datasets: { id: number; name: string }[];
        dcell: { id: number; cell: number[] }[];
        dwavel: { id: number; wavelength: number }[];
        batches: number[];
        history: string[];
        otherRecords: string[];
    };
};

export const readMTZHeader = async (file: File): Promise<MTZHeaderJson> => {
    if (file.size < 20) {
        throw new Error(`MTZ preamble requires at least 20 bytes, got ${file.size}`);
    }

    const preambleBuffer = await file.slice(0, 20).arrayBuffer();
    const preambleBytes = new Uint8Array(preambleBuffer);
    const preambleView = new DataView(preambleBuffer);

    const magic = String.fromCharCode(...preambleBytes.slice(0, 4));
    if (!magic.startsWith("MTZ")) {
        throw new Error(`Not an MTZ file: expected magic 'MTZ ', got '${magic}'`);
    }

    // Machine stamp starts at byte 9 (1-based indexing in CCP4 docs).
    const machineStamp = Array.from(preambleBytes.slice(8, 12));

    // MTZ is typically little-endian. Keep a defensive fallback for unusual files.
    const headerStartWordLittle = preambleView.getInt32(4, true);
    const headerStartWordBig = preambleView.getInt32(4, false);
    const headerStartByteLittle = (headerStartWordLittle - 1) * 4;
    const headerStartByteBig = (headerStartWordBig - 1) * 4;

    let littleEndian = true;
    let headerStartWord = headerStartWordLittle;
    let headerStartByte = headerStartByteLittle;

    if (headerStartByteLittle < 0 || headerStartByteLittle >= file.size) {
        littleEndian = false;
        headerStartWord = headerStartWordBig;
        headerStartByte = headerStartByteBig;
    }

    if (headerStartByte < 0 || headerStartByte >= file.size) {
        throw new Error(`Invalid MTZ header start byte ${headerStartByte} (file size ${file.size})`);
    }

    const headerChunk = await file.slice(headerStartByte).arrayBuffer();
    const headerBytes = new Uint8Array(headerChunk);
    const decoder = new TextDecoder("ascii");

    const records: string[] = [];
    for (let offset = 0; offset + 80 <= headerBytes.length; offset += 80) {
        const rawRecord = decoder
            .decode(headerBytes.subarray(offset, offset + 80))
            .replaceAll("\0", "")
            .trimEnd();
        if (rawRecord.length === 0) {
            continue;
        }
        records.push(rawRecord);
        if (rawRecord === "END") {
            break;
        }
    }

    if (!records.includes("END")) {
        throw new Error("Could not find END record in MTZ header");
    }

    const parsed: MTZHeaderJson = {
        format: {
            magic,
            headerStartWord,
            headerStartByte,
            machineStamp,
            littleEndian,
        },
        records: {
            symm: [],
            columns: [],
            projects: [],
            crystals: [],
            datasets: [],
            dcell: [],
            dwavel: [],
            batches: [],
            history: [],
            otherRecords: [],
        },
    };

    let inHistory = false;
    for (const record of records) {
        if (record === "END") {
            inHistory = true;
            continue;
        }

        if (inHistory) {
            parsed.records.history.push(record);
            continue;
        }

        const [keyword, ...rest] = record.split(/\s+/);
        const payload = rest.join(" ").trim();

        switch (keyword) {
            case "VERS": {
                parsed.records.version = payload;
                break;
            }
            case "TITLE": {
                parsed.records.title = payload;
                break;
            }
            case "NCOL": {
                const [ncol, nref, nbatch] = payload.split(/\s+/).map(value => Number(value));
                parsed.records.ncol = Number.isFinite(ncol) ? ncol : undefined;
                parsed.records.nref = Number.isFinite(nref) ? nref : undefined;
                parsed.records.nbatch = Number.isFinite(nbatch) ? nbatch : undefined;
                break;
            }
            case "CELL": {
                const values = payload
                    .split(/\s+/)
                    .map(value => Number(value))
                    .filter(value => Number.isFinite(value));
                parsed.records.cell = values;
                break;
            }
            case "SORT": {
                const values = payload
                    .split(/\s+/)
                    .map(value => Number(value))
                    .filter(value => Number.isFinite(value));
                parsed.records.sort = values;
                break;
            }
            case "SYMINF": {
                const tokens = payload.split(/\s+/);
                const nSymOps = Number(tokens[0]);
                const nPrimitiveOps = Number(tokens[1]);
                const latticeType = tokens[2];
                const spaceGroupNumber = Number(tokens[3]);
                parsed.records.syminf = {
                    nSymOps: Number.isFinite(nSymOps) ? nSymOps : undefined,
                    nPrimitiveOps: Number.isFinite(nPrimitiveOps) ? nPrimitiveOps : undefined,
                    latticeType,
                    spaceGroupNumber: Number.isFinite(spaceGroupNumber) ? spaceGroupNumber : undefined,
                    spaceGroupName: payload.match(/'([^']+)'/)?.[1],
                    pointGroupName: payload.match(/'[^']+'\s+'([^']+)'/)?.[1],
                    raw: payload,
                };
                break;
            }
            case "SYMM": {
                parsed.records.symm.push(payload);
                break;
            }
            case "RESO": {
                const [low, high] = payload.split(/\s+/).map(value => Number(value));
                parsed.records.reso = {
                    low: Number.isFinite(low) ? low : undefined,
                    high: Number.isFinite(high) ? high : undefined,
                    raw: payload,
                };
                break;
            }
            case "VALM": {
                const valm = Number(payload.split(/\s+/)[0]);
                parsed.records.valm = Number.isFinite(valm) ? valm : undefined;
                break;
            }
            case "COL": {
                const colMatch = payload.match(
                    /^(\S+)\s+(\S)(?:\s+([+-]?(?:\d+\.?\d*|\d*\.\d+)(?:[Ee][+-]?\d+)?)\s+([+-]?(?:\d+\.?\d*|\d*\.\d+)(?:[Ee][+-]?\d+)?)\s+(\d+))?$/
                );
                if (colMatch) {
                    parsed.records.columns.push({
                        label: colMatch[1],
                        type: colMatch[2],
                        min: colMatch[3] !== undefined ? Number(colMatch[3]) : undefined,
                        max: colMatch[4] !== undefined ? Number(colMatch[4]) : undefined,
                        datasetId: colMatch[5] !== undefined ? Number(colMatch[5]) : undefined,
                    });
                } else {
                    parsed.records.otherRecords.push(record);
                }
                break;
            }
            case "NDIF": {
                const nDif = Number(payload.split(/\s+/)[0]);
                parsed.records.nDif = Number.isFinite(nDif) ? nDif : undefined;
                break;
            }
            case "PROJECT":
            case "CRYSTAL":
            case "DATASET": {
                const idMatch = payload.match(/^(\d+)\s+(.+)$/);
                if (idMatch) {
                    const entry = { id: Number(idMatch[1]), name: idMatch[2].trim() };
                    if (keyword === "PROJECT") parsed.records.projects.push(entry);
                    if (keyword === "CRYSTAL") parsed.records.crystals.push(entry);
                    if (keyword === "DATASET") parsed.records.datasets.push(entry);
                } else {
                    parsed.records.otherRecords.push(record);
                }
                break;
            }
            case "DCELL": {
                const tokens = payload.split(/\s+/);
                const id = Number(tokens[0]);
                const cell = tokens
                    .slice(1)
                    .map(value => Number(value))
                    .filter(value => Number.isFinite(value));
                parsed.records.dcell.push({ id, cell });
                break;
            }
            case "DWAVEL": {
                const [idRaw, wavelengthRaw] = payload.split(/\s+/);
                const id = Number(idRaw);
                const wavelength = Number(wavelengthRaw);
                if (Number.isFinite(id) && Number.isFinite(wavelength)) {
                    parsed.records.dwavel.push({ id, wavelength });
                } else {
                    parsed.records.otherRecords.push(record);
                }
                break;
            }
            case "BATCH": {
                const batchId = Number(payload.split(/\s+/)[0]);
                if (Number.isFinite(batchId)) {
                    parsed.records.batches.push(batchId);
                } else {
                    parsed.records.otherRecords.push(record);
                }
                break;
            }
            default: {
                parsed.records.otherRecords.push(record);
                break;
            }
        }
    }

    return parsed;
};

export const readMRCHeader = async (file: ArrayBuffer | Uint8Array): Promise<MRCHeaderJson> => {
    const MAIN_HEADER_SIZE = 1024;

    // let headerBuffer: ArrayBuffer;
    // if (file.name.endsWith(".gz")) {
    //     if (typeof DecompressionStream === "undefined") {
    //         throw new Error("DecompressionStream is not available in this environment");
    //     }

    //     const decompressedStream = file.stream().pipeThrough(new DecompressionStream("gzip"));
    //     const reader = decompressedStream.getReader();
    //     const headerBytes = new Uint8Array(MAIN_HEADER_SIZE);
    //     let bytesRead = 0;

    //     try {
    //         while (bytesRead < MAIN_HEADER_SIZE) {
    //             const { value, done } = await reader.read();
    //             if (done) {
    //                 break;
    //             }

    //             const chunk = value instanceof Uint8Array ? value : new Uint8Array(value);
    //             const bytesToCopy = Math.min(chunk.length, MAIN_HEADER_SIZE - bytesRead);
    //             headerBytes.set(chunk.subarray(0, bytesToCopy), bytesRead);
    //             bytesRead += bytesToCopy;

    //             if (bytesRead >= MAIN_HEADER_SIZE) {
    //                 await reader.cancel();
    //                 break;
    //             }
    //         }
    //     } finally {
    //         reader.releaseLock();
    //     }

    //     if (bytesRead < MAIN_HEADER_SIZE) {
    //         throw new Error(`Uncompressed MRC header requires at least ${MAIN_HEADER_SIZE} bytes, got ${bytesRead}`);
    //     }

    //     headerBuffer = headerBytes.buffer;
    // } else {
    const fileBytes = file instanceof Uint8Array ? file : new Uint8Array(file);
    if (fileBytes.byteLength < MAIN_HEADER_SIZE) {
        throw new Error(`MRC header requires at least ${MAIN_HEADER_SIZE} bytes, got ${fileBytes.byteLength}`);
    }

    const bytes = fileBytes.subarray(0, MAIN_HEADER_SIZE);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    // }

    const machineStamp = Array.from(bytes.slice(212, 216));
    const littleEndian =
        machineStamp[0] === 0x44 && machineStamp[1] === 0x44 ? true : machineStamp[0] === 0x11 && machineStamp[1] === 0x11 ? false : true;

    const readI32 = (offset: number) => view.getInt32(offset, littleEndian);
    const readF32 = (offset: number) => view.getFloat32(offset, littleEndian);
    const readString = (offset: number, length: number) => {
        const value = String.fromCharCode(...bytes.slice(offset, offset + length));
        return value.replaceAll("\0", "").trim();
    };

    const extraWords: number[] = [];
    for (let wordOffset = 96; wordOffset < 196; wordOffset += 4) {
        extraWords.push(readI32(wordOffset));
    }

    const labels = Array.from({ length: 10 }, (_, i) => readString(224 + i * 80, 80));

    return {
        dimensions: {
            nx: readI32(0),
            ny: readI32(4),
            nz: readI32(8),
            mode: readI32(12),
        },
        start: {
            nxstart: readI32(16),
            nystart: readI32(20),
            nzstart: readI32(24),
        },
        sampling: {
            mx: readI32(28),
            my: readI32(32),
            mz: readI32(36),
        },
        unitCell: {
            cella: {
                x: readF32(40),
                y: readF32(44),
                z: readF32(48),
            },
            cellb: {
                alpha: readF32(52),
                beta: readF32(56),
                gamma: readF32(60),
            },
        },
        axisMapping: {
            mapc: readI32(64),
            mapr: readI32(68),
            maps: readI32(72),
        },
        statistics: {
            dmin: readF32(76),
            dmax: readF32(80),
            dmean: readF32(84),
            rms: readF32(216),
        },
        spaceGroup: {
            ispg: readI32(88),
        },
        extendedHeader: {
            nSymbt: readI32(92),
            extType: readString(104, 4),
            extraWords,
        },
        format: {
            map: readString(208, 4),
            nversion: readI32(108),
            machineStamp,
            littleEndian,
        },
        labels: {
            nlabl: readI32(220),
            values: labels,
        },
    };
};

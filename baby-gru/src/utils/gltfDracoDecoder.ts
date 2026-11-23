/**
 * Google's Draco decoder, loaded only when a compressed file actually turns up.
 *
 * The rebuilding of the glTF around the decoded geometry is in gltfDraco.ts and knows nothing
 * about this; all this does is satisfy that module's DracoDecode contract. Keeping them apart is
 * what lets the rebuilding - where the mistakes would be - be tested against known geometry
 * without a 190 KB WebAssembly module in the loop.
 *
 * Two things about how it is loaded are deliberate.
 *
 * It is loaded at runtime from Moorhen's own asset directory rather than imported through a
 * bundler. The npm package ships its glue as `draco_decoder_gltf_nodejs.js`, which is
 * misleading: the file detects its environment and runs perfectly well in a browser, with
 * `require("fs")` inside a branch a browser never takes. But a bundler reads that `require`
 * statically, and making Vite and the webpack webcomponent build both agree to ignore it is two
 * configurations to keep working.
 *
 * It is fetched as text and evaluated against a CommonJS shim, which is what three.js does with
 * the same files. That needs `unsafe-eval` in a Content Security Policy - which is worth knowing
 * and costs nothing here, because Moorhen already requires it: emscripten's embind builds every
 * method invoker with `new Function`, so Coot does not start at all without it. A page that can
 * run Moorhen can run this.
 *
 * The URL is resolved against the document rather than this module, because `urlPrefix` may be
 * relative - the web component defaults it to "MoorhenAssets" - and a bundle does not
 * necessarily sit beside the page that loaded it. That is the same resolution the web component
 * uses for moorhen.css.
 *
 * The WebAssembly binary is handed over as `wasmBinary` rather than left to be located, since an
 * emscripten module left to itself derives a URL from the script that loaded it. Fetching it
 * ourselves also means it arrives as an ArrayBuffer, so the server does not have to be serving
 * .wasm as application/wasm for instantiation to work.
 *
 * The decode happens on the main thread, like the winding correction on the way out. A large
 * compressed mesh will stall the page while it runs; if that becomes a problem the thing to move
 * is this module rather than its caller, since the contract it satisfies is one function.
 */
import type { DecoderModule } from "draco3d";
import type { DracoDecode, DracoDecoded } from "./gltfDraco";

/** The files the build step copies out of node_modules, beside Moorhen's other wasm. */
const GLUE_FILE = "draco_decoder_gltf.js";
const WASM_FILE = "draco_decoder_gltf.wasm";

/** The emscripten factory the glue defines, as a UMD export. */
type DecoderFactory = (config: { wasmBinary?: ArrayBuffer }) => Promise<DecoderModule>;

/**
 * One module per page, kept as the promise so that two imports arriving together share it.
 *
 * Cleared on failure, so a load that failed because the network was briefly unavailable can be
 * retried by opening the file again rather than being wrong for the rest of the session.
 */
let loading: Promise<DecoderModule> | null = null;

/**
 * Where an asset lives, as an absolute URL.
 *
 * Resolved against the document because `urlPrefix` may be relative and a bundle does not
 * necessarily sit beside the page. The fallback matters for a Moorhen driven through its API
 * without MainContainer mounted: `paths.urlPrefix` starts empty, and an empty prefix would ask
 * for "/wasm/..." at the server root, which is nobody's layout. "MoorhenAssets" is what the web
 * component defaults to and is relative, so it survives being served under a sub-path.
 */
const assetUrl = (urlPrefix: string, file: string): string => {
    const prefix = urlPrefix && urlPrefix.length > 0 ? urlPrefix : "MoorhenAssets";
    return new URL(`${prefix}/wasm/${file}`, window.location.href).href;
};

const missing = (url: string, detail: string) =>
    new Error(`the Draco decoder could not be loaded from ${url} (${detail}); it is put there ` +
              `by npm run copy-draco, which the prestart and prebuild steps run`);

const loadDecoderModule = (urlPrefix: string): Promise<DecoderModule> => {
    if (loading) return loading;

    loading = (async () => {
        const glueUrl = assetUrl(urlPrefix, GLUE_FILE);
        const wasmUrl = assetUrl(urlPrefix, WASM_FILE);

        const [glue, wasmBinary] = await Promise.all([
            fetch(glueUrl).then(response => {
                if (!response.ok) throw missing(glueUrl, `HTTP ${response.status}`);
                return response.text();
            }),
            fetch(wasmUrl).then(response => {
                if (!response.ok) throw missing(wasmUrl, `HTTP ${response.status}`);
                return response.arrayBuffer();
            }),
        ]);

        // UMD: given a `module` and `exports` it assigns the factory to module.exports. `require`
        // is only reached inside the file's Node branch, which a browser never takes, but it has
        // to be a function for the preamble to be satisfied.
        const shim: { exports: unknown } = { exports: {} };
        new Function("module", "exports", "require", glue)(shim, shim.exports, (name: string) => {
            throw new Error(`the Draco decoder asked for the Node module ${name} in a browser`);
        });

        const exported = shim.exports as DecoderFactory | { DracoDecoderModule?: DecoderFactory };
        const create = typeof exported === "function" ? exported : exported?.DracoDecoderModule;
        if (typeof create !== "function") {
            throw missing(glueUrl, "it did not export a module factory");
        }

        return await create({ wasmBinary });
    })().catch(error => {
        loading = null;
        throw error;
    });

    return loading;
};

/**
 * A decode function built on an already-loaded decoder module.
 *
 * Separate from the loading so that this - the part that uses Draco's API, and so the part where
 * a misunderstanding of it would live - can be exercised against the real library. The module is
 * fetched over HTTP in a browser, which a test cannot do, but the same module is a plain require
 * in Node.
 */
export const decodeWith = (draco: DecoderModule): DracoDecode => {
    return (compressed: Uint8Array, uniqueIds: number[]): DracoDecoded => {
        const buffer = new draco.DecoderBuffer();
        const decoder = new draco.Decoder();
        let mesh: ReturnType<typeof draco.Mesh.prototype.constructor> | null = null;

        /**
         * Copies `count` values out of the module's heap.
         *
         * The copy has to happen before the next allocation, not merely before the free: a
         * growing heap is replaced with a new ArrayBuffer and detaches every view onto the old
         * one, so a view held across a malloc can go out from under us.
         */
        const readFromHeap = (byteLength: number, count: number,
                              fill: (ptr: number) => void, float: boolean): Float32Array | Uint32Array => {
            const ptr = draco._malloc(byteLength);
            try {
                fill(ptr);
                return float
                    ? new Float32Array(draco.HEAPF32.buffer, ptr, count).slice()
                    : new Uint32Array(draco.HEAPU32.buffer, ptr, count).slice();
            } finally {
                draco._free(ptr);
            }
        };

        try {
            // Int8Array rather than Uint8Array: that is what DecoderBuffer::Init takes, and the
            // same bytes seen as signed.
            buffer.Init(
                new Int8Array(compressed.buffer, compressed.byteOffset, compressed.byteLength),
                compressed.byteLength
            );

            mesh = new draco.Mesh();
            const status = decoder.DecodeBufferToMesh(buffer, mesh);
            if (!status.ok()) {
                throw new Error(`the compressed geometry could not be decoded (${status.error_msg()})`);
            }

            const numPoints = mesh.num_points();
            const numFaces = mesh.num_faces();
            if (numPoints === 0 || numFaces === 0) {
                throw new Error("the compressed geometry decoded to nothing");
            }

            // Always 32-bit, whatever the file declared: a decoded mesh can have more vertices
            // than a 16-bit index reaches, and widening here costs nothing downstream.
            const indices = readFromHeap(
                numFaces * 3 * 4, numFaces * 3,
                ptr => decoder.GetTrianglesUInt32Array(mesh!, numFaces * 3 * 4, ptr),
                false
            ) as Uint32Array;

            const attributes: DracoDecoded["attributes"] = new Map();
            for (const id of uniqueIds) {
                const attribute = decoder.GetAttributeByUniqueId(mesh, id);
                // A id the file names but the blob does not contain. Left out rather than
                // guessed at; gltfDraco refuses the file and says which attribute was missing.
                if (!attribute) continue;
                const components = attribute.num_components();
                if (!Number.isFinite(components) || components <= 0) continue;

                const values = readFromHeap(
                    numPoints * components * 4, numPoints * components,
                    ptr => decoder.GetAttributeDataArrayForAllPoints(
                        mesh!, attribute, draco.DT_FLOAT32, numPoints * components * 4, ptr),
                    true
                ) as Float32Array;

                // Floats whatever it was stored as, already dequantised by the decoder. The
                // reasoning for not re-quantising is in gltfDraco.ts.
                attributes.set(id, { values, components });
            }

            return { numPoints, indices, attributes };
        } finally {
            // These are C++ objects behind handles, not garbage collected with the wrapper.
            if (mesh) draco.destroy(mesh);
            draco.destroy(decoder);
            draco.destroy(buffer);
        }
    };
};

/**
 * A decode function for gltfDraco, with the decoder fetched on first use.
 *
 * @param urlPrefix - Moorhen's asset prefix, from moorhenInstance.paths.
 */
export const createDracoDecode = async (urlPrefix: string): Promise<DracoDecode> =>
    decodeWith(await loadDecoderModule(urlPrefix));

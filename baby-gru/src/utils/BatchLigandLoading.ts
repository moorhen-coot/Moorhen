import { batch } from "react-redux";
import type { cootCommandKwargs, WorkerResponse } from "@/InstanceManager/CommandCentre";
import type { LoadFilesResult, MoorhenInstance } from "@/InstanceManager/MoorhenInstance";
import { addCustomRepresentationList, addMoleculeList } from "@/store/moleculesSlice";
import { setDrawsThrottled, setRequestDrawScene } from "@/store/glRefSlice";
import { setJobProgress, setLigandBatchLoading } from "@/store/generalStatesSlice";
import { setBusy } from "@/store/globalUISlice";
import { MoorhenMolecule } from "./MoorhenMolecule";
import { fetchMonomerDictionary } from "./monomerLibrary";
import { flushDictionaryRecords, holdDictionaryRecords, readDictionary as readDictionaryIntoCoot } from "./dictionaries";
import { flushMoleculeRecords, holdMoleculeRecords } from "./moleculeRecords";
import { moleculeNameFromFileName } from "./utils";
import { MoleculeRepresentation } from "./Representation/MoorhenMoleculeRepresentation";

/*
 * Batch loading of many small ligand coordinate files (e.g. docking poses), for
 * MoorhenInstance.files.batchLoadLigands. See src/.roadmaps/batch-ligand-loading.md.
 *
 * Each ligand ends up as it would through loadFiles: one molecule, drawn as bonds (CBs) with its
 * default colours, its missing dictionaries read into Coot and cached on it. What changes is how
 * the work is grouped:
 * - files are read in chunks: reading the coordinates is one worker message per chunk, and so is
 *   asking for atom count, glycans, missing dictionaries and colour rules;
 * - a missing dictionary is fetched and read into Coot once per comp_id for the whole batch, in
 *   parallel, and read globally;
 * - the representations of a chunk are created with the normal MoleculeRepresentation.create, all at
 *   once, so the worker queue stays full;
 * - the molecule list gets one update per chunk;
 * - the worker reads the next chunk while the main thread draws the current one;
 * - nothing is journaled (no undo history, no time capsule), no camera move unless asked for, no
 *   sequence viewer change, one summary snackbar instead of one per failed file.
 */

/**
 * One ligand file: a `File`, a URL, or either with facts to attach to its molecule (`metadata`: a
 * docking score, a rank... as strings by name, see MoorhenMolecule.metadata). They are shown on the
 * ligand's card and saved in sessions.
 */
export type BatchLigandSource =
    | File
    | string
    | URL
    | { url: string | URL; filename: string; metadata?: Record<string, string> }
    | { file: File; metadata?: Record<string, string> };

export type BatchLoadLigandsOptions = {
    /** Dictionaries known up front: read into Coot once, and not looked up for the comp_ids they define. */
    dictionaries?: (File | string | URL)[];
    /** Centre the view on the last loaded ligand at the end (default false). */
    centre?: boolean;
    /**
     * Ligands per chunk, i.e. per group of worker messages and per store update (default 20). The
     * worker prepares each chunk between the meshes of the others, and nothing new is drawn meanwhile:
     * larger chunks are no faster, only longer pauses.
     */
    chunkSize?: number;
    /** Called after each chunk is added to the scene. */
    onProgress?: (done: number, total: number) => void;
};

export type BatchLoadLigandsResult = {
    /** One entry per loaded file, in input order. */
    loaded: LoadFilesResult;
    /** Files that could not be loaded, and why. */
    failed: { fileName: string; error: string }[];
};

type ChunkItem = {
    index: number;
    fileName: string;
    text: string;
    molecule: MoorhenMolecule;
    missingCompIds: string[];
    representation?: MoleculeRepresentation;
};

const FETCH_CONCURRENCY = 16;

/** How many chunks are prepared (read into Coot, dictionaries) ahead of the one being drawn */
const PREPARE_AHEAD = 2;

/** How many batches are loading, per store (their progress notification is shared) */
const runningBatches = new WeakMap<object, number>();

/** The file or URL of a source given with metadata, else the source itself */
const sourceContent = (source: BatchLigandSource): File | string | URL => {
    if (source instanceof File || source instanceof URL || typeof source === "string") return source;
    return "file" in source ? source.file : source.url;
};

const sourceName = (source: BatchLigandSource): string => {
    const content = sourceContent(source);
    if (content instanceof File) return content.name;
    if (typeof source === "object" && "filename" in source && source.filename) return source.filename;
    return content.toString().split("?")[0].split("/").pop() || "ligand";
};

/**
 * The metadata given with a source, as the molecule keeps it: a copy, its values as strings (a host
 * may pass numbers, which a session file would refuse), those without a value left out.
 */
const sourceMetadata = (source: BatchLigandSource): Record<string, string> => {
    const metadata = typeof source === "object" && "metadata" in source ? source.metadata : undefined;
    if (!metadata || typeof metadata !== "object") return {};
    return Object.fromEntries(
        Object.entries(metadata as Record<string, unknown>)
            .filter(([, value]) => value !== null && value !== undefined)
            .map(([key, value]) => [key, String(value)])
    );
};

const readSource = async (source: BatchLigandSource): Promise<string> => {
    const content = sourceContent(source);
    if (content instanceof File) return content.text();
    const url = content;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.text();
};

/** Read all sources, FETCH_CONCURRENCY at a time. A failed read is reported, not thrown. */
const readAll = async (sources: BatchLigandSource[]): Promise<({ text: string } | { error: string })[]> => {
    const results: ({ text: string } | { error: string })[] = new Array(sources.length);
    let next = 0;
    await Promise.all(
        Array.from({ length: Math.min(FETCH_CONCURRENCY, sources.length) }, async () => {
            while (next < sources.length) {
                const i = next++;
                try {
                    results[i] = { text: await readSource(sources[i]) };
                } catch (err) {
                    results[i] = { error: `could not read the file (${err instanceof Error ? err.message : err})` };
                }
            }
        })
    );
    return results;
};

/** The comp_ids a dictionary text defines (its data_comp_<id> blocks). */
const dictionaryCompIds = (text: string): string[] =>
    [...text.matchAll(/^\s*data_comp_(\S+)/gm)].map(match => match[1]).filter(id => id !== "list");

const commandFailed = (result: { result?: { status?: string } } | undefined) => result?.result?.status !== "Completed";

export const batchLoadLigands = async (
    instance: MoorhenInstance,
    sources: BatchLigandSource[],
    options: BatchLoadLigandsOptions = {}
): Promise<BatchLoadLigandsResult> => {
    const { centre = false, chunkSize = 20, onProgress } = options;
    const store = instance.store;
    const commandCentre = instance.commandCentre;
    const { backgroundColor, defaultBondSmoothness } = store.getState().sceneSettings;
    const useGemmi = store.getState().generalStates.useGemmi;
    const moleculesBefore = instance.getMoleculeList();

    const failed: BatchLoadLigandsResult["failed"] = [];
    const loaded: { index: number; entry: LoadFilesResult[number] }[] = [];
    // By source index: a file fails once (a chunk failing late fails only those not failed yet), and
    // two sources with the same file name are two files
    const failedIndices = new Set<number>();
    const fail = (index: number, fileName: string, error: string) => {
        if (failedIndices.has(index)) return;
        failedIndices.add(index);
        failed.push({ fileName, error });
    };

    /** Run commands in one worker message, without journaling, reported as one job. */
    const runList = async (commands: cootCommandKwargs[]) => {
        if (commands.length === 0) return [];
        const reply = (await commandCentre.cootCommandList(commands, false, true)) as WorkerResponse & {
            data: { resultList: { result: { status: string; result: any } }[] };
        };
        return reply.data.resultList;
    };

    // Dictionaries: one fetch and one global read per comp_id for the whole batch, shared by all
    // chunks. The value is the dictionary text, or undefined if it could not be found.
    const dictionaries = new Map<string, Promise<string | undefined>>();
    const newlyReadCompIds = new Set<string>();
    const readDictionary = async (text: string) => readDictionaryIntoCoot(instance, text, null, "Batch ligand loading");
    // Supplied dictionaries are read first; molecules wait for them before looking anything up,
    // so a comp_id they define is never fetched.
    const suppliedReady = Promise.all(
        (options.dictionaries ?? []).map(async dictionarySource => {
            try {
                const text = await readSource(dictionarySource);
                await readDictionary(text);
                for (const compId of dictionaryCompIds(text)) {
                    dictionaries.set(compId, Promise.resolve(text));
                    newlyReadCompIds.add(compId);
                }
            } catch (err) {
                console.warn("batchLoadLigands: could not read a supplied dictionary", err);
            }
        })
    );
    const getDictionary = (compId: string): Promise<string | undefined> => {
        if (!dictionaries.has(compId)) {
            dictionaries.set(
                compId,
                fetchMonomerDictionary(compId, instance.paths.monomerLibraryPath)
                    .then(async text => {
                        if (text) {
                            await readDictionary(text);
                            newlyReadCompIds.add(compId);
                        }
                        return text;
                    })
                    // Not found, rather than a rejection every later chunk with this type would fail on
                    .catch(err => {
                        console.warn(`batchLoadLigands: could not read the dictionary of ${compId}`, err);
                        return undefined;
                    })
            );
        }
        return dictionaries.get(compId);
    };

    /**
     * Forget molecules that will not be loaded: closed in Coot if it read them (not journaled, as the
     * batch is not), their record and gemmi structure dropped. Else they would stay in Coot unseen.
     */
    const discard = (molecules: MoorhenMolecule[]) =>
        Promise.all(
            molecules.map(molecule =>
                typeof molecule.molNo === "number" && molecule.molNo >= 0 ? molecule.delete(false, false) : molecule.forget()
            )
        );

    /** Worker and network side of a chunk: everything up to having the meshes. */
    const prepareChunk = async (chunk: { index: number; fileName: string; text: string }[]): Promise<ChunkItem[]> => {
        // Every molecule made for this chunk, so that all are discarded if it fails half way
        const created: MoorhenMolecule[] = [];
        try {
            return await prepareChunkMolecules(chunk, created);
        } catch (err) {
            await discard(created).catch(() => undefined);
            throw err;
        }
    };

    const prepareChunkMolecules = async (
        chunk: { index: number; fileName: string; text: string }[],
        created: MoorhenMolecule[]
    ): Promise<ChunkItem[]> => {
        // Parse on the main thread first: the molecule needs this gemmi structure anyway (ligand
        // info, sequences, atoms for picking), as loadToCootFromString does.
        let items: ChunkItem[] = [];
        for (const { index, fileName, text } of chunk) {
            const molecule = new MoorhenMolecule(instance);
            created.push(molecule);
            molecule.setBackgroundColour(backgroundColor);
            molecule.defaultBondOptions.smoothness = defaultBondSmoothness;
            molecule.name = moleculeNameFromFileName(fileName);
            // What the caller knows about this ligand (a score, a rank...), on it from the start
            molecule.metadata = sourceMetadata(sources[index]);
            try {
                await molecule.updateGemmiStructure(text);
                molecule.atomsDirty = false;
            } catch {
                fail(index, fileName, "could not be parsed as coordinates");
                await discard([molecule]);
                continue;
            }
            items.push({ index, fileName, text, molecule, missingCompIds: [] });
        }

        // A: read the coordinates into Coot
        const readResults = await runList([
            { returnType: "status", command: "set_use_gemmi", commandArgs: [useGemmi] },
            ...items.map(item => ({ returnType: "status", command: "read_coords_string", commandArgs: [item.text, item.molecule.name] })),
        ]);
        const unread: MoorhenMolecule[] = [];
        items = items.filter((item, i) => {
            const result = readResults[i + 1];
            const molNo = result?.result?.result?.first;
            if (commandFailed(result) || typeof molNo !== "number" || molNo === -1) {
                fail(item.index, item.fileName, "not a coordinate file Coot can read");
                unread.push(item.molecule);
                return false;
            }
            item.molecule.molNo = molNo;
            item.molecule.coordsFormat = result.result.result.second;
            return true;
        });
        await discard(unread);

        // B: atom count, glycans, missing dictionaries, default colour rules
        const infoResults = await runList(
            items.flatMap(({ molecule }) => [
                { returnType: "int", command: "get_number_of_atoms", commandArgs: [molecule.molNo] },
                { returnType: "boolean", command: "model_has_glycans", commandArgs: [molecule.molNo] },
                { returnType: "string_array", command: "get_residue_names_with_no_dictionary", commandArgs: [molecule.molNo] },
                { returnType: "colour_rules", command: "get_colour_rules", commandArgs: [molecule.molNo] },
            ])
        );
        const empty: MoorhenMolecule[] = [];
        items = items.filter((item, i) => {
            const [atoms, glycans, missing, rules] = infoResults.slice(4 * i, 4 * i + 4);
            const { molecule } = item;
            molecule.atomCount = atoms?.result?.result ?? 0;
            if (molecule.atomCount === 0) {
                fail(item.index, item.fileName, "no atoms found");
                empty.push(molecule);
                return false;
            }
            molecule.hasGlycans = glycans?.result?.result ?? false;
            item.missingCompIds = commandFailed(missing) ? [] : missing.result.result;
            molecule.defaultColourRules = [];
            if (!commandFailed(rules)) {
                for (const rule of rules.result.result as { first: string; second: string }[]) {
                    molecule.addColourRule("chain", rule.first, rule.second);
                }
            }
            return true;
        });

        await discard(empty);

        // Missing dictionaries: fetched and read once per comp_id
        await suppliedReady;
        await Promise.all(items.flatMap(item => item.missingCompIds.map(compId => getDictionary(compId))));
        // Cache on each molecule every dictionary of this batch for its residue types, so sessions save
        // them. Not only the missing ones: a dictionary supplied, or fetched for an earlier chunk, is in
        // Coot already, so Coot does not report it as missing for the molecules after it.
        // Every dictionary first, then all molecules in one go: their records are then written in one
        // store update (they are queued per tick), not one per molecule.
        const compIdsOf = items.map(item => new Set([...item.missingCompIds, ...(item.molecule.ligands ?? []).map(ligand => ligand.resName)]));
        const texts = new Map<string, string | undefined>();
        await Promise.all(
            [...new Set(compIdsOf.flatMap(compIds => [...compIds]))]
                .filter(compId => dictionaries.has(compId))
                .map(async compId => texts.set(compId, await dictionaries.get(compId)))
        );
        items.forEach((item, i) => {
            const found = new Set<string>();
            for (const compId of compIdsOf[i]) {
                const text = texts.get(compId);
                if (text) {
                    item.molecule.cacheLigandDict(text);
                    found.add(compId);
                }
            }
            // Its record's missing dictionaries from what Coot said and what was read since, without asking again
            item.molecule.refreshRecord(item.missingCompIds.filter(compId => !found.has(compId)).sort());
        });

        return items;
    };

    /**
     * Main-thread side of a chunk: draw each molecule as a default bond representation, all at once so
     * the worker queue stays full, then add the chunk to the molecule list in one store update.
     */
    const addChunk = async (chunkItems: ChunkItem[]) => {
        // All settled, not Promise.all: one failing must not leave the others drawing on molecules
        // being discarded. A rejected one is a file that could not be drawn.
        const settled = await Promise.allSettled(
            chunkItems.map(item =>
                // Each one drawn moves the progress bar on, rather than the whole chunk at its end
                MoleculeRepresentation.create({ representationStyle: "CBs", molecule: item.molecule }).finally(() => {
                    drawnInChunk++;
                    reportProgress();
                })
            )
        );
        const representations = settled.map(result => {
            if (result.status === "fulfilled") return result.value;
            console.error(result.reason);
            return undefined;
        });
        const undrawn: MoorhenMolecule[] = [];
        const items = chunkItems.filter((item, i) => {
            item.representation = representations[i];
            if (!item.representation) {
                fail(item.index, item.fileName, "could not create its representation");
                undrawn.push(item.molecule);
            }
            return !!item.representation;
        });
        await discard(undrawn);
        batch(() => {
            // With the chunk, the records and dictionaries held since the last one (see the hold below)
            flushDictionaryRecords(store);
            flushMoleculeRecords(store);
            store.dispatch(addMoleculeList(items.map(item => item.molecule)));
            store.dispatch(addCustomRepresentationList(items.map(item => item.representation)));
            store.dispatch(setRequestDrawScene(true));
        });
        for (const { index, fileName, molecule } of items) {
            loaded.push({ index, entry: { type: "molecule", uniqueID: molecule.uniqueId, molNo: molecule.molNo, fileName } });
        }
    };

    // Progress for the long job notification, cleared however the batch ends
    const showProgress = (done: number, total: number) => store.dispatch(setJobProgress({ label: "Loading ligands", done, total }));
    // Files finished (chunks added, or failed before drawing), and drawn so far in the chunk being added
    let done = 0;
    let drawnInChunk = 0;
    // The progress bar follows each ligand drawn, at most once per frame
    // (a timer where there are no frames, e.g. Node)
    const hasFrames = typeof requestAnimationFrame === "function";
    let progressFrame: ReturnType<typeof setTimeout> | number | null = null;
    const cancelProgress = () => {
        if (progressFrame === null) return;
        if (hasFrames) cancelAnimationFrame(progressFrame as number);
        else clearTimeout(progressFrame as ReturnType<typeof setTimeout>);
        progressFrame = null;
    };
    const reportProgress = () => {
        if (progressFrame !== null) return;
        const update = () => {
            progressFrame = null;
            showProgress(Math.min(done + drawnInChunk, sources.length), sources.length);
        };
        progressFrame = hasFrames ? requestAnimationFrame(update) : setTimeout(update, 16);
    };
    // Batches running at once share the one progress notification: the last to finish clears it
    runningBatches.set(store, (runningBatches.get(store) ?? 0) + 1);
    // Each ligand asks for a redraw, and a frame costs more as they add up: a few frames a second
    // still show the progress. Released (with a last redraw) however the batch ends.
    store.dispatch(setDrawsThrottled(true));
    // The ligand list shows a spinner rather than re-rendering every row for every chunk
    store.dispatch(setLigandBatchLoading(true));
    // Molecule records and dictionaries are written one tick at a time, and each molecule of a chunk
    // and each dictionary is its own tick: written with each chunk instead (one dispatch each)
    holdMoleculeRecords(store, true);
    holdDictionaryRecords(store, true);
    try {
        // Read everything, then work through the chunks as a pipeline
        const names = sources.map(sourceName);
        showProgress(0, sources.length);
        // Busy from start to end (the instance keeps it on while a progress is shown), not per message
        store.dispatch(setBusy(true));
        const texts = await readAll(sources);
        const readable: { index: number; fileName: string; text: string }[] = [];
        texts.forEach((result, index) => {
            if ("error" in result) fail(index, names[index], result.error);
            else readable.push({ index, fileName: names[index], text: result.text });
        });
        const chunks: (typeof readable)[] = [];
        for (let i = 0; i < readable.length; i += Math.max(1, chunkSize)) {
            chunks.push(readable.slice(i, i + Math.max(1, chunkSize)));
        }

        const safePrepare = (chunk: typeof readable) =>
            prepareChunk(chunk).catch(err => {
                console.error(err);
                chunk.forEach(item => fail(item.index, item.fileName, `failed while loading (${err instanceof Error ? err.message : err})`));
                return [] as ChunkItem[];
            });

        // Counted against every source: a file that could not be read is done already
        done = sources.length - readable.length;
        showProgress(done, sources.length);
        // Chunks being prepared, PREPARE_AHEAD of the one being drawn: a chunk's preparation is a few
        // worker round trips in a row (read, info, dictionaries), each queued behind the meshes of the
        // chunk being drawn, so started only one chunk ahead it was not ready when that one was done.
        const prepared: Promise<ChunkItem[]>[] = chunks.slice(0, PREPARE_AHEAD).map(safePrepare);
        for (let k = 0; k < chunks.length; k++) {
            const items = await prepared[k];
            if (k + PREPARE_AHEAD < chunks.length) prepared.push(safePrepare(chunks[k + PREPARE_AHEAD]));
            delete prepared[k];
            try {
                await addChunk(items);
            } catch (err) {
                // Not added: forgotten, as a file that failed earlier is, and the batch goes on
                console.error(err);
                const added = new Set(loaded.map(item => item.index));
                const notAdded = items.filter(item => !added.has(item.index));
                notAdded.forEach(item => fail(item.index, item.fileName, `failed while drawing (${err instanceof Error ? err.message : err})`));
                await discard(notAdded.map(item => item.molecule)).catch(() => undefined);
            }
            done += chunks[k].length;
            drawnInChunk = 0;
            showProgress(done, sources.length);
            onProgress?.(done, sources.length);
        }

        // Molecules loaded before the batch that contain a newly read residue type draw differently now
        await Promise.all(
            moleculesBefore
                .filter(molecule => molecule.ligands?.some(ligand => newlyReadCompIds.has(ligand.resName)))
                .flatMap(molecule => molecule.representations.filter(representation => representation.style === "CBs"))
                .map(representation => representation.redraw())
        );

        loaded.sort((a, b) => a.index - b.index);
        const lastLoaded = loaded.at(-1);
        if (centre && lastLoaded) {
            await instance.getMolecule(lastLoaded.entry.uniqueID)?.centreOn("/*/*/*/*", true);
        }
        if (failed.length > 0) {
            instance.snackbar.enqueueSnackbar({
                message: `${failed.length} of ${sources.length} ligand files could not be loaded`,
                variant: "warning",
            });
        }
        return { loaded: loaded.map(item => item.entry), failed };
    } finally {
        // A frame still to come would show the bar again once it is cleared
        cancelProgress();
        const stillRunning = (runningBatches.get(store) ?? 1) - 1;
        runningBatches.set(store, stillRunning);
        if (stillRunning === 0) {
            store.dispatch(setJobProgress(null));
            store.dispatch(setBusy(commandCentre.activeMessages.length !== 0));
        }
        holdDictionaryRecords(store, false);
        holdMoleculeRecords(store, false);
        store.dispatch(setDrawsThrottled(false));
        store.dispatch(setLigandBatchLoading(false));
    }
};

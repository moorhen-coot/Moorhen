import type { MoorhenInstance } from "@/InstanceManager";
import type { LoadFilesResult } from "@/InstanceManager/MoorhenInstance";
import { addMapList, enqueueSnackbar, setActiveMap, setMapColours, setNegativeMapColours, setPositiveMapColours } from "@/store";
import { MoorhenMap } from "./MoorhenMap";
import { readMTZHeader } from "./mapHeaders";

type RGB = { r: number; g: number; b: number };

/**
 * One map to read from an MTZ file with `MoorhenInstance.files.loadMtz`.
 * @property name - Map name, defaults to `${fileName}-${columns.F}`
 * @property columns - MTZ column labels; `Fobs`, `SigFobs` and `FreeR` are needed for `calcStructFact`
 * @property isDifference - Defaults to false
 * @property calcStructFact - Associate the reflection data with the map (R-factors, map updates).
 * Defaults to true when `Fobs`, `SigFobs` and `FreeR` are all given. If any of them is missing from the file,
 * the map is still loaded, without reflection data, and a warning is shown
 * @property style - Colours (0–1): `colour` for normal maps, `positiveColour`/`negativeColour` for difference maps
 * @property visible - Show the map once loaded, defaults to true
 * @property active - Make this the active map
 */
export type MtzMapRequest = {
    name?: string;
    columns: { F: string; PHI: string; Fobs?: string; SigFobs?: string; FreeR?: string };
    isDifference?: boolean;
    calcStructFact?: boolean;
    style?: { colour?: RGB; positiveColour?: RGB; negativeColour?: RGB };
    visible?: boolean;
    active?: boolean;
};

/**
 * Implementation of `MoorhenInstance.files.loadMtz`: fetch the file once, check the requested columns
 * against its header (only missing F/PHI columns are fatal), then read each map and add them all to the store together.
 */
export const loadMtzMaps = async (
    instance: MoorhenInstance,
    source: string | URL | File,
    requests?: MtzMapRequest[]
): Promise<LoadFilesResult> => {
    let file: File;
    if (source instanceof File) {
        file = source;
    } else {
        const response = await fetch(source);
        if (!response.ok) {
            throw new Error(`Error fetching MTZ file ${source}: ${response.status} ${response.statusText}`);
        }
        const fileName = source.toString().split(/[?#]/)[0].split("/").pop() || "data.mtz";
        file = new File([await response.arrayBuffer()], fileName);
    }

    if (!requests) {
        const newMaps = await instance.execWhenReady(() => MoorhenMap.autoReadMtz(file, instance));
        if (newMaps.length === 0) {
            instance.dispatch(enqueueSnackbar({ message: `Failed to read mtz file ${file.name}`, variant: "warning" }));
            return [];
        }
        instance.dispatch(addMapList(newMaps));
        instance.dispatch(setActiveMap(newMaps[0]));
        return newMaps.map(map => ({ type: "map", uniqueID: map.uniqueId, molNo: map.molNo, fileName: file.name }));
    }

    const data = new Uint8Array(await file.arrayBuffer());
    const header = await readMTZHeader(data);
    if (typeof header === "number") {
        const message = `Error reading ${file.name}, this doesn't look like an MTZ file`;
        instance.dispatch(enqueueSnackbar({ message, variant: "error" }));
        throw new Error(message);
    }

    // Check every column before anything is sent to Coot. F and PHI are needed to make the map; missing
    // reflection columns only mean the map is loaded without reflection data (no R-factors)
    const labels = new Set(header.records.columns.map(column => column.label));
    const available = header.records.columns.map(column => `${column.label} (${column.type})`).join(", ");
    const findMissing = (roles: string[]) =>
        requests.flatMap(request =>
            Object.entries(request.columns)
                .filter(([role, label]) => roles.includes(role) && label && !labels.has(label))
                .map(([role, label]) => `${request.name ?? request.columns.F}: ${role}="${label}"`)
        );
    const missingMapColumns = findMissing(["F", "PHI"]);
    if (missingMapColumns.length > 0) {
        const message = `Missing columns in ${file.name}: ${missingMapColumns.join(", ")}`;
        instance.dispatch(enqueueSnackbar({ message, variant: "error" }));
        throw new Error(`${message}. Available columns: ${available}`);
    }
    const missingReflectionColumns = findMissing(["Fobs", "SigFobs", "FreeR"]);
    if (missingReflectionColumns.length > 0) {
        const message = `Missing columns in ${file.name}: ${missingReflectionColumns.join(", ")}, loading without reflection data`;
        instance.dispatch(enqueueSnackbar({ message, variant: "warning" }));
        console.warn(`${message}. Available columns: ${available}`);
    }
    const hasReflectionColumns = (request: MtzMapRequest) =>
        ["Fobs", "SigFobs", "FreeR"].every(role => labels.has(request.columns[role as "Fobs" | "SigFobs" | "FreeR"]));

    const newMaps = await instance.execWhenReady(async () => {
        const maps: MoorhenMap[] = [];
        for (const request of requests) {
            const selectedColumns = {
                ...request.columns,
                isDifference: request.isDifference ?? false,
                calcStructFact: (request.calcStructFact ?? true) && hasReflectionColumns(request),
            };
            const name = request.name ?? `${file.name.replace(/\.mtz$/i, "")}-${request.columns.F}`;
            const map = await MoorhenMap.loadToCootFromMtzData(data, name, selectedColumns, instance);
            if (selectedColumns.calcStructFact) {
                await map.associateToReflectionData(selectedColumns, data);
            }
            // initialise() has set the default colour, so the requested colours go after it
            const { style } = request;
            if (style?.colour) instance.dispatch(setMapColours({ molNo: map.molNo, rgb: style.colour }));
            if (style?.positiveColour) instance.dispatch(setPositiveMapColours({ molNo: map.molNo, rgb: style.positiveColour }));
            if (style?.negativeColour) instance.dispatch(setNegativeMapColours({ molNo: map.molNo, rgb: style.negativeColour }));
            map.showOnLoad = request.visible ?? true;
            maps.push(map);
        }
        return maps;
    });
    instance.dispatch(addMapList(newMaps));

    // The requested active map wins; otherwise the first map, unless one is already active
    const requestedActive = newMaps.find((_, index) => requests[index].active);
    if (requestedActive || !instance.store.getState().generalStates.activeMap) {
        instance.dispatch(setActiveMap(requestedActive ?? newMaps[0]));
    }

    return newMaps.map(map => ({ type: "map", uniqueID: map.uniqueId, molNo: map.molNo, fileName: file.name }));
};

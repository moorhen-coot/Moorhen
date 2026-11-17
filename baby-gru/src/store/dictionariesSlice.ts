import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { emptyMolecules, removeMolecule, removeMoleculeRecord } from "./moleculesSlice";

/**
 * A ligand dictionary read into Coot: one entry per data_comp_ block. The instance's one list of
 * them (.roadmaps/ligand-dictionaries.md, phase 1), filled by readDictionary (utils/dictionaries.ts)
 * whatever loaded it, and saved in sessions. Deleting the molecule a dictionary came with does not
 * remove it (Coot keeps it too), unless it was read for that molecule only.
 */
export type LoadedDictionary = {
    compId: string;
    /** That block only, as molecule.ligandDicts holds it */
    content: string;
    /** Read for one molecule only (its uniqueId: a molNo changes when a session is reloaded); null for every molecule */
    moleculeUid: string | null;
    /** Where it came from, for display: a file name, "monomer library", "SMILES"... */
    source?: string;
};

/** The key of an entry: the same comp_id may be read for every molecule and for one molecule */
export const dictionaryKey = (dictionary: Pick<LoadedDictionary, "compId" | "moleculeUid">) =>
    `${dictionary.moleculeUid ?? "*"}|${dictionary.compId}`;

const initialState: { loaded: Record<string, LoadedDictionary> } = {
    loaded: {},
};

const dictionariesSlice = createSlice({
    name: "dictionaries",
    initialState,
    reducers: {
        /** Record dictionaries read into Coot. A later one for the same comp_id and scope replaces it, as in Coot. */
        addDictionaries: (state, action: PayloadAction<LoadedDictionary[]>) => {
            action.payload.forEach(dictionary => {
                state.loaded[dictionaryKey(dictionary)] = dictionary;
            });
        },
        /** Forget every dictionary: before a session brings its own */
        emptyDictionaries: () => initialState,
    },
    extraReducers: builder => {
        // A dictionary read for one molecule goes with it; one read for every molecule stays
        builder.addCase(removeMolecule, (state, action) => {
            const uid = action.payload.uniqueId;
            for (const [key, dictionary] of Object.entries(state.loaded)) {
                if (dictionary.moleculeUid === uid) delete state.loaded[key];
            }
        });
        // MoorhenMolecule.delete() dispatches this, for molecules that never were in the list too
        // (temporary fragments for refinement, drags, fitting): each recorded its dictionaries
        // (transferLigandDicts), which would otherwise pile up and be saved in every backup
        builder.addCase(removeMoleculeRecord, (state, action) => {
            for (const [key, dictionary] of Object.entries(state.loaded)) {
                if (dictionary.moleculeUid === action.payload) delete state.loaded[key];
            }
        });
        builder.addCase(emptyMolecules, state => {
            for (const [key, dictionary] of Object.entries(state.loaded)) {
                if (dictionary.moleculeUid !== null) delete state.loaded[key];
            }
        });
    },
});

export const { addDictionaries, emptyDictionaries } = dictionariesSlice.actions;

export default dictionariesSlice.reducer;

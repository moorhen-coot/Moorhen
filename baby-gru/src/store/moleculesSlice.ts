import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { moorhen } from "../types/moorhen";
import { MoorhenMolecule } from "@/utils";

/** A ligand of a molecule, as gemmi lists it (get_ligand_info_for_structure) */
export type MoleculeLigandRecord = {
    resName: string;
    chainName: string;
    resNum: string;
    modelName: string;
    /** e.g. /1/A/301(ATP) */
    cid: string;
};

/**
 * What the UI groups and labels molecules by, as a plain record keyed by the molecule's uniqueId:
 * the first step of .roadmaps/serialisable-store.md. Written only by the molecule itself
 * (MoorhenMolecule.refreshRecord), from its central methods, and only when a field changes; a
 * component never computes these. Fields are added when the UI filters, sorts or groups on them.
 */
export type MoleculeRecord = {
    uniqueId: string;
    /** MoorhenMolecule.isLigandOnly(): listed in the Ligands panel, not given a card in the Models panel */
    isLigandOnly: boolean;
    ligands: MoleculeLigandRecord[];
    /** The ligand residue types Coot has no dictionary for */
    missingDictionaries: string[];
};

const initialState: {
    visibleMolecules: number[];
    moleculeRecords: Record<string, MoleculeRecord>;
    moleculeList: MoorhenMolecule[];
    customRepresentations: moorhen.MoleculeRepresentation[];
    generalRepresentations: moorhen.MoleculeRepresentation[];
} = {
    visibleMolecules: [],
    moleculeRecords: {},
    customRepresentations: [],
    generalRepresentations: [],
    moleculeList: [],
};

const moleculesSlice = createSlice({
    name: "molecules",
    initialState: initialState,
    reducers: {
        addMolecule: (state, action: PayloadAction<MoorhenMolecule>) => {
            state.moleculeList.push(action.payload as unknown as typeof state.moleculeList[number]);
            if (!state.visibleMolecules.includes(action.payload.molNo)) {
                state.visibleMolecules.push(action.payload.molNo);
            }
        },
        removeMolecule: (state, action: PayloadAction<MoorhenMolecule>) => {
            state.generalRepresentations = state.generalRepresentations.filter(
                item => item.parentMolecule.molNo !== action.payload.molNo
            );
            state.customRepresentations = state.customRepresentations.filter(
                item => item.parentMolecule.molNo !== action.payload.molNo
            );
            state.visibleMolecules = state.visibleMolecules.filter(item => item !== action.payload.molNo);
            state.moleculeList = state.moleculeList.filter(item => item.molNo !== action.payload.molNo);
            delete state.moleculeRecords[action.payload.uniqueId];
        },
        emptyMolecules: () => {
            return initialState;
        },
        /** Set molecule records (several at once: a batch of ligands refreshes many) */
        setMoleculeRecords: (state, action: PayloadAction<MoleculeRecord[]>) => {
            action.payload.forEach(record => {
                state.moleculeRecords[record.uniqueId] = record;
            });
        },
        removeMoleculeRecord: (state, action: PayloadAction<string>) => {
            delete state.moleculeRecords[action.payload];
        },
        addMoleculeList: (state, action: PayloadAction<MoorhenMolecule[]>) => {
            state.moleculeList.push(...(action.payload as unknown as typeof state.moleculeList));
            action.payload.forEach(molecule => {
                if (!state.visibleMolecules.includes(molecule.molNo)) {
                    state.visibleMolecules.push(molecule.molNo);
                }
            });
        },
        /**
         * Show or hide many molecules in one dispatch (by molNo): each dispatch runs every selector,
         * and in development walks the whole store, so per-molecule dispatches make group actions
         * over a thousand ligands crawl.
         */
        setMoleculesVisible: (state, action: PayloadAction<{ molNos: number[]; visible: boolean }>) => {
            const { molNos, visible } = action.payload;
            if (visible) {
                const shown = new Set(state.visibleMolecules);
                molNos.forEach(molNo => {
                    if (!shown.has(molNo)) state.visibleMolecules.push(molNo);
                });
            } else {
                const hidden = new Set(molNos);
                state.visibleMolecules = state.visibleMolecules.filter(molNo => !hidden.has(molNo));
            }
        },
        showMolecule: (state, action: PayloadAction<MoorhenMolecule>) => {
            if (!state.visibleMolecules.includes(action.payload.molNo)) {
                state.visibleMolecules.push(action.payload.molNo);
            }
        },
        hideMolecule: (state, action: PayloadAction<MoorhenMolecule>) => {
            state.visibleMolecules = state.visibleMolecules.filter(item => item !== action.payload.molNo);
        },
        addCustomRepresentation: (state, action: PayloadAction<moorhen.MoleculeRepresentation>) => {
            state.customRepresentations.push(action.payload as unknown as typeof state.customRepresentations[number]);
        },
        removeCustomRepresentation: (state, action: PayloadAction<moorhen.MoleculeRepresentation>) => {
            state.customRepresentations = state.customRepresentations.filter(item => item.uniqueId !== action.payload.uniqueId);
        },
        addGeneralRepresentation: (state, action: PayloadAction<moorhen.MoleculeRepresentation>) => {
            if (
                !action.payload.isCustom &&
                (action.payload.style === "CAs" ||
                    action.payload.style === "CBs" ||
                    action.payload.style === "CRs" ||
                    action.payload.style === "MolecularSurface" ||
                    action.payload.style === "gaussian" ||
                    action.payload.style === "VdwSpheres" ||
                    action.payload.style === "ligands" ||
                    action.payload.style === "MetaBalls" ||
                    action.payload.style === "allHBonds")
            ) {
                if (
                    state.customRepresentations &&
                    !state.customRepresentations.some(
                        item =>
                            item.uniqueId === action.payload.uniqueId &&
                            item.parentMolecule.molNo === action.payload.parentMolecule.molNo
                    )
                ) {
                    if (action.payload.cid === "/*/*/*/*") {
                        action.payload.cid = "/*/*/*/*:*";
                        action.payload.interfaceOption.selectionType = "molecule";
                    } /* convert to better cid that recognise alt conformation */
                    state.customRepresentations.push(action.payload as unknown as typeof state.customRepresentations[number]);
                }
            } else {
                state.generalRepresentations.push(action.payload as unknown as typeof state.generalRepresentations[number]);
            }
        },
        removeGeneralRepresentation: (state, action: PayloadAction<moorhen.MoleculeRepresentation>) => {
            if (
                action.payload.style === "CAs" ||
                action.payload.style === "CBs" ||
                action.payload.style === "CRs" ||
                action.payload.style === "MolecularSurface" ||
                action.payload.style === "gaussian" ||
                action.payload.style === "VdwSpheres" ||
                action.payload.style === "ligands" ||
                action.payload.style === "allHBonds"
            ) {
                state.customRepresentations = state.customRepresentations.filter(item => item.uniqueId !== action.payload.uniqueId);
            } else {
                state.generalRepresentations = state.generalRepresentations.filter(item => item.uniqueId !== action.payload.uniqueId);
            }
        },
    },
});

export const {
    addMolecule,
    removeMolecule,
    emptyMolecules,
    addMoleculeList,
    setMoleculeRecords,
    removeMoleculeRecord,
    addGeneralRepresentation,
    setMoleculesVisible,
    showMolecule,
    hideMolecule,
    addCustomRepresentation,
    removeCustomRepresentation,
    removeGeneralRepresentation,
} = moleculesSlice.actions;

export default moleculesSlice.reducer;

import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { moorhen } from "../types/moorhen";

const initialState: {
    visibleMolecules: number[];
    moleculeList: moorhen.Molecule[];
    customRepresentations: moorhen.MoleculeRepresentation[];
    generalRepresentations: moorhen.MoleculeRepresentation[];
} = {
    visibleMolecules: [],
    customRepresentations: [],
    generalRepresentations: [],
    moleculeList: [],
};

export const moleculesSlice = createSlice({
    name: "molecules",
    initialState: initialState,
    reducers: {
        addMolecule: (state, action: PayloadAction<moorhen.Molecule>) => {
            state = { ...state, moleculeList: [...state.moleculeList, action.payload] };
            return state;
        },
        removeMolecule: (state, action: PayloadAction<moorhen.Molecule>) => {
            state = {
                ...state,
                generalRepresentations: state.generalRepresentations.filter(item => item.parentMolecule.molNo !== action.payload.molNo),
                customRepresentations: state.customRepresentations.filter(item => item.parentMolecule.molNo !== action.payload.molNo),
                visibleMolecules: state.visibleMolecules.filter(item => item !== action.payload.molNo),
                moleculeList: state.moleculeList.filter(item => item.molNo !== action.payload.molNo),
            };
            return state;
        },
        emptyMolecules: () => {
            return initialState;
        },
        addMoleculeList: (state, action: PayloadAction<moorhen.Molecule[]>) => {
            state = { ...state, moleculeList: [...state.moleculeList, ...action.payload] };
            return state;
        },
        showMolecule: (state, action: PayloadAction<moorhen.Molecule>) => {
            if (!state.visibleMolecules.includes(action.payload.molNo)) {
                state = { ...state, visibleMolecules: [...state.visibleMolecules, action.payload.molNo] };
            }
            return state;
        },
        hideMolecule: (state, action: PayloadAction<moorhen.Molecule>) => {
            state = {
                ...state,
                visibleMolecules: state.visibleMolecules.filter(item => item !== action.payload.molNo),
            };
            return state;
        },
        addCustomRepresentation: (state, action: PayloadAction<moorhen.MoleculeRepresentation>) => {
            state = { ...state, customRepresentations: [...state.customRepresentations, action.payload] };
            return state;
        },
        removeCustomRepresentation: (state, action: PayloadAction<moorhen.MoleculeRepresentation>) => {
            state = {
                ...state,
                customRepresentations: state.customRepresentations.filter(item => item.uniqueId !== action.payload.uniqueId),
            };
            return state;
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
                    action.payload.style === "ligands")
            ) {
                if (
                    state.customRepresentations &&
                    !state.customRepresentations.some(
                        item => item.style === action.payload.style && item.parentMolecule === action.payload.parentMolecule
                    )
                ) {
                    if (action.payload.cid === "/*/*/*/*") {
                        action.payload.cid = "//*//:*";
                    } /* convert to better cid that recognise secondary conformation */
                    state = { ...state, customRepresentations: [...state.customRepresentations, action.payload] };
                }
            } else {
                state = { ...state, generalRepresentations: [...state.generalRepresentations, action.payload] };
            }
            return state;
        },
        removeGeneralRepresentation: (state, action: PayloadAction<moorhen.MoleculeRepresentation>) => {
            if (
                action.payload.style === "CAs" ||
                action.payload.style === "CBs" ||
                action.payload.style === "CRs" ||
                action.payload.style === "MolecularSurface" ||
                action.payload.style === "gaussian" ||
                action.payload.style === "VdwSpheres" ||
                action.payload.style === "ligands"
            ) {
                state = {
                    ...state,
                    customRepresentations: state.customRepresentations.filter(item => item.uniqueId !== action.payload.uniqueId),
                };
            }
            state = {
                ...state,
                generalRepresentations: state.generalRepresentations.filter(item => item.uniqueId !== action.payload.uniqueId),
            };
            return state;
        },
    },
});

export const {
    addMolecule,
    removeMolecule,
    emptyMolecules,
    addMoleculeList,
    addGeneralRepresentation,
    showMolecule,
    hideMolecule,
    addCustomRepresentation,
    removeCustomRepresentation,
    removeGeneralRepresentation,
} = moleculesSlice.actions;

export default moleculesSlice.reducer;

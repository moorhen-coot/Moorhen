import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { moorhen } from "../types/moorhen";
import { MoorhenMolecule } from "@/utils";

const initialState: {
    visibleMolecules: number[];
    moleculeList: MoorhenMolecule[];
    customRepresentations: moorhen.MoleculeRepresentation[];
    generalRepresentations: moorhen.MoleculeRepresentation[];
} = {
    visibleMolecules: [],
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
        },
        emptyMolecules: () => {
            return initialState;
        },
        addMoleculeList: (state, action: PayloadAction<MoorhenMolecule[]>) => {
            state.moleculeList.push(...(action.payload as unknown as typeof state.moleculeList));
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
    addGeneralRepresentation,
    showMolecule,
    hideMolecule,
    addCustomRepresentation,
    removeCustomRepresentation,
    removeGeneralRepresentation,
} = moleculesSlice.actions;

export default moleculesSlice.reducer;

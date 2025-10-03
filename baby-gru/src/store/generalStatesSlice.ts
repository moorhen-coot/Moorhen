import { createSlice } from '@reduxjs/toolkit';
import { moorhen } from '../types/moorhen';
import { MoorhenMap } from '../utils/MoorhenMap';
import { MoorhenMolecule } from '../utils/MoorhenMolecule';

export type ResidueSelection = {
    molecule: null | MoorhenMolecule;
    first: null | string;
    second: null | string;
    cid: null | string | string[];
    isMultiCid: boolean;
    label: string;
};

const initialState: {
    devMode: boolean;
    useGemmi: boolean;
    userPreferencesMounted: boolean;
    appTitle: string;
    cootInitialized: boolean;
    activeMap: MoorhenMap;
    theme: string;
    residueSelection: ResidueSelection;
    isShowingTomograms: boolean;
    isAnimatingTrajectory: boolean;
    isChangingRotamers: boolean;
    isDraggingAtoms: boolean;
    isRotatingAtoms: boolean;
    newCootCommandExit: boolean;
    newCootCommandStart: boolean;
    useRamaRefinementRestraints: boolean;
    useTorsionRefinementRestraints: false;
    showResidueSelection: boolean;
    defaultExpandDisplayCards: boolean;
    transparentModalsOnMouseOut: boolean;
    showHoverInfo: boolean;
    viewOnly: boolean;
    allowScripting: boolean;
    allowAddNewFittedLigand: boolean;
    allowMergeFittedLigand: boolean;
    disableFileUpload: boolean;
} = {
    devMode: null,
    useGemmi: null,
    userPreferencesMounted: false,
    appTitle: 'Moorhen',
    cootInitialized: false,
    activeMap: null,
    theme: 'flatly',

    showHoverInfo: true,
    residueSelection: {
        molecule: null,
        first: null,
        second: null,
        cid: null,
        isMultiCid: false,
        label: null,
    } as moorhen.ResidueSelection,
    showResidueSelection: false,
    defaultExpandDisplayCards: null,
    transparentModalsOnMouseOut: null,
    isShowingTomograms: false,
    isAnimatingTrajectory: false,
    isChangingRotamers: false,
    isDraggingAtoms: false,
    isRotatingAtoms: false,
    newCootCommandExit: false,
    newCootCommandStart: false,
    useRamaRefinementRestraints: false,
    useTorsionRefinementRestraints: false,
    viewOnly: false,
    allowScripting: false,
    allowAddNewFittedLigand: false,
    allowMergeFittedLigand: false,
    disableFileUpload: false,
};

export const generalStatesSlice = createSlice({
    name: 'generalStates',
    initialState: initialState,
    reducers: {
        resetGeneralStates: () => {
            return initialState;
        },
        setIsShowingTomograms: (state, action: { payload: boolean; type: string }) => {
            return { ...state, isShowingTomograms: action.payload };
        },
        setIsAnimatingTrajectory: (state, action: { payload: boolean; type: string }) => {
            return { ...state, isAnimatingTrajectory: action.payload };
        },
        setShowResidueSelection: (state, action: { payload: boolean; type: string }) => {
            return { ...state, showResidueSelection: action.payload };
        },
        toggleCootCommandStart: state => {
            return { ...state, newCootCommandStart: !state.newCootCommandStart };
        },
        toggleCootCommandExit: state => {
            return { ...state, newCootCommandExit: !state.newCootCommandExit };
        },
        setIsChangingRotamers: (state, action: { payload: boolean; type: string }) => {
            return { ...state, isChangingRotamers: action.payload };
        },
        setIsDraggingAtoms: (state, action: { payload: boolean; type: string }) => {
            return { ...state, isDraggingAtoms: action.payload };
        },
        setIsRotatingAtoms: (state, action: { payload: boolean; type: string }) => {
            return { ...state, isRotatingAtoms: action.payload };
        },
        setTheme: (state, action: { payload: string; type: string }) => {
            return { ...state, theme: action.payload };
        },
        setViewOnly: (state, action: { payload: boolean; type: string }) => {
            return { ...state, viewOnly: action.payload };
        },
        setShowHoverInfo: (state, action: { payload: boolean; type: string }) => {
            return { ...state, showHoverInfo: action.payload };
        },
        setActiveMap: (state, action: { payload: MoorhenMap; type: string }) => {
            return { ...state, activeMap: action.payload };
        },
        setCootInitialized: (state, action: { payload: boolean; type: string }) => {
            return { ...state, cootInitialized: action.payload };
        },
        setAppTittle: (state, action: { payload: string; type: string }) => {
            return { ...state, appTitle: action.payload };
        },
        setUserPreferencesMounted: (state, action: { payload: boolean; type: string }) => {
            return { ...state, userPreferencesMounted: action.payload };
        },
        setDevMode: (state, action: { payload: boolean; type: string }) => {
            return { ...state, devMode: action.payload };
        },
        setUseGemmi: (state, action: { payload: boolean; type: string }) => {
            return { ...state, useGemmi: action.payload };
        },
        clearResidueSelection: state => {
            return {
                ...state,
                residueSelection: {
                    molecule: null,
                    first: null,
                    second: null,
                    cid: null,
                    isMultiCid: false,
                    label: null,
                },
            };
        },
        setResidueSelection: (state, action: { payload: moorhen.ResidueSelection; type: string }) => {
            return { ...state, residueSelection: action.payload };
        },
        setMoleculeResidueSelection: (state, action: { payload: MoorhenMolecule; type: string }) => {
            const newResidueSelection = { ...state.residueSelection, molecule: action.payload };
            return { ...state, residueSelection: newResidueSelection };
        },
        setStopResidueSelection: (state, action: { payload: string; type: string }) => {
            const newResidueSelection = { ...state.residueSelection, stop: action.payload };
            return { ...state, residueSelection: newResidueSelection };
        },
        setStartResidueSelection: (state, action: { payload: string; type: string }) => {
            const newResidueSelection = { ...state.residueSelection, start: action.payload };
            return { ...state, residueSelection: newResidueSelection };
        },
        setCidResidueSelection: (state, action: { payload: string; type: string }) => {
            const newResidueSelection = { ...state.residueSelection, cid: action.payload };
            return { ...state, residueSelection: newResidueSelection };
        },
        setDefaultExpandDisplayCards: (state, action: { payload: boolean; type: string }) => {
            return { ...state, defaultExpandDisplayCards: action.payload };
        },
        setTransparentModalsOnMouseOut: (state, action: { payload: boolean; type: string }) => {
            return { ...state, transparentModalsOnMouseOut: action.payload };
        },
        setAllowScripting: (state, action: { payload: boolean; type: string }) => {
            return { ...state, allowScripting: action.payload };
        },
        setAllowAddNewFittedLigand: (state, action: { payload: boolean; type: string }) => {
            return { ...state, allowAddNewFittedLigand: action.payload };
        },
        setAllowMergeFittedLigand: (state, action: { payload: boolean; type: string }) => {
            return { ...state, allowMergeFittedLigand: action.payload };
        },
        setDisableFileUpload: (state, action: { payload: boolean; type: string }) => {
            return { ...state, disableFileUpload: action.payload };
        },
    },
});

export const {
    setActiveMap,
    setViewOnly,
    setTheme,
    setIsDraggingAtoms,
    setAppTittle,
    setUserPreferencesMounted,
    setDevMode,
    setCootInitialized,
    setStopResidueSelection,
    setStartResidueSelection,
    clearResidueSelection,
    setMoleculeResidueSelection,
    setResidueSelection,
    setCidResidueSelection,
    setIsRotatingAtoms,
    setIsChangingRotamers,
    setShowResidueSelection,
    toggleCootCommandExit,
    toggleCootCommandStart,
    setIsAnimatingTrajectory,
    resetGeneralStates,
    setIsShowingTomograms,
    setDefaultExpandDisplayCards,
    setTransparentModalsOnMouseOut,
    setUseGemmi,
    setShowHoverInfo,
    setAllowScripting,
    setAllowAddNewFittedLigand,
    setAllowMergeFittedLigand,
    setDisableFileUpload,
} = generalStatesSlice.actions;

export default generalStatesSlice.reducer;

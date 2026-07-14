import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { MoorhenMap } from "../utils/MoorhenMap";
import { MoorhenMolecule } from "../utils/MoorhenMolecule";

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
    defaultMoleculeRepresentation:  "CAs" | "CBs" | "CRs"
} = {
    devMode: null,
    useGemmi: true,
    userPreferencesMounted: false,
    appTitle: "Moorhen",
    cootInitialized: false,
    activeMap: null,
    theme: "flatly",

    showHoverInfo: true,
    residueSelection: {
        molecule: null,
        first: null,
        second: null,
        cid: null,
        isMultiCid: false,
        label: null,
    } as ResidueSelection,
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
    defaultMoleculeRepresentation: "CRs"
};

const generalStatesSlice = createSlice({
    name: "generalStates",
    initialState: initialState,
    reducers: {
        resetGeneralStates: () => {
            return initialState;
        },
        setIsShowingTomograms: (state, action: PayloadAction<boolean>) => {
            state.isShowingTomograms = action.payload;
        },
        setIsAnimatingTrajectory: (state, action: PayloadAction<boolean>) => {
            state.isAnimatingTrajectory = action.payload;
        },
        // API generalOptions
        setShowResidueSelection: (state, action: PayloadAction<boolean>) => {
            state.showResidueSelection = action.payload;
        },
        toggleCootCommandStart: state => {
            state.newCootCommandStart = !state.newCootCommandStart;
        },
        toggleCootCommandExit: state => {
            state.newCootCommandExit = !state.newCootCommandExit;
        },
        setIsChangingRotamers: (state, action: PayloadAction<boolean>) => {
            state.isChangingRotamers = action.payload;
        },
        setIsDraggingAtoms: (state, action: PayloadAction<boolean>) => {
            state.isDraggingAtoms = action.payload;
        },
        setIsRotatingAtoms: (state, action: PayloadAction<boolean>) => {
            state.isRotatingAtoms = action.payload;
        },
        setTheme: (state, action: PayloadAction<string>) => {
            state.theme = action.payload;
        },
        // API generalOptions
        /* Set the view-only mode of the application. In view-only mode, users can interact with the visualisation but cannot make any modifications to the loaded structures or maps.*/
        setViewOnly: (state, action: PayloadAction<boolean>) => {
            state.viewOnly = action.payload;
        },
        // API globalUI
        setShowHoverInfo: (state, action: PayloadAction<boolean>) => {
            state.showHoverInfo = action.payload;
        },
        // API maps
        setActiveMap: (state, action: PayloadAction<MoorhenMap>) => {
            state.activeMap = action.payload as unknown as typeof state.activeMap;
        },
        setCootInitialized: (state, action: PayloadAction<boolean>) => {
            state.cootInitialized = action.payload;
        },
        setAppTittle: (state, action: PayloadAction<string>) => {
            state.appTitle = action.payload;
        },
        setUserPreferencesMounted: (state, action: PayloadAction<boolean>) => {
            state.userPreferencesMounted = action.payload;
        },
        // API globalUI
        /* Show dev menu and extra tools */
        setDevMode: (state, action: PayloadAction<boolean>) => {
            state.devMode = action.payload;
        },
        // API  generalOptions
        setUseGemmi: (state, action: PayloadAction<boolean>) => {
            state.useGemmi = action.payload;
        },
        clearResidueSelection: state => {
            state.residueSelection = {
                molecule: null,
                first: null,
                second: null,
                cid: null,
                isMultiCid: false,
                label: null,
            };
        },
        setResidueSelection: (state, action: PayloadAction<ResidueSelection>) => {
            state.residueSelection = action.payload as unknown as typeof state.residueSelection; 
        },
        setMoleculeResidueSelection: (state, action: PayloadAction<MoorhenMolecule>) => {
            state.residueSelection.molecule = action.payload as unknown as typeof state.residueSelection.molecule;
        },
        setStopResidueSelection: (state, action: PayloadAction<string>) => {
            state.residueSelection.second = action.payload;
        },
        setStartResidueSelection: (state, action: PayloadAction<string>) => {
            state.residueSelection.first = action.payload;
        },
        setCidResidueSelection: (state, action: PayloadAction<string>) => {
            state.residueSelection.cid = action.payload;
        },
        setDefaultExpandDisplayCards: (state, action: PayloadAction<boolean>) => {
            state.defaultExpandDisplayCards = action.payload;
        },
        setTransparentModalsOnMouseOut: (state, action: PayloadAction<boolean>) => {
            state.transparentModalsOnMouseOut = action.payload;
        },
        setAllowScripting: (state, action: PayloadAction<boolean>) => {
            state.allowScripting = action.payload;
        },
        setAllowAddNewFittedLigand: (state, action: PayloadAction<boolean>) => {
            state.allowAddNewFittedLigand = action.payload;
        },
        setAllowMergeFittedLigand: (state, action: PayloadAction<boolean>) => {
            state.allowMergeFittedLigand = action.payload;
        },
        // API  generalOptions
        /* disable file upload through the interface, API call still works normally */
        setDisableFileUpload: (state, action: PayloadAction<boolean>) => {
            state.disableFileUpload = action.payload;
        },
        setDefaultMoleculeRepresentation: (state, action: PayloadAction<typeof initialState.defaultMoleculeRepresentation>) => {
            state.defaultMoleculeRepresentation = action.payload;
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
    setDefaultMoleculeRepresentation,
} = generalStatesSlice.actions;

export default generalStatesSlice.reducer;

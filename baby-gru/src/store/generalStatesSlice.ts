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
    selectedThreeDObjectId: string | null;
    /** Which 2D overlay object is showing its handles, or none. Like selectedThreeDObjectId. */
    selected2DObjectId: string | null;
    /** The map representation whose 2D slice shows manipulation handles (its id), or none */
    movingMapSlice: string | null;
    /**
     * Per map uid, the representation its card's controls, the scroll wheel and the keyboard act on (its id). A map
     * absent here, or whose id is gone, uses its first representation (selectSelectedMapRepresentation).
     */
    selectedMapRepresentations: Record<string, string>;
    /** The maps (uids) whose card shows its representations card even with a single one (Draw Settings toggle) */
    multiRepresentationMaps: string[];
    isShowingTomograms: boolean;
    /** Progress of a long task that reports it (e.g. files.batchLoadLigands), shown by the long job notification */
    jobProgress: { label: string; done: number; total: number } | null;
    /** How many files.batchLoadLigands are running: the ligand list waits for them to end before rendering its rows */
    ligandBatchLoads: number;
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
    /** @deprecated Read by nothing: the Fit ligand modal always offers to save a pose as a new molecule. */
    allowAddNewFittedLigand: boolean;
    /** @deprecated Read by nothing: the Fit ligand modal no longer merges a pose into the model. */
    allowMergeFittedLigand: boolean;
    disableFileUpload: boolean;
} = {
    devMode: null,
    useGemmi: true,
    userPreferencesMounted: false,
    appTitle: "Moorhen",
    cootInitialized: false,
    activeMap: null,
    theme: "flatly",

    showHoverInfo: true,
    selectedThreeDObjectId: null,
    selected2DObjectId: null,
    movingMapSlice: null,
    selectedMapRepresentations: {},
    multiRepresentationMaps: [],
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
    jobProgress: null,
    ligandBatchLoads: 0,
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
        // API globalUI
        setJobProgress: (state, action: PayloadAction<{ label: string; done: number; total: number } | null>) => {
            state.jobProgress = action.payload;
        },
        /** true when a ligand batch load starts, false when it ends (however it ends) */
        setLigandBatchLoading: (state, action: PayloadAction<boolean>) => {
            state.ligandBatchLoads = Math.max(0, state.ligandBatchLoads + (action.payload ? 1 : -1));
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
        /**
         * Which 3D object is showing manipulation handles, or none.
         *
         * Here rather than in the objects themselves: it is a property of what the interface is
         * doing, not of the object, and has no business being saved into a session.
         */
        setSelectedThreeDObject: (state, action: PayloadAction<string | null>) => {
            state.selectedThreeDObjectId = action.payload;
            // One thing has handles at a time.
            if (action.payload !== null) state.movingMapSlice = null;
        },
        /**
         * Which map representation's 2D slice is showing manipulation handles (its id), or none: as
         * setSelectedThreeDObject for a 3D object, and the two take turns.
         */
        setMovingMapSlice: (state, action: PayloadAction<string | null>) => {
            state.movingMapSlice = action.payload;
            if (action.payload !== null) state.selectedThreeDObjectId = null;
        },
        /** The representation of a map its card's controls act on */
        setSelectedMapRepresentation: (state, action: PayloadAction<{ mapUid: string; id: string }>) => {
            state.selectedMapRepresentations = { ...state.selectedMapRepresentations, [action.payload.mapUid]: action.payload.id };
        },
        /** Show a map's representations card in its card even with a single representation (or stop) */
        setMapMultiRepresentation: (state, action: PayloadAction<{ mapUid: string; on: boolean }>) => {
            const others = state.multiRepresentationMaps.filter(uid => uid !== action.payload.mapUid);
            state.multiRepresentationMaps = action.payload.on ? [...others, action.payload.mapUid] : others;
        },
        /** Which 2D overlay object is showing its handles, or none. */
        setSelected2DObject: (state, action: PayloadAction<string | null>) => {
            state.selected2DObjectId = action.payload;
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
        /** @deprecated No effect (see allowAddNewFittedLigand); kept so hosts that call it still compile. */
        setAllowAddNewFittedLigand: (state, action: PayloadAction<boolean>) => {
            state.allowAddNewFittedLigand = action.payload;
        },
        /** @deprecated No effect (see allowMergeFittedLigand); kept so hosts that call it still compile. */
        setAllowMergeFittedLigand: (state, action: PayloadAction<boolean>) => {
            state.allowMergeFittedLigand = action.payload;
        },
        // API  generalOptions
        /* disable file upload through the interface, API call still works normally */
        setDisableFileUpload: (state, action: PayloadAction<boolean>) => {
            state.disableFileUpload = action.payload;
        },
    },
});

export const {
    setSelectedThreeDObject,
    setSelected2DObject,
    setMovingMapSlice,
    setActiveMap,
    setSelectedMapRepresentation,
    setMapMultiRepresentation,
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
    setJobProgress,
    setLigandBatchLoading,
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

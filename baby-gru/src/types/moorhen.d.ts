import React from 'react';
import { libcootApi } from './libcoot';

/**
 * @deprecated This declarations file and the ambient `moorhen` namespace are deprecated and will be removed.
 *
 * Inside the moorhen package:
 * - Prefer creating/defining types locally and importing them directly from their source modules (utils, store, etc.).
 * - Avoid referencing types through the ambient `moorhen` namespace.
 *
 * Outside the moorhen package (when using `moorhen` as a module):
 * - Import the needed types explicitly from the package entry:
 *   import type { Molecule, Map, CommandCentre } from 'moorhen';
 * - Or import the whole module namespace and reference types from it:
 *   import type * as Moorhen from 'moorhen';
 *   const f = (m: Moorhen.Molecule, map: Moorhen.Map) => {};
 *
 *
 * @example Outside the moorhen package — specific imports
 * import type { Molecule, Map } from 'moorhen';
 * const fit = (mol: Molecule, map: Map) => {
 *   // ...
 * };
 *
 * @example Outside the moorhen package — module namespace
 * import Moorhen from 'moorhen';
 * const draw = (mol: Moorhen.Molecule) => {
 *   // ...
 * };
 *
 * Examples:
 * @example Inside the moorhen package
 * import type { Molecule } from '../utils/MoorhenMolecule';
 * import type { Map } from '../utils/MoorhenMap';
 * const fit = (mol: Molecule, map: Map) => {
 *   // ...
 * };
 */
export namespace moorhen {
    type Molecule = import('../utils/MoorhenMolecule').MoorhenMolecule;
    type Map = import('../utils/MoorhenMap').MoorhenMap;
    type CommandCentre = import('../InstanceManager/CommandCentre').CommandCentre;
    type MoleculeRepresentation = import('../utils/MoorhenMoleculeRepresentation').MoleculeRepresentation;
    type State = import('../store/MoorhenReduxStore').RootState;
    type HoveredAtom = import('../store/hoveringStatesSlice').HoveredAtom;
    type PreferencesValues = import('../components/managers/preferences').PreferencesValues;
    type Sequence = import('../utils/MoorhenMolecule').Sequence;
    type ResidueInfo = import('../utils/MoorhenMolecule').ResidueInfo;
    type LigandInfo = import('../utils/MoorhenMolecule').LigandInfo;
    type TimeCapsule = import('../utils/MoorhenTimeCapsule').MoorhenTimeCapsule;
    type backupKey = import('../utils/MoorhenTimeCapsule').backupKey;
    type backupSession = import('../utils/MoorhenTimeCapsule').backupSession;
    type Preferences = import('../components/managers/preferences').Preferences;
    type HistoryEntry = import('../utils/MoorhenHistory').HistoryEntry;
    type moleculeSessionData = import('../utils/MoorhenTimeCapsule').moleculeSessionData;
    type mapDataSession = import('../utils/MoorhenTimeCapsule').mapDataSession;
    type viewDataSession = import('../utils/MoorhenTimeCapsule').viewDataSession;
    type Shortcut = import('../components/managers/preferences/DefaultShortcuts').Shortcut;
    type actionButtonSettings = import('../components/context-menu/MoorhenContextMenu').ActionButtonSettings;
    type LocalStorageInstance = import('../components/managers/preferences/MoorhenPreferences').LocalStorageInstance;
    type WorkerResponse<T = any> = import('../InstanceManager/CommandCentre').WorkerResponse;
    type cootCommandKwargs = import('../InstanceManager/CommandCentre').cootCommandKwargs;
    type ResidueSelection = import('../store/generalStatesSlice').ResidueSelection;

    //type ContextButtonProps = import("../components/ContextButton").ContextButtonProps;

    type ResidueSpec = {
        mol_name: string;
        mol_no: string;
        chain_id: string;
        res_no: number;
        res_name: string;
        atom_name: string;
        ins_code: string;
        alt_conf: string;
        cid: string;
    };

    type AtomInfo = {
        x: number;
        y: number;
        z: number;
        charge: number;
        element: string;
        tempFactor: number;
        serial: number;
        occupancy: number;
        name: string;
        has_altloc: boolean;
        alt_loc?: string;
        mol_name: string;
        chain_id: string;
        res_no: string;
        res_name: string;
    };

    type DisplayObject = {
        symmetryMatrices: any;
        updateSymmetryAtoms(): void;
        changeColourWithSymmetry: boolean;
        atoms: any[];
        origin: number[];
        [attr: string]: any;
    };

    type cootBondOptions = {
        smoothness: number;
        width: number;
        atomRadiusBondRatio: number;
        showAniso: boolean;
        showOrtep: boolean;
        showHs: boolean;
    };

    type gaussianSurfSettings = {
        sigma: number;
        countourLevel: number;
        boxRadius: number;
        gridScale: number;
        bFactor: number;
    };

    type m2tParameters = {
        ribbonStyleCoilThickness: number;
        ribbonStyleHelixWidth: number;
        ribbonStyleStrandWidth: number;
        ribbonStyleArrowWidth: number;
        ribbonStyleDNARNAWidth: number;
        ribbonStyleAxialSampling: number;
        cylindersStyleAngularSampling: number;
        cylindersStyleCylinderRadius: number;
        cylindersStyleBallRadius: number;
        surfaceStyleProbeRadius: number;
        ballsStyleRadiusMultiplier: number;
        nucleotideRibbonStyle: 'StickBases' | 'DishyBases';
        dishStyleAngularSampling: number;
        ssUsageScheme: number;
    };

    type residueEnvironmentOptions = {
        maxDist: number;
        backgroundRepresentation: RepresentationStyles;
        focusRepresentation: RepresentationStyles;
        labelled: boolean;
        showHBonds: boolean;
        showContacts: boolean;
    };

    type ColourRuleObject = {
        cid: string;
        color: string;
        applyColourToNonCarbonAtoms: boolean;
        isMultiColourRule: boolean;
        ruleType: string;
        args: (string | number)[];
        label: string;
        uniqueId: string;
        parentMoleculeMolNo: number;
        parentRepresentationUniqueId: string;
    };

    type ColourRule = import('../utils/MoorhenColourRule').ColourRule;

    type coorFormats = 'pdb' | 'mmcif' | 'unk' | 'mmjson' | 'xml';

    type lskqbResidueRangeMatch = {
        refChainId: string;
        movChainId: string;
        refResidueRange: [number, number];
        movResidueRange: [number, number];
    };

    type RepresentationStyles =
        | 'VdwSpheres'
        | 'ligands'
        | 'CAs'
        | 'CBs'
        | 'CDs'
        | 'gaussian'
        | 'allHBonds'
        | 'rama'
        | 'rotamer'
        | 'CRs'
        | 'MolecularSurface'
        | 'DishyBases'
        | 'VdWSurface'
        | 'Calpha'
        | 'unitCell'
        | 'hover'
        | 'environment'
        | 'ligand_environment'
        | 'contact_dots'
        | 'chemical_features'
        | 'ligand_validation'
        | 'glycoBlocks'
        | 'restraints'
        | 'residueSelection'
        | 'MetaBalls'
        | 'adaptativeBonds'
        | 'StickBases'
        | 'residue_environment'
        | 'transformation';

    type History = import('../utils/MoorhenHistory').History;

    type createCovLinkAtomInput = {
        selectedMolNo: number;
        selectedAtom: string;
        deleteAtom: boolean;
        deleteSelectedAtom: string;
        changeAtomCharge: boolean;
        changeSelectedAtomCharge: string;
        newAtomCharge: string;
        changeBondOrder: boolean;
        changeSelectedBondOrder: string;
        newBondOrder: string;
    };

    interface AceDRGInstance {
        createCovalentLink: (arg0: createCovLinkAtomInput, arg1: createCovLinkAtomInput) => void;
    }

    type selectedMtzColumns = {
        F?: string;
        PHI?: string;
        Fobs?: string;
        SigFobs?: string;
        FreeR?: string;
        isDifference?: boolean;
        useWeight?: boolean;
        calcStructFact?: any;
    };

    type ScreenRecorder = import('../utils/MoorhenScreenRecorder').ScreenRecorder;

    type mapHeaderInfo = {
        spacegroup: string;
        cell: libcootApi.mapCellJS;
        resolution: number;
    };

    type AtomRightClickEventInfo = {
        atom: AtomInfo;
        buffer: { id: string };
        coords: string;
        pageX: number;
        pageY: number;
    };

    type AtomRightClickEvent = CustomEvent<AtomRightClickEventInfo>;

    type AtomDraggedEvent = CustomEvent<{
        atom: AtomInfo;
        buffer: any;
    }>;

    type OriginUpdateEvent = CustomEvent<{ origin: [number, number, number] }>;

    type WheelContourLevelEvent = CustomEvent<{ factor: number }>;

    type MapRadiusChangeEvent = CustomEvent<{ factor: number }>;

    type AtomClickedEvent = CustomEvent<{
        buffer: { id: string };
        atom: AtomInfo;
        isResidueSelection: boolean;
    }>;

    type NewMapContourEvent = CustomEvent<{
        molNo: number;
        mapRadius: number;
        isVisible: boolean;
        contourLevel: number;
        mapColour: [number, number, number, number];
        litLines: boolean;
    }>;

    interface ContextSetters {
        setDefaultMapSamplingRate: React.Dispatch<React.SetStateAction<number>>;
        setDoShadowDepthDebug: React.Dispatch<React.SetStateAction<boolean>>;
        setDefaultBackgroundColor: React.Dispatch<React.SetStateAction<[number, number, number, number]>>;
        setDoShadow: React.Dispatch<React.SetStateAction<boolean>>;
        setDoSSAO: React.Dispatch<React.SetStateAction<boolean>>;
        setDoEdgeDetect: React.Dispatch<React.SetStateAction<boolean>>;
        setEdgeDetectDepthThreshold: React.Dispatch<React.SetStateAction<number>>;
        setEdgeDetectNormalThreshold: React.Dispatch<React.SetStateAction<number>>;
        setEdgeDetectDepthScale: React.Dispatch<React.SetStateAction<number>>;
        setEdgeDetectNormalScale: React.Dispatch<React.SetStateAction<number>>;
        setDoOutline: React.Dispatch<React.SetStateAction<boolean>>;
        setClipCap: React.Dispatch<React.SetStateAction<boolean>>;
        setResetClippingFogging: React.Dispatch<React.SetStateAction<boolean>>;
        setUseOffScreenBuffers: React.Dispatch<React.SetStateAction<boolean>>;
        setDepthBlurRadius: React.Dispatch<React.SetStateAction<number>>;
        setDepthBlurDepth: React.Dispatch<React.SetStateAction<number>>;
        setSsaoRadius: React.Dispatch<React.SetStateAction<number>>;
        setSsaoBias: React.Dispatch<React.SetStateAction<number>>;
        setDoPerspectiveProjection: React.Dispatch<React.SetStateAction<boolean>>;
        setDrawInteractions: React.Dispatch<React.SetStateAction<boolean>>;
        setDrawMissingLoops: React.Dispatch<React.SetStateAction<boolean>>;
        setDrawAxes: React.Dispatch<React.SetStateAction<boolean>>;
        setDrawCrosshairs: React.Dispatch<React.SetStateAction<boolean>>;
        setDrawFPS: React.Dispatch<React.SetStateAction<boolean>>;
        setDefaultExpandDisplayCards: React.Dispatch<React.SetStateAction<boolean>>;
        setUrlPrefix: React.Dispatch<React.SetStateAction<string>>;
        setEnableRefineAfterMod: React.Dispatch<React.SetStateAction<boolean>>;
        setDefaultMapLitLines: React.Dispatch<React.SetStateAction<boolean>>;
        setMapLineWidth: React.Dispatch<React.SetStateAction<number>>;
        setAtomLabelDepthMode: React.Dispatch<React.SetStateAction<boolean>>;
        setMouseSensitivity: React.Dispatch<React.SetStateAction<number>>;
        setShowShortcutToast: React.Dispatch<React.SetStateAction<boolean>>;
        setShowHoverInfo: React.Dispatch<React.SetStateAction<boolean>>;
        setMakeBackups: React.Dispatch<React.SetStateAction<boolean>>;
        setContourWheelSensitivityFactor: React.Dispatch<React.SetStateAction<number>>;
        setDevMode: React.Dispatch<React.SetStateAction<boolean>>;
        setUseGemmi: React.Dispatch<React.SetStateAction<boolean>>;
        setEnableTimeCapsule: React.Dispatch<React.SetStateAction<boolean>>;
        setShowScoresToast: React.Dispatch<React.SetStateAction<boolean>>;
        setDefaultMapSurface: React.Dispatch<React.SetStateAction<boolean>>;
        setDefaultBondSmoothness: React.Dispatch<React.SetStateAction<number>>;
        setGLLabelsFontFamily: React.Dispatch<React.SetStateAction<string>>;
        setGLLabelsFontSize: React.Dispatch<React.SetStateAction<number>>;
        setMaxBackupCount: React.Dispatch<React.SetStateAction<number>>;
        setModificationCountBackupThreshold: React.Dispatch<React.SetStateAction<number>>;
        setShortcutOnHoveredAtom: React.Dispatch<React.SetStateAction<boolean>>;
        setZoomWheelSensitivityFactor: React.Dispatch<React.SetStateAction<number>>;
        setShortCuts: React.Dispatch<React.SetStateAction<string>>;
        setDefaultUpdatingScores: React.Dispatch<{
            action: 'Add' | 'Remove' | 'Overwrite';
            item?: string;
            items?: string[];
        }>;
        setTransparentModalsOnMouseOut: React.Dispatch<React.SetStateAction<boolean>>;
    }

    interface Context extends ContextSetters, PreferencesValues {}
}

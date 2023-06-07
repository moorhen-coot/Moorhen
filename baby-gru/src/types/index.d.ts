import { MoorhenMoleculeInterface } from "../utils/MoorhenMolecule";

export {};

declare global {
    namespace JSX {
        interface IntrinsicElements {
          "protvista-manager": ProtvistaManager;
          "protvista-sequence": ProtvistaSequence;
          "protvista-navigation": ProtvistaNavigation;
          "protvista-track": ProtvistaTrack;
        }
    }    
    interface Window {
        CCP4Module: CCP4ModuleType;
    }
    type CCP4ModuleType = {
        check_polymer_type(polymerConst: emscriptemInstanceInterface<number>): {value: number};
        remove_ligands_and_waters_chain(chain: GemmiChainInterface): void;
        gemmi_setup_entities(gemmiStructure: GemmiStructureInterface): void;
        remove_ligands_and_waters_structure(gemmiStructure: GemmiStructureInterface): void;
        read_structure_from_string(pdbData: string | ArrayBuffer, molName: string): GemmiStructureInterface;
        get_mtz_columns(fileName: string): emscriptemVectorInterface<string>;
        FS_createDataFile(arg0: string, fileName: string, byteArray: Uint8Array, arg3: boolean, arg4: boolean): void;
        getElementNameAsString: (arg0: emscriptemInstanceInterface<string>) => string;
        FS_unlink: (arg0: string) => void;
        Selection: { new(cid: string): GemmiSelectionInterface };
    }
    type HoveredAtomType = {
        molecule: MoorhenMoleculeInterface | null,
        cid: string | null
    }
    type mgWebGLType = {
        setDiffuseLightNoUpdate(arg0: number, arg1: number, arg2: number): void;
        atomLabelDepthMode: boolean;
        setTextFont(GLLabelsFontFamily: string, GLLabelsFontSize: number): void;
        setBackground(backgroundColor: [number, number, number, number]): void;
        clipCapPerfectSpheres: boolean;
        setLightPositionNoUpdate(arg0: number, arg1: number, arg2: number): void;
        setDiffuseLight(arg0: number, arg1: number, arg2: number): void;
        setSpecularLightNoUpdate(arg0: number, arg1: number, arg2: number): void;
        setAmbientLightNoUpdate(arg0: number, arg1: number, arg2: number): void;
        useOffScreenBuffers: boolean;
        setSpinTestState(doSpinTest: boolean): void;
        setShadowsOn(doShadow: boolean): void;
        setShadowDepthDebug(doShadowDepthDebug: boolean): void;
        doPerspectiveProjection: boolean;
        clearTextPositionBuffers(): void;
        set_clip_range(arg0: number, arg1: number, arg2?: boolean): void;
        set_fog_range(arg0: number, arg1: number, arg2?: boolean): void;
        setQuat(arg0: any): void;
        myQuat: any;
        gl_fog_start: null | number;
        doDrawClickedAtomLines: any;
        gl_clipPlane0: null | [number, number, number, number];
        gl_clipPlane1: null | [number, number, number, number];
        fogClipOffset: number;
        fogClipOffset: number;
        zoom: number;
        gl_fog_end: number;
        light_colours_specular: [number, number, number, number];
        light_colours_diffuse: [number, number, number, number];
        light_positions: [number, number, number, number];
        light_colours_ambient: [number, number, number, number];
        background_colour: [number, number, number, number];
        origin: [number, number, number];
        liveUpdatingMaps: any[];
        displayBuffers: any[];
        labelledAtoms: any[];
        measuredAtoms: any[];
        pixel_data: any[];
        screenshotBuffersReady: boolean;
        save_pixel_data: boolean;
        renderToTexture: boolean;
        showShortCutHelp: string[];
        WEBGL2: boolean;
        gl: {
            viewportWidth: number;
            viewportHeight: number;
        };
        canvas: {
            width: number;
            height: number;
        };
        rttFramebuffer: {
            width: number;
            height: number;
        };
        resize(arg0: number, arg1: number): void;
        setActiveMolecule: (activeMolecule: MoorhenMoleculeInterface) => void;
        drawScene: () => void;
        initTextureFramebuffer: () => void;
        setZoom: (arg0: number, arg1?: boolean) => void;
        clearMeasureCylinderBuffers: () => void;
        reContourMaps: () => void;
        drawScene: () => void;
        buildBuffers: () => void;
        setOriginOrientationAndZoomAnimated: (arg0: number[], arg1: any, arg2: number) => void;
        appendOtherData: (jsondata: any, skipRebuild?: boolean, name?: string) => void;
        setOriginAnimated: (origin: number[], doDrawScene?: boolean) => void
        setOrigin: (origin: number[], doDrawScene?: boolean, dispatchEvent?: boolean) => void;
        getFrontAndBackPos: (evt: KeyboardEvent) => [number[], number[], number, number];
        labelsTextCanvasTexture: {
            removeBigTextureTextImages: (labels: string[]) => void;
        }
    }
    type MoorhenOriginUpdateEventType = CustomEvent<MoorhenOriginUpdateInfoType>
    type MoorhenOriginUpdateInfoType = {
        origin: [number, number, number];
    }
    type MoorhenWheelContourLevelEventType = CustomEvent<MoorhenWheelContourLevelInfoType>
    type MoorhenWheelContourLevelInfoType = {
        factor: number;
    }
    type MoorhenNewMapContourEventType = CustomEvent<MoorhenNewMapContourInfoType>
    type MoorhenNewMapContourInfoType = {
        molNo: number;
        mapRadius: number;
        cootContour: boolean;
        contourLevel: number;
        mapColour: [number, number, number, number],
        litLines: boolean;
    }
    type MoorhenMapRadiusChangeEventType = CustomEvent<MoorhenMapRadiusChangeInfoType>
    type MoorhenMapRadiusChangeInfoType = {
        factor: number;
    }
    type MoorhenScoresUpdateEventType = CustomEvent<MoorhenScoresUpdateInfoType>
    type MoorhenScoresUpdateInfoType = {
        origin: [number, number, number];
        modifiedMolecule: number;
    }
    type MoorhenConnectMapsEventType = CustomEvent<MoorhenConnectMapsInfoType>
    type MoorhenConnectMapsInfoType = {
        molecule: number;
        maps: [number, number, number];
        uniqueMaps: number[];
    }
    type MoorhenNewMapContourEventType = CustomEven<{
        molNo: map.molNo,
        mapRadius: storedMapData.radius,
        cootContour: storedMapData.cootContour,
        contourLevel: storedMapData.contourLevel,
        mapColour: storedMapData.colour,
        litLines: storedMapData.litLines,
    }>
    type emscriptemInstanceInterface<T> = {
        clone: () => T;
        delete: () => void;
        isDeleted: () => boolean;
    }
    interface emscriptemVectorInterface<T> extends emscriptemInstanceInterface<T> {
        size: () => number;
        get: (idx: number) => T;
        at: (idx: number) => T;
    }
    interface GemmiSelectionInterface extends emscriptemInstanceInterface<GemmiSelectionInterface> {
        matches_model: (model: GemmiModelInterface) => boolean;
        matches_chain: (chain: GemmiChainInterface) => boolean;
        matches_residue: (residue: GemmiResidueInterface) => boolean;
        matches_atom: (atom: GemmiAtomInterface) => boolean;
        chain_ids: GemmiSelectionChainListInterface;
        to_seqid: GemmiSelectionSeqIdInterface;
        from_seqid: GemmiSelectionSeqIdInterface;
    }
    interface GemmiSelectionChainListInterface extends emscriptemInstanceInterface<GemmiSelectionChainListInterface> {
        str: () => string;
        all: boolean;
    }
    interface GemmiSelectionSeqIdInterface extends emscriptemInstanceInterface<GemmiSelectionSeqIdInterface> {
        str: () => string;
        empty: () => boolean;
        seqnum: number;
    }
    interface GemmiAtomInterface extends emscriptemInstanceInterface<GemmiAtomInterface> {
        name: string;
        element: emscriptemInstanceInterface<string>;
        pos: { x: number, y: number, z: number, delete: () => void };
        altloc: number;
        charge: number;
        b_iso: number;
        serial: string;
        has_altloc: () => boolean;
    }

    interface GemmiResidueSeqIdInterface extends emscriptemInstanceInterface<GemmiResidueSeqIdInterface> {
        str: () => string;
    }

    interface GemmiResidueInterface extends emscriptemInstanceInterface<GemmiResidueInterface> {
        name: string;
        seqid: GemmiResidueSeqIdInterface;
        atoms: emscriptemVectorInterface<GemmiAtomInterface>;
    }

    interface GemmiChainInterface extends emscriptemInstanceInterface<GemmiChainInterface> {
        residues: emscriptemVectorInterface<GemmiResidueInterface>;
        name: string;
        get_polymer_const: () => emscriptemInstanceInterface<number>;
        get_ligands_const: () => emscriptemVectorInterface<GemmiResidueInterface>
    }

    interface GemmiModelInterface extends emscriptemInstanceInterface<GemmiModelInterface> {
        name: string;
        chains: emscriptemVectorInterface<GemmiChainInterface>;
    }

    interface GemmiUnitCellInterface extends emscriptemInstanceInterface<GemmiUnitCellInterface> {
        a: number;
        b: number;
        c: number;
        alpha: number;
        beta: number;
        gamma: number;
    }

    interface GemmiStructureInterface extends emscriptemInstanceInterface<GemmiStructureInterface> {
        models: emscriptemVectorInterface<GemmiModelInterface>;
        cell: GemmiUnitCellInterface;
        first_model: () => GemmiModelInterface;
    }
}


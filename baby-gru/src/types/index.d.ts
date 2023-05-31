import { MoorhenMoleculeInterface } from "../utils/MoorhenMolecule";

export {};

declare global {
    interface Window {
        CCP4Module: any;
    }
    type HoveredAtomType = {
        molecule: MoorhenMoleculeInterface | null,
        cid: string | null
    }
    type mgWebGLType = {
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
        set_clip_range(arg0: number, arg1: number): void;
        set_fog_range(arg0: number, arg1: number): void;
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
        setZoom: (arg0: number) => void;
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
}


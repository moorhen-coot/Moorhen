export {};

declare global {
    interface Window {
        CCP4Module: any;
    }
    type HoverHoveredAtomType = {
        molecule: MoorhenMoleculeInterface | null,
        cid: string | null
    }
    type mgWebGLType = {
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


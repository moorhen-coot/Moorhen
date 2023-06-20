
import { moorhen } from "./moorhen";

export namespace webGL {
    type MGWebGL = {
        setLightPosition(arg0: number, arg1: number, arg2: number): void;
        specularPower: number;
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
        setOutlinesOn(doOutline: boolean): void;
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
        setActiveMolecule: (activeMolecule: moorhen.Molecule) => void;
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
}
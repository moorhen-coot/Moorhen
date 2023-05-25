export {};

declare global {
    interface Window {
        CCP4Module: any;
    }
    type HoverHoveredAtomType = {
        molecule: MoorhenMoleculeInterface | null,
        cid: string | null
    }    
    type glRefType = {
        current: {
            origin: [number, number, number];
            drawScene: () => void;
            liveUpdatingMaps: any[];
            displayBuffers: any[];
            reContourMaps: () => void;
            drawScene: () => void;
            buildBuffers: () => void;
            setOriginOrientationAndZoomAnimated: (arg0: number[], arg1: any, arg2: number) => void;
            appendOtherData: (jsondata: any, skipRebuild?: boolean, name?: string) => void;
            setOriginAnimated: (origin: number[], doDrawScene?: boolean) => void
            setOrigin: (origin: number[], doDrawScene?: boolean, dispatchEvent?: boolean) => void;
            labelsTextCanvasTexture: {
                removeBigTextureTextImages: (labels: string[]) => void;
            };
        }
    }
}


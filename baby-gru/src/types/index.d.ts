import { emscriptem } from "./emscriptem";
import { moorhen } from "./moorhen";
import { libcootApi } from "./libcoot";

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
        CCP4Module: libcootApi.CCP4ModuleType;
    }
    type HoveredAtomType = {
        molecule: moorhen.Molecule | null,
        cid: string | null
    }
    interface CootResidueSpecType {
        resNum: number;
        insCode: string;
        modelNumber: number;
        chainId: string;
    }
    type CootRamachandranDataType = {
        chainId: string;
        insCode: string;
        seqNum: number;
        restype: string;
        isOutlier: boolean;
        phi: number;
        psi: number;
        is_pre_pro: boolean;
    }
    interface CootInterestingPlaceDataType extends CootResidueSpecType {
        featureType: string;
        featureValue: number;
        buttonLabel: string;
        badness: number;
        coordX: number;
        coordY: number;
        coordZ: number;
    }

    type MoorhenOriginUpdateEventType = CustomEvent<{ origin: [number, number, number]; }>
    type MoorhenWheelContourLevelEventType = CustomEvent<{ factor: number; }>
    type MoorhenMapRadiusChangeEventType = CustomEvent<{ factor: number; }>
    type MoorhenScoresUpdateEventType = CustomEvent<{
        origin: [number, number, number];
        modifiedMolecule: number;
    }>
    type MoorhenConnectMapsInfoType = {
        molecule: number;
        maps: [number, number, number];
        uniqueMaps: number[];
    }
    type MoorhenConnectMapsEventType = CustomEvent<MoorhenConnectMapsInfoType>
    type MoorhenNewMapContourEventType = CustomEvent<{
        molNo: number;
        mapRadius: number;
        cootContour: boolean;
        contourLevel: number;
        mapColour: [number, number, number, number],
        litLines: boolean;
    }>
    type MoorhenAtomInfoType = {
        pos: [number, number, number];
        x: number;
        y: number;
        z: number;
        charge: number;
        element: emscriptem.instance<string>;
        symbol: string;
        tempFactor: number;
        serial: string;
        name: string;
        has_altloc: boolean;
        alt_loc: string;
        mol_name: string;
        chain_id: string;
        res_no: string;
        res_name: string;
        label: string;
    }
}


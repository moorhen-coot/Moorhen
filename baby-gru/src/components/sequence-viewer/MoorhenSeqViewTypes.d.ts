import { gradientPresets } from "../inputs/MoorhenGradientPicker/gradientPresets";

export type ResiduesSelection = {
    molNo: number;
    chain: string;
    range: [number, number];
};

export type Residue = {
    resNum: number;
    resCode: string;
    resCID: string;
    selected?: boolean;
    colour?: string;
    validationData?: {
        [key: string]: {
            value: number | [number, number];
            reverseGradient?: boolean;
            gradientPreset?: keyof typeof gradientPresets;
            category?: string;
        };
    };
};

export type SeqElement = {
    molName: string;
    chain: string;
    molNo: number;
    hideResCode?: boolean;
    displayName?: string;
    residuesDisplayOffset?: number;
    colour?: string;
    missingAs?: string;
    blockAlternateColour?: boolean;
    residues: Residue[];
};

import { hexToRgb } from "@/utils/utils";
import { moorhen } from "../types/moorhen";
import { guid } from "./utils";
import { CommandCentre } from "@/InstanceManager/CommandCentre/MoorhenCommandCentre";

export type ColourRuleSelectionType = "chain" | "cid" | "ligands" | "molecule" | "neighbourhood" | "residue-range";
const propertyTypes: ColourRulePropertyType[] = [
    "af2-plddt",
    "b-factor",
    "b-factor-norm",
    "electrostatics",
    "jones-rainbow",
    "mol-symm",
    "property",
    "RMSD",
    "secondary-structure"
];
export type ColourRulePropertyType =
    | "default"
    | "af2-plddt"
    | "b-factor"
    | "b-factor-norm"
    | "electrostatics"
    | "jones-rainbow"
    | "mol-symm"
    | "property"
    | "RMSD"
    | "secondary-structure";

export type ColourRuleType = ColourRuleSelectionType | ColourRulePropertyType;

const isColourRulePropertyType = (ruleType: ColourRuleType): ruleType is ColourRulePropertyType =>
    propertyTypes.includes(ruleType as ColourRulePropertyType);

/**
 * Represents a colour rule for a given representation
 * @property {ColourRuleType} ruleType - The type of this colour rule instance
 * @property {string} cid - The CID selection for this colour rule
 * @property {string} color - The colour for this rule in hexadecimal format
 * @property {string} multiColourData - Encoded CID/colour data for multi-colour rules
 * @property {string} label - Label displayed in the UI for this colour rule
 * @property {boolean} isMultiColourRule - Indicates whether this colour rule consists of multiple colours assigned to different residues
 * @property {moorhen.Molecule} parentMolecule - The molecule assigned to this colour rule
 * @property {moorhen.MoleculeRepresentation} parentRepresentation - The molecule representation assigned to this colour rule
 * @property {boolean} applyColourToNonCarbonAtoms - Indicates if the colour rule will also be applied to non carbon atoms
 * @property {string} uniqueId - A unique identifier for this colour rule
 * @constructor
 * @param {string} ruleType - The type of this colour rule instance
 * @param {string} cid - The CID selection for this colour rule
 * @param {string} color - The colour for this rule (hex format)
 * @param {CommandCentre | null} commandCentre - The command centre instance
 * @param {boolean} [isMultiColourRule=false] - Indicates whether this colour rule consists of multiple colours assigned to different residues
 * @param {boolean} [applyColourToNonCarbonAtoms=false] - Indicates if the colour rule will also be applied to non carbon atoms
 * @param {string} [multiColourData=""] - Encoded CID/colour data for multi-colour rules
 * @example
 * import { MoorhenMolecule, MoorhenColourRule } from 'moorhen';
 *
 * const example = async (ruleArgs) => {
 *    const molecule = new MoorhenMolecule(commandCentre, glRef, monomerLibraryPath);
 *
 *    const colourRule = new MoorhenColourRule(
 *      'molecule', "//", "#ffffff", commandCentre
 *    )
 *
 *    colourRule.setParentMolecule(molecule)
 * }
 */
export class ColourRule {
    ruleType: ColourRuleType;
    propertyType: ColourRulePropertyType;
    cid: string;
    color: string;
    multiColourData: string;
    label: string;
    isMultiColourRule: boolean;
    commandCentre: CommandCentre | null;
    parentMolecule: moorhen.Molecule;
    parentRepresentation: moorhen.MoleculeRepresentation;
    applyColourToNonCarbonAtoms: boolean;
    uniqueId: string;
    initFromString: (
        stringifiedObject: string,
        commandCentre: CommandCentre | null,
        molecule: moorhen.Molecule
    ) => moorhen.ColourRule;
    initFromDataObject: (
        data: moorhen.ColourRuleObject,
        commandCentre: CommandCentre | null,
        molecule: moorhen.Molecule
    ) => moorhen.ColourRule;
    parseHexToRgba: (hex: string) => [number, number, number, number];

    constructor(
        ruleType: ColourRuleType,
        cid: string,
        color: string,
        commandCentre: CommandCentre | null,
        isMultiColourRule: boolean = false,
        applyColourToNonCarbonAtoms: boolean = false,
        multiColourData: string = ""
    ) {
        this.cid = cid;
        this.color = color;
        this.commandCentre = commandCentre;
        this.applyColourToNonCarbonAtoms = applyColourToNonCarbonAtoms;
        this.isMultiColourRule = isMultiColourRule;
        this.ruleType = ruleType;
        this.multiColourData = multiColourData;
        this.label = cid;
        this.uniqueId = guid();
        this.propertyType = isColourRulePropertyType(ruleType) ? ruleType : null;
    }

    /**
     * Static method that can be used to create a new colour rule from a JSON string representation of a colour rule data object
     * @param {string} stringifiedObject - The JSON string representation of a colour rule data object
    * @param {CommandCentre | null} commandCentre - The command centre instance
     * @param {moorhen.Molecule} molecule - The molecule that will be associated to this colour rule
     * @returns {moorhen.ColourRule} The new colour rule
     */
    static initFromString(
        stringifiedObject: string,
        commandCentre: CommandCentre | null,
        molecule: moorhen.Molecule
    ) {
        const data = JSON.parse(stringifiedObject);
        return ColourRule.initFromDataObject(data, commandCentre, molecule);
    }

    /**
     * Static method that can be used to create a new colour rule from a colour rule data object
     * @param {moorhen.ColourRuleObject} data - The colour rule data object
    * @param {CommandCentre | null} commandCentre - The command centre instance
     * @param {moorhen.Molecule} molecule - The molecule that will be associated to this colour rule
     * @returns {moorhen.ColourRule} The new colour rule
     */
    static initFromDataObject(
        data: moorhen.ColourRuleObject,
        commandCentre: CommandCentre | null,
        molecule: moorhen.Molecule
    ) {
        const colourRule = new ColourRule(
            data.ruleType as ColourRuleType,
            data.cid,
            data.color,
            commandCentre,
            data.isMultiColourRule,
            data.applyColourToNonCarbonAtoms,
            data.isMultiColourRule ? data.args[0] as string : ""
        );
        colourRule.setLabel(data.label);
        colourRule.setParentMolecule(molecule);
        return colourRule;
    }

    /**
     * Static method that can be used to parse a HEX string into RGBA
     * @param {string} hex - The HEX string
     * @returns {number[]} A list of numbers corresponding with RGBA
     */
    static parseHexToRgba(hex: string): [number, number, number, number] {
        let [r, g, b, a]: number[] = [];
        if (hex.length > 7) {
            a = ((parseInt(hex.slice(7, 9), 16) / 255) * 1000) / 1000;
            [r, g, b] = hexToRgb(hex.slice(0, 7))
                .replace("rgb(", "")
                .replace(")", "")
                .split(", ")
                .map(item => parseFloat(item));
        } else {
            [r, g, b] = hexToRgb(hex)
                .replace("rgb(", "")
                .replace(")", "")
                .split(", ")
                .map(item => parseFloat(item));
            a = 1.0;
        }
        return [r, g, b, a];
    }

    /**
     * Get a colour rule data object for this colour rule instance
     * @returns {moorhen.ColourRuleObject} The colour rule data object
     */
    objectify() {
        return {
            cid: this.cid,
            color: this.color,
            applyColourToNonCarbonAtoms: this.applyColourToNonCarbonAtoms,
            isMultiColourRule: this.isMultiColourRule,
            ruleType: this.ruleType,
            // Preserve the existing session format while rules use named fields in memory.
            args: this.isMultiColourRule ? [this.multiColourData] : [this.cid, this.color],
            label: this.label,
            uniqueId: this.uniqueId,
            parentMoleculeMolNo: this.parentMolecule ? this.parentMolecule.molNo : null,
            parentRepresentationUniqueId: this.parentRepresentation ? this.parentRepresentation.uniqueId : null,
        };
    }

    /**
     * Get a JSON string representation of the colour rule data object for this colour rule instance
     * @returns {string} A JSON string representation of the colour rule data object
     */
    stringify() {
        return JSON.stringify(this.objectify());
    }

    /**
     * Set the label attribute for this colour rule instance
     * @param {string} label - The new label
     */
    setLabel(label: string) {
        this.label = label;
    }

    setColor(color: string) {
        this.color = color;
    }

    setMultiColourData(multiColourData: string) {
        this.multiColourData = multiColourData;
    }

    /**
     * Set the molecule instance associated to this colour rule instance
     * @param {moorhen.Molecule} molecule - The molecule instance
     */
    setParentMolecule(molecule: moorhen.Molecule) {
        this.parentMolecule = molecule;
    }

    /**
     * Set the molecule representation associated to this colour rule instance
     * @param {moorhen.MoleculeRepresentation} representation - The molecule representation instance
     */
    setParentRepresentation(representation: moorhen.MoleculeRepresentation) {
        this.parentRepresentation = representation;
        this.parentMolecule = representation.parentMolecule;
    }

    /**
     * Set whether this colour rule should also be applied to non carbon atoms
     * @param {boolean} newVal The new attribute value
     */
    setApplyColourToNonCarbonAtoms(newVal: boolean) {
        this.applyColourToNonCarbonAtoms = newVal;
    }

    /**
     * Get a list of user-defined colour objects that can be passed directly to libcoot API based on this colour rule instance
     * @returns {object[]} The user-defined colour objects
     */
    getUserDefinedColours(): {
        cid: string;
        rgba: [number, number, number, number];
        applyColourToNonCarbonAtoms: boolean;
    }[] {
        if (this.isMultiColourRule) {
            return this.multiColourData.split("|").filter(Boolean).map(colour => {
                const [cid, hex] = colour.split("^");
                const [r, g, b, a] = ColourRule.parseHexToRgba(hex);
                return {
                    cid: cid,
                    rgba: [r / 255, g / 255, b / 255, a],
                    applyColourToNonCarbonAtoms: this.applyColourToNonCarbonAtoms,
                };
            });
        } else {
            const [r, g, b, a] = ColourRule.parseHexToRgba(this.color);
            return [
                {
                    cid: this.label,
                    rgba: [r / 255, g / 255, b / 255, a],
                    applyColourToNonCarbonAtoms: this.applyColourToNonCarbonAtoms,
                },
            ];
        }
    }

    /** Get the colour-rule payload expected by Coot's non-bond commands. */
    getCootColourRuleArgs(): [string] | [string, string] {
        return this.isMultiColourRule ? [this.multiColourData] : [this.cid, this.color];
    }

    /**
     * Use libcoot API to apply this colour rule
    * @param {string} [style] - The style of the molecule representation associated with this colour rule. Defaults to the parent representation's style.
     */
    async apply(style?: string) {
        const _style = style ?? this.parentRepresentation.style;
        if (!_style || !this.parentMolecule || !this.commandCentre) {
            console.warn(
                "Cannot apply colour rule without a parent molecule, or a command centre assigned, or a representation style defined. Doing nothing..."
            );
        } else if (["CBs", "VdwSpheres", "ligands", "CAs"].includes(_style)) {
            const userDefinedColours = this.getUserDefinedColours();
            await this.commandCentre.cootCommand(
                {
                    message: "coot_command",
                    command: "shim_set_bond_colours",
                    returnType: "status",
                    commandArgs: [this.parentMolecule.molNo, userDefinedColours, this.applyColourToNonCarbonAtoms],
                },
                false
            );
        } else {
            await this.commandCentre.cootCommand(
                {
                    message: "coot_command",
                    command: this.isMultiColourRule ? "add_colour_rules_multi" : "add_colour_rule",
                    returnType: "status",
                    commandArgs: [this.parentMolecule.molNo, ...this.getCootColourRuleArgs()],
                },
                false
            );
        }
    }
}

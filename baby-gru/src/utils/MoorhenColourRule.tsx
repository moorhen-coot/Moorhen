import { moorhen } from '../types/moorhen';
import { hexToRgb } from '@mui/material';
import { guid } from './MoorhenUtils';

export class MoorhenColourRule implements moorhen.ColourRule {
    
    ruleType: string;
    cid: string;
    color: string;
    args: (string | number)[];
    label: string;
    isMultiColourRule: boolean;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    parentMolecule: moorhen.Molecule;
    parentRepresentation: moorhen.MoleculeRepresentation;
    applyColourToNonCarbonAtoms: boolean;
    uniqueId: string;
    initFromString: (stringifiedObject: string, commandCentre: React.RefObject<moorhen.CommandCentre>, molecule: moorhen.Molecule) => moorhen.ColourRule;
    initFromDataObject: (data: moorhen.ColourRuleObject, commandCentre: React.RefObject<moorhen.CommandCentre>, molecule: moorhen.Molecule) => moorhen.ColourRule;

    constructor(ruleType: string, cid: string, color: string, commandCentre: React.RefObject<moorhen.CommandCentre>, isMultiColourRule: boolean = false, applyColourToNonCarbonAtoms: boolean = false) {
        this.cid = cid
        this.color = color
        this.commandCentre = commandCentre
        this.applyColourToNonCarbonAtoms = applyColourToNonCarbonAtoms
        this.isMultiColourRule = isMultiColourRule
        this.ruleType = ruleType
        this.args = []
        this.label = cid
        this.uniqueId = guid()
    }

    static initFromString(stringifiedObject: string, commandCentre: React.RefObject<moorhen.CommandCentre>, molecule: moorhen.Molecule) {
        const data = JSON.parse(stringifiedObject)
        return MoorhenColourRule.initFromDataObject(data, commandCentre, molecule)
    }

    static initFromDataObject(data: moorhen.ColourRuleObject, commandCentre: React.RefObject<moorhen.CommandCentre>, molecule: moorhen.Molecule) {
        const colourRule = new MoorhenColourRule(data.ruleType, data.cid, data.color, commandCentre, data.isMultiColourRule, data.applyColourToNonCarbonAtoms)
        colourRule.setArgs(data.args)
        colourRule.setLabel(data.label)
        colourRule.setParentMolecule(molecule)
        return colourRule
    }

    objectify() {
        return {
            cid: this.cid,
            color: this.color,
            applyColourToNonCarbonAtoms: this.applyColourToNonCarbonAtoms,
            isMultiColourRule: this.isMultiColourRule,
            ruleType: this.ruleType,
            args: this.args,
            label: this.label,
            uniqueId: this.uniqueId,
            parentMoleculeMolNo: this.parentMolecule ? this.parentMolecule.molNo : null,
            parentRepresentationUniqueId: this.parentRepresentation ? this.parentRepresentation.uniqueId : null
        }
    }

    stringify() {
        return JSON.stringify(this.objectify())
    }
    
    setLabel(label: string) {
        this.label = label
    }

    setArgs(args: (string | number)[]) {
        this.args = args
    }

    setParentMolecule(molecule: moorhen.Molecule) {
        this.parentMolecule = molecule
    }

    setParentRepresentation(representation: moorhen.MoleculeRepresentation) {
        this.parentRepresentation = representation
        this.parentMolecule = representation.parentMolecule
    }

    setApplyColourToNonCarbonAtoms(newVal: boolean) {
        this.applyColourToNonCarbonAtoms = newVal
    }

    getUserDefinedColours(): { cid: string; rgb: [number, number, number]; applyColourToNonCarbonAtoms: boolean }[] {
        if(this.isMultiColourRule) {
            const allColours = this.args[0] as string
            return allColours.split('|').map(colour => {
                const [cid, hex] = colour.split('^')
                const [r, g, b] = hexToRgb(hex).replace('rgb(', '').replace(')', '').split(', ').map(item => parseFloat(item))
                return { cid: cid, rgb: [r / 255, g / 255, b / 255], applyColourToNonCarbonAtoms: this.applyColourToNonCarbonAtoms }
            })
        } else {
            const [r, g, b] = hexToRgb(this.color).replace('rgb(', '').replace(')', '').split(', ').map(item => parseFloat(item))
            return [{ cid: this.label, rgb: [r / 255, g / 255, b / 255], applyColourToNonCarbonAtoms: this.applyColourToNonCarbonAtoms}]
        }
    }

    async apply(style: string) {
        if (!this.parentMolecule || !this.commandCentre) {
            console.warn('Cannot apply colour rule without a parent molecule, or a command centre assigned. Doing nothing...')
        } else if (['CBs', 'VdwSpheres', 'ligands', 'CAs'].includes(style)) {
            const userDefinedColours = this.getUserDefinedColours()
            await this.commandCentre.current.cootCommand({
                message: 'coot_command',
                command: 'shim_set_bond_colours',
                returnType: 'status',
                commandArgs: [this.parentMolecule.molNo, userDefinedColours, this.applyColourToNonCarbonAtoms]
            }, false)
        } else {
            await this.commandCentre.current.cootCommand({
                message: 'coot_command',
                command: this.isMultiColourRule ? 'add_colour_rules_multi' : 'add_colour_rule',
                returnType: 'status',
                commandArgs: [this.parentMolecule.molNo, ...this.args]
            }, false)
        }
    }
}

import { moorhen } from "../types/moorhen"
import { webGL } from "../types/mgWebGL";
import { MoorhenMolecule } from "./MoorhenMolecule";
import { MoorhenMap } from "./MoorhenMap";
import { addMolecule } from "../store/moleculesSlice";
import { addMap } from "../store/mapsSlice";
import { Store } from "@reduxjs/toolkit";
import { MoorhenColourRule } from "./MoorhenColourRule";
import { MoorhenMoleculeRepresentation } from "./MoorhenMoleculeRepresentation";

interface MoorhenScriptApiInterface {
    molecules: moorhen.Molecule[];
    maps: moorhen.Map[];
    glRef: React.RefObject<webGL.MGWebGL>;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    store: Store;
}

export class MoorhenScriptApi implements MoorhenScriptApiInterface {

    molecules: moorhen.Molecule[];
    maps: moorhen.Map[];
    glRef: React.RefObject<webGL.MGWebGL>;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    store: Store;

    constructor(commandCentre: React.RefObject<moorhen.CommandCentre>, glRef: React.RefObject<webGL.MGWebGL>, store: Store, molecules: moorhen.Molecule[], maps: moorhen.Map[]) {
        this.molecules = molecules
        this.maps = maps
        this.store = store
        this.glRef = glRef
        this.commandCentre = commandCentre
    }

    doRigidBodyFit = async (molNo: number, cidsString: string, mapNo: number) => {
        const selectedMolecule = this.molecules.find(molecule => molecule.molNo === molNo)
        if (typeof selectedMolecule !== 'undefined') {
            await selectedMolecule.rigidBodyFit(cidsString, mapNo)
        } else {
            console.log(`Unable to find molecule number ${molNo}`)
        }
    }

    doGenerateSelfRestraints = async (molNo: number, maxRadius: number) => {
        const selectedMolecule = this.molecules.find(molecule => molecule.molNo === molNo)
        if (typeof selectedMolecule !== 'undefined') {
            await selectedMolecule.generateSelfRestraints("//", maxRadius)
        } else {
            console.log(`Unable to find molecule number ${molNo}`)
        }
    }

    doRefineResiduesUsingAtomCid = async (molNo: number, cid: string, mode: string, ncyc: number) => {
        const selectedMolecule = this.molecules.find(molecule => molecule.molNo === molNo)
        if (typeof selectedMolecule !== 'undefined') {
            await selectedMolecule.refineResiduesUsingAtomCid(cid, mode, ncyc)
        } else {
            console.log(`Unable to find molecule number ${molNo}`)
        }
    }

    doClearExtraRestraints = async (molNo: number) => {
        const selectedMolecule = this.molecules.find(molecule => molecule.molNo === molNo)
        if (typeof selectedMolecule !== 'undefined') {
            await selectedMolecule.clearExtraRestraints()
        } else {
            console.log(`Unable to find molecule number ${molNo}`)
        }
    }

    setGemanMcclureAlpha = async (newValue: number) => {
        await this.commandCentre.current.cootCommand({
            returnType: "status",
            command: 'set_refinement_geman_mcclure_alpha',
            commandArgs: [newValue],
            changesMolecules: []
          }, true)
    }

    runCommand = async (command: string, ...args: any[]): Promise<void> => {
        await this.commandCentre.current.cootCommand({
            returnType: 'void',
            command: command,
            commandArgs: [...args]
          }, true)
          await this.redraw_molecules()
    }

    redraw_molecules = async () => {
        await Promise.all(this.molecules.map(molecule => {
            molecule.setAtomsDirty(true)
            return molecule.redraw()
          }))
    }

    exe(src: string) {
        // This env defines the variables accesible within the user-defined code
        let env = {
            molecules: this.molecules.reduce((obj, molecule) => {
                obj[molecule.molNo] = molecule
                return obj
            }, {}),
            maps: this.maps.reduce((obj, map) => {
                obj[map.molNo] = map
                return obj
            }, {}),
            glRef: this.glRef,
            commandCentre: this.commandCentre,
            MoorhenMolecule: MoorhenMolecule,
            MoorhenMap: MoorhenMap,
            MoorhenColourRule: MoorhenColourRule,
            MoorhenMoleculeRepresentation: MoorhenMoleculeRepresentation,
            dispatch: (arg) => this.store.dispatch( arg ),
            addMolecule: addMolecule,
            addMap: addMap, 
            run_command: this.runCommand,
            rigid_body_fit: this.doRigidBodyFit,
            generate_self_restraints: this.doGenerateSelfRestraints,
            clear_extra_restraints: this.doClearExtraRestraints,
            refine_residues_using_atom_cid: this.doRefineResiduesUsingAtomCid,
            set_refinement_geman_mcclure_alpha: this.setGemanMcclureAlpha,
            redraw_molecules: this.redraw_molecules
        };

        (new Function("with(this) { " + src + "}")).call(env)
    }
}

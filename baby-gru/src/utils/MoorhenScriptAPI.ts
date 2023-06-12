import { MoorhenMoleculeInterface } from "./MoorhenMolecule"

export class MoorhenScriptApi {
    
    molecules: MoorhenMoleculeInterface[];
    glRef: React.RefObject<mgWebGLType>;

    constructor(molecules: MoorhenMoleculeInterface[], glRef: React.RefObject<mgWebGLType>) {
        this.molecules = molecules
        this.glRef = glRef
    }

    doRigidBodyFit = async (molNo: number, cidsString: string, mapNo: number) => {
        const selectedMolecule = this.molecules.find(molecule => molecule.molNo === molNo)
        if (typeof selectedMolecule !== 'undefined') {
            await selectedMolecule.rigidBodyFit(cidsString, mapNo)
            selectedMolecule.setAtomsDirty(true)
            await selectedMolecule.redraw(this.glRef)
        } else {
            console.log(`Unable to find molecule number ${molNo}`)
        }
    }
    
    exe(src: string) {
        // This env defines the variables accesible within the user-defined code
        let env = {
            rigid_body_fit: this.doRigidBodyFit
        };
        
        (new Function( "with(this) { " + src + "}")).call(env)
    }
}
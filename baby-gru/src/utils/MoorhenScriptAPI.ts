import { MoorhenMapInterface } from "./MoorhenMap";
import { MoorhenMoleculeInterface } from "./MoorhenMolecule"


export class MoorhenScriptApi {
    
    molecules: MoorhenMoleculeInterface[];
    maps: MoorhenMapInterface[];
    glRef: React.RefObject<mgWebGLType>;

    constructor(molecules: MoorhenMoleculeInterface[], maps: MoorhenMapInterface[], glRef: React.RefObject<mgWebGLType>) {
        this.molecules = molecules
        this.maps = maps
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
        let mask = {
            molecules: this.molecules.reduce((obj, molecule) => {
                obj[molecule.molNo] = molecule
                return obj
            }, {}),
            maps: this.maps.reduce((obj, map) => {
                obj[map.molNo] = map
                return obj
            }, {}),
            rigid_body_fit: this.doRigidBodyFit
        };
        
        (new Function( "with(this) { " + src + "}")).call(mask)
    }
}
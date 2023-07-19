import { moorhen as MOORHEN } from "./moorhen"
import { webGL } from "./mgWebGL";
import { libcootApi } from "./libcoot";
import { gemmi } from "./gemmi";
import { emscriptem } from "./emscriptem";

declare module 'moorhen' {
    class MoorhenMolecule implements MOORHEN.Molecule { }
    module.exports.MoorhenMolecule = MoorhenMolecule
    
    class MoorhenMap implements MOORHEN.Map { }
    module.exports.MoorhenMap = MoorhenMap
}

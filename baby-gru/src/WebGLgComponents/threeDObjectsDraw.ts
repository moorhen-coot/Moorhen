import { hexToRGB } from '../utils/utils'
import { RootState } from '@/store'
import { Store } from '@reduxjs/toolkit'
import { ColourRule } from "../utils/MoorhenColourRule";

export const getThreeDObjectsBuffers = async (store: Store<RootState>): Promise<any>  => {

    const threeDObjects = store.getState().threeDObjects.objects
    const molecules = store.getState().molecules.moleculeList

    const sphere_sizes = [];
    const sphere_col_tri = [];
    const sphere_vert_tri = [];
    const sphere_idx_tri = [];
    const sphere_atoms = [];
    let isphere = 0
    const totInstanceUseColours = [];
    const totInstance_orientations = [];

    threeDObjects.forEach(obj => {
        if(obj.type==="sphere"){
            const [r, g, b, a] = ColourRule.parseHexToRgba(obj.colour)
            sphere_col_tri.push(r / 255, g / 255, b / 255, a)
            sphere_idx_tri.push(isphere);
            sphere_vert_tri.push(...obj.origin)
            sphere_sizes.push(obj.radius)
            sphere_sizes.push(obj.radius)
            sphere_sizes.push(obj.radius)
            totInstanceUseColours.push(true);
            totInstance_orientations.push(...[1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0]);
            //sphere_atoms.push(null);
            isphere++;
        }
    })

    return [{
            atoms: [[sphere_atoms]],
            instance_sizes: [[sphere_sizes]],
            instance_origins: [[sphere_vert_tri]],
            instance_use_colors: [[totInstanceUseColours]],
            instance_orientations: [[totInstance_orientations]],
            col_tri: [[sphere_col_tri]],
            norm_tri: [[[sphere_vert_tri]]],
            vert_tri: [[sphere_vert_tri]],
            idx_tri: [[sphere_idx_tri]],
            prim_types: [["PERFECT_SPHERES"]],
    }]

    //const objects = []
    //return [objects]

}

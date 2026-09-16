import { gemmiAtomPairsToCylindersInfo, getHexForCanvasColourName, hexToRGBA, getCube } from '../utils/utils'
import { RootState } from '@/store'
import { Store } from '@reduxjs/toolkit'

/**
 * Radial accuracy (segments around the axis) used for cylinder geometry. Raise for smoother
 * cylinders at the cost of more vertices.
 */
const CYLINDER_ACCU = 16

/**
 * The identity orientation, used by primitives that are not rotated.
 */
const IDENTITY_ORIENTATION = [1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0]

/**
 * Resolve an object's colour into the RGBA components (0-1) the colour buffers expect.
 *
 * An object colour may be a CSS colour name, "#rrggbb" or "#rrggbbaa". getHexForCanvasColourName
 * resolves names, but returns an "rgba(...)" string when handed 8-digit hex, so any alpha is
 * stripped before normalising and reattached afterwards.
 */
const getObjectColour = (colour: string): [number, number, number, number] => {
    if (!colour || colour === "gradient") {
        return [1.0, 0.0, 0.0, 1.0]
    }
    const hex =
        colour.startsWith("#") && colour.length === 9 ?
            getHexForCanvasColourName(colour.substring(0, 7)) + colour.substring(7)
        :   getHexForCanvasColourName(colour)
    const [r, g, b, a] = hexToRGBA(hex)
    return [r / 255, g / 255, b / 255, a / 255]
}

export const getThreeDObjectsBuffers = async (store: Store<RootState>): Promise<any>  => {

    const threeDObjects = store.getState().threeDObjects.objects

    // Cubes
    const cube_sizes = []
    const cube_col_tri = []
    const cube_vert_tri = []
    const cube_idx_tri = []
    const cube_atoms = []
    const cubeInstanceUseColours = []
    const cubeInstance_orientations = []
    let icube = 0

    // Spheres are drawn as instanced impostors (PERFECT_SPHERES): one instance per sphere, with
    // the geometry supplied by the renderer rather than by us.
    const sphere_sizes = []
    const sphere_col_tri = []
    const sphere_vert_tri = []
    const sphere_idx_tri = []
    const sphere_atoms = []
    const sphereInstanceUseColours = []
    const sphereInstance_orientations = []
    let isphere = 0

    // Cylinders reuse gemmiAtomPairsToCylindersInfo, which instances a unit cylinder along each
    // start/end pair. It expects atom-like endpoints keyed by serial, a colour lookup on those
    // serials, and a per-instance radius in individualSizes.
    const cylinderPairs = []
    const cylinderColours: { [serial: string]: number[] } = {}
    const cylinderSizes = []
    const conePairs = []
    const coneColours: { [serial: string]: number[] } = {}
    const coneSizes = []
    let nAtom = 0

    const cubeMesh = getCube()

    threeDObjects.forEach(obj => {
        if(obj.type==="sphere"){
            sphere_idx_tri.push(isphere);
            sphere_vert_tri.push(...obj.origin)
            sphere_col_tri.push(...getObjectColour(obj.colour))
            // The instance size attribute is a vec3 (itemSize 3, divisor 1), not a scalar radius,
            // so a uniform sphere needs the radius pushed once per axis. Pushing a single value
            // here leaves the buffer a third of the length the draw call expects, which fails as
            // "Vertex buffer is not big enough for the draw call".
            sphere_sizes.push(obj.radius)
            sphere_sizes.push(obj.radius)
            sphere_sizes.push(obj.radius)
            sphereInstanceUseColours.push(true);
            sphereInstance_orientations.push(...IDENTITY_ORIENTATION);
            //sphere_atoms.push(null);
            isphere++;
        } else if(obj.type==="cube"){
            cube_vert_tri.push(...obj.origin)
            cube_col_tri.push(...getObjectColour(obj.colour))
            cube_sizes.push(obj.scale)
            cube_sizes.push(obj.scale)
            cube_sizes.push(obj.scale)
            cubeInstanceUseColours.push(true);
            cubeInstance_orientations.push(...obj.orientation)
            icube++;
        } else if(obj.type==="cylinder"){
            const colour = getObjectColour(obj.colour)
            const startPoint = {
                pos: obj.origin,
                x: obj.origin[0],
                y: obj.origin[1],
                z: obj.origin[2],
                serial: nAtom++,
                colour: colour,
            }
            const endPoint = {
                pos: obj.end,
                x: obj.end[0],
                y: obj.end[1],
                z: obj.end[2],
                serial: nAtom++,
                colour: colour,
            }
            cylinderColours[`${startPoint.serial}`] = colour
            cylinderColours[`${endPoint.serial}`] = colour
            cylinderSizes.push(obj.radius)
            cylinderPairs.push([startPoint, endPoint])
        } else if(obj.type==="cone"){
            const colour = getObjectColour(obj.colour)
            const startPoint = {
                pos: obj.origin,
                x: obj.origin[0],
                y: obj.origin[1],
                z: obj.origin[2],
                serial: nAtom++,
                colour: colour,
            }
            const endPoint = {
                pos: obj.top,
                x: obj.top[0],
                y: obj.top[1],
                z: obj.top[2],
                serial: nAtom++,
                colour: colour,
            }
            coneColours[`${startPoint.serial}`] = colour
            coneColours[`${endPoint.serial}`] = colour
            coneSizes.push(obj.radius)
            conePairs.push([startPoint, endPoint])
        }
    })

    const objects = []

    if (isphere > 0) {
        objects.push({
            atoms: [[sphere_atoms]],
            instance_sizes: [[sphere_sizes]],
            instance_origins: [[sphere_vert_tri]],
            instance_use_colors: [[sphereInstanceUseColours]],
            instance_orientations: [[sphereInstance_orientations]],
            col_tri: [[sphere_col_tri]],
            norm_tri: [[sphere_vert_tri]],
            vert_tri: [[sphere_vert_tri]],
            idx_tri: [[sphere_idx_tri]],
            prim_types: [["PERFECT_SPHERES"]],
        })
    }

    if (icube > 0) {
        objects.push({
            atoms: [[cube_atoms]],
            instance_sizes: [[cube_sizes]],
            instance_origins: [[cube_vert_tri]],
            instance_use_colors: [[cubeInstanceUseColours]],
            instance_orientations: [[cubeInstance_orientations]],
            col_tri: [[cube_col_tri]],
            norm_tri: [[cubeMesh.normals]],
            vert_tri: [[cubeMesh.vertices]],
            idx_tri: [[cubeMesh.idx]],
            prim_types: [["TRIANGLES"]],
        })
    }

    if (cylinderPairs.length > 0) {
        objects.push(
            gemmiAtomPairsToCylindersInfo(
                cylinderPairs,
                0.1,             // fallback radius, unused because cylinderSizes is supplied
                cylinderColours,
                false,           // labelled
                0.01,            // minDist
                1000.0,          // maxDist
                false,           // dashed
                "cylinder",
                cylinderSizes,
                15,              // dashedSteps, unused when not dashed
                undefined,       // NEF
                CYLINDER_ACCU
            )
        )
    }

    if (conePairs.length > 0) {
        objects.push(
            gemmiAtomPairsToCylindersInfo(
                conePairs,
                0.1,             // fallback radius, unused because coneSizes is supplied
                coneColours,
                false,           // labelled
                0.01,            // minDist
                1000.0,          // maxDist
                false,           // dashed
                "cone",
                coneSizes,
                15,              // dashedSteps, unused when not dashed
                undefined,       // NEF
                CYLINDER_ACCU
            )
        )
    }
    console.log(objects)

    return objects

}

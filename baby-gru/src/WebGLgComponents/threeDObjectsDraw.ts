import { gemmiAtomPairsToCylindersInfo, getCube, getHexForCanvasColourName, hexToRGBA } from '../utils/utils'
import {
    ShapeMesh,
    getDodecahedron,
    getFootball,
    getFrustum,
    getIcosahedron,
    getOctahedron,
    getTetrahedron,
    getTorus,
} from './shapeGeometry'
import { RootState } from '@/store'
import { Store } from '@reduxjs/toolkit'

/**
 * Radial accuracy (segments around the axis) used for cylinder geometry. Raise for smoother
 * cylinders at the cost of more vertices.
 */
const CYLINDER_ACCU = 16

/**
 * Segments around the ring and around the tube for torus geometry.
 */
const TORUS_MAJOR_ACCU = 32
const TORUS_MINOR_ACCU = 16

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

/**
 * One instanced draw: a single mesh plus the per-instance attributes of everything sharing it.
 */
type InstanceGroup = {
    mesh: ShapeMesh
    origins: number[]
    sizes: number[]
    orientations: number[]
    colours: number[]
}

export const getThreeDObjectsBuffers = async (store: Store<RootState>): Promise<any>  => {

    const threeDObjects = store.getState().threeDObjects.objects

    // Shapes drawn from a mesh are grouped by that mesh, so that everything sharing one can be
    // drawn in a single instanced call. Shapes whose geometry depends on a parameter - the number
    // of sides of a prism, the taper of a frustum, the tube thickness of a torus - cannot be
    // expressed by the per-instance size alone, so the parameter forms part of the key and each
    // distinct value gets its own mesh. The mesh is only built when a key is first seen.
    const groups = new Map<string, InstanceGroup>()

    const addInstance = (
        key: string,
        buildMesh: () => ShapeMesh,
        origin: number[],
        size: number[],
        orientation: number[],
        colour: number[]
    ) => {
        let group = groups.get(key)
        if (!group) {
            group = { mesh: buildMesh(), origins: [], sizes: [], orientations: [], colours: [] }
            groups.set(key, group)
        }
        group.origins.push(...origin)
        group.sizes.push(...size)
        group.orientations.push(...orientation)
        group.colours.push(...colour)
    }

    /**
     * Frusta and everything that is a special case of one: a prism (both ends the same size), a
     * pyramid (top collapsed to a point) and a truncated pyramid. Keyed so that shapes reaching
     * the same geometry by different routes share a mesh - a prism and a flat frustum whose two
     * radii happen to match are the same solid.
     *
     * The mesh is centred on the origin with unit height, so the instance size carries the base
     * radius and the height, and the orientation turns it on the spot.
     */
    const addFrustumInstance = (
        nSides: number,
        ratio: number,
        flat: boolean,
        origin: number[],
        orientation: number[],
        radius: number,
        height: number,
        colour: number[]
    ) => {
        addInstance(
            `frustum-${nSides}-${ratio}-${flat}`,
            () => getFrustum(nSides, ratio, flat),
            origin,
            [radius, radius, height],
            orientation,
            colour
        )
    }

    // Spheres are drawn as instanced impostors (PERFECT_SPHERES): one instance per sphere, with
    // the geometry supplied by the renderer rather than by us.
    const sphere_sizes = []
    const sphere_col_tri = []
    const sphere_vert_tri = []
    const sphere_idx_tri = []
    const sphere_atoms = []
    const sphereInstanceUseColours = []
    const sphereInstance_orientations = []
    let nsphere = 0

    // Cylinders, cones, prisms and pyramids all reuse gemmiAtomPairsToCylindersInfo, which
    // instances a unit cylinder or cone along each start/end pair. It expects atom-like endpoints
    // keyed by serial, a colour lookup on those serials, and a per-instance radius in
    // individualSizes.
    //
    // A prism is just a cylinder with a polygonal cross section and a pyramid a cone with one, so
    // they are the same two styles with the radial accuracy set to n_sides instead of
    // CYLINDER_ACCU. Accuracy changes the geometry rather than the instance transform, so it has
    // to be part of the grouping key.
    type AxialGroup = {
        style: "cylinder" | "cone"
        accu: number
        pairs: any[]
        colours: { [serial: string]: number[] }
        sizes: number[]
    }
    const axialGroups = new Map<string, AxialGroup>()
    let nAtom = 0

    const addPair = (
        style: "cylinder" | "cone",
        accu: number,
        from: number[],
        to: number[],
        radius: number,
        colour: number[]
    ) => {
        const key = `${style}-${accu}`
        let group = axialGroups.get(key)
        if (!group) {
            group = { style, accu, pairs: [], colours: {}, sizes: [] }
            axialGroups.set(key, group)
        }
        const startPoint = { pos: from, x: from[0], y: from[1], z: from[2], serial: nAtom++, colour }
        const endPoint = { pos: to, x: to[0], y: to[1], z: to[2], serial: nAtom++, colour }
        group.colours[`${startPoint.serial}`] = colour
        group.colours[`${endPoint.serial}`] = colour
        group.sizes.push(radius)
        group.pairs.push([startPoint, endPoint])
    }

    threeDObjects.forEach(obj => {
        const colour = getObjectColour(obj.colour)

        if(obj.type==="sphere"){
            sphere_idx_tri.push(nsphere);
            sphere_vert_tri.push(...obj.origin)
            sphere_col_tri.push(...colour)
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
            nsphere++;

        } else if(obj.type==="cube"){
            addInstance("cube", getCube, obj.origin, [obj.scale, obj.scale, obj.scale], obj.orientation, colour)

        } else if(obj.type==="cuboid"){
            addInstance("cube", getCube, obj.origin, obj.scalexyz, obj.orientation, colour)

        } else if(obj.type==="tetrahedron"){
            addInstance("tetrahedron", getTetrahedron, obj.origin, [obj.scale, obj.scale, obj.scale], obj.orientation, colour)

        } else if(obj.type==="octahedron"){
            addInstance("octahedron", getOctahedron, obj.origin, [obj.scale, obj.scale, obj.scale], obj.orientation, colour)

        } else if(obj.type==="dodecahedron"){
            addInstance("dodecahedron", getDodecahedron, obj.origin, [obj.scale, obj.scale, obj.scale], obj.orientation, colour)

        } else if(obj.type==="icosahedron"){
            addInstance("icosahedron", getIcosahedron, obj.origin, [obj.scale, obj.scale, obj.scale], obj.orientation, colour)

        } else if(obj.type==="football"){
            addInstance("football", getFootball, obj.origin, [obj.scale, obj.scale, obj.scale], obj.orientation, colour)

        } else if(obj.type==="torus"){
            // The mesh has major radius 1, so the instance size is the major radius and the tube
            // thickness has to be baked into the mesh as a ratio.
            const ratio = obj.major_radius !== 0 ? obj.minor_radius / obj.major_radius : 0
            addInstance(
                `torus-${ratio}`,
                () => getTorus(ratio, TORUS_MAJOR_ACCU, TORUS_MINOR_ACCU),
                obj.origin,
                [obj.major_radius, obj.major_radius, obj.major_radius],
                obj.orientation,
                colour
            )

        } else if(obj.type==="frustum" || obj.type==="flatfrustum"){
            // A circular frustum is a truncated cone, a flat-sided one a truncated pyramid: same
            // geometry, differing only in the number of sides and whether the barrel is shaded
            // flat. The mesh has base radius 1, so the taper is a ratio baked into the mesh while
            // the instance size supplies the base radius.
            const flat = obj.type === "flatfrustum"
            const nSides = flat ? obj.n_sides : CYLINDER_ACCU
            const ratio = obj.bottom_radius !== 0 ? obj.top_radius / obj.bottom_radius : 0
            addFrustumInstance(nSides, ratio, flat, obj.origin, obj.orientation, obj.bottom_radius, obj.height, colour)

        } else if(obj.type==="cylinder"){
            addPair("cylinder", CYLINDER_ACCU, obj.origin, obj.end, obj.radius, colour)

        } else if(obj.type==="cone"){
            addPair("cone", CYLINDER_ACCU, obj.origin, obj.top, obj.radius, colour)

        } else if(obj.type==="prism"){
            // A prism is a frustum whose ends are the same size, and a pyramid one whose top has
            // collapsed to a point. Going through the frustum mesh rather than the cylinder path
            // is what gets them flat-lit: getDashedCylinder and getCone give each corner its own
            // radial normal, which is right for a round barrel but smooths away the edges between
            // the flat faces these two are made of.
            addFrustumInstance(obj.n_sides, 1, true, obj.origin, obj.orientation, obj.radius, obj.height, colour)

        } else if(obj.type==="pyramid"){
            addFrustumInstance(obj.n_sides, 0, true, obj.origin, obj.orientation, obj.radius, obj.height, colour)
        }
    })

    const objects = []

    if (nsphere > 0) {
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

    groups.forEach(group => {
        objects.push({
            atoms: [[[]]],
            instance_sizes: [[group.sizes]],
            instance_origins: [[group.origins]],
            instance_use_colors: [[[true]]],
            instance_orientations: [[group.orientations]],
            col_tri: [[group.colours]],
            norm_tri: [[group.mesh.normals]],
            vert_tri: [[group.mesh.vertices]],
            idx_tri: [[group.mesh.idx]],
            prim_types: [["TRIANGLES"]],
        })
    })

    axialGroups.forEach(group => {
        objects.push(
            gemmiAtomPairsToCylindersInfo(
                group.pairs,
                0.1,             // fallback radius, unused because per-instance sizes are supplied
                group.colours,
                false,           // labelled
                0.01,            // minDist
                1000.0,          // maxDist
                false,           // dashed
                group.style,
                group.sizes,
                15,              // dashedSteps, unused when not dashed
                undefined,       // NEF
                group.accu
            )
        )
    })

    return objects

}

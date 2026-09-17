import { gemmiAtomPairsToCylindersInfo, getCube, getHexForCanvasColourName, hexToRGBA } from '../utils/utils'
import {
    ShapeMesh,
    getAnnulus,
    getArc,
    getCapsule,
    getCuboctahedron,
    getDisc,
    getDodecahedron,
    getEllipsoid,
    getFootball,
    getFrustum,
    getHelix,
    getPlane,
    getRhombicDodecahedron,
    getTruncatedOctahedron,
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
 * Segments of longitude and latitude for ellipsoid geometry.
 */
const ELLIPSOID_SLICES = 32
const ELLIPSOID_STACKS = 16

/**
 * Segments around the rim of a disc.
 */
const DISC_ACCU = 32

/**
 * Segments around a capsule, and rings of latitude in each of its hemispherical ends.
 */
const CAPSULE_SLICES = 32
const CAPSULE_CAP_STACKS = 8

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
 * How many points on each instance are offered to the hover test, beyond its centre.
 *
 * One point per object only makes a shape hoverable near that point, which is fine for a compact
 * solid and poor for anything long or hollow - a helix, a long cylinder, a torus whose centre is
 * empty space. Several points spread over the shape make all of it hoverable.
 */
const PICK_POINTS_PER_INSTANCE = 16

/**
 * Sample points spread through a mesh, in its own local space.
 *
 * Taken from the mesh's own vertices rather than from per-shape rules. The generators emit
 * vertices in a natural traversal order - ring by ring around a torus, along the coil of a helix,
 * face by face around a polyhedron - so sampling that list spreads the points over the shape
 * whatever it is, and a new shape needs no special handling.
 *
 * The positions come from a golden-ratio sequence rather than an even stride, because the meshes
 * are built from nested loops and an even stride can align with the inner one: sampling a torus
 * every 64th vertex, with 16 vertices per ring, picks the same angle around the tube every time
 * and lands every point on the z = 0 circle. A low-discrepancy sequence cannot line up with a
 * period like that, and still spreads evenly.
 */
const GOLDEN_RATIO_FRACTION = 0.6180339887498949

const sampleMeshPoints = (mesh: ShapeMesh, count: number): number[][] => {
    const vertexCount = mesh.vertices.length / 3
    if (vertexCount === 0) return []
    const wanted = Math.min(count, vertexCount)
    return Array.from({ length: wanted }, (_unused, i) => {
        const v = Math.floor(vertexCount * ((i * GOLDEN_RATIO_FRACTION) % 1))
        return [mesh.vertices[3 * v], mesh.vertices[3 * v + 1], mesh.vertices[3 * v + 2]]
    })
}

/**
 * Place a point given in a mesh's local space into the world, exactly as the vertex shader does:
 * instancePosition + instanceOrientation * (instanceSize * vertex).
 */
const placeLocalPoint = (local: number[], origin: number[], size: number[], orientation: number[]): number[] => {
    const x = size[0] * local[0]
    const y = size[1] * local[1]
    const z = size[2] * local[2]
    return [
        origin[0] + orientation[0] * x + orientation[4] * y + orientation[8] * z,
        origin[1] + orientation[1] * x + orientation[5] * y + orientation[9] * z,
        origin[2] + orientation[2] * x + orientation[6] * y + orientation[10] * z,
    ]
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

        if(obj.type==="cube"){
            addInstance("cube", getCube, obj.origin, [obj.scale, obj.scale, obj.scale], obj.orientation, colour)

        } else if(obj.type==="cuboid"){
            addInstance("cube", getCube, obj.origin, obj.scalexyz, obj.orientation, colour)

        } else if(obj.type==="plane"){
            // The mesh is a unit square, so the instance size gives the two side lengths. The z
            // component is forced to 1 rather than taken from scalexyz: the shape has no
            // thickness, and a zero z would collapse the two faces back onto each other.
            addInstance(
                "plane",
                getPlane,
                obj.origin,
                [obj.scalexyz[0], obj.scalexyz[1], 1],
                obj.orientation,
                colour
            )

        } else if(obj.type==="disc"){
            addInstance(
                `disc-${DISC_ACCU}`,
                () => getDisc(DISC_ACCU),
                obj.origin,
                [obj.radius, obj.radius, obj.radius],
                obj.orientation,
                colour
            )

        } else if(obj.type==="annulus"){
            // The hole is a proportion of the outer radius baked into the mesh, so that the
            // instance size can carry the outer radius - the same ratio trick as the torus.
            const ratio = obj.radius !== 0 ? obj.inner_radius / obj.radius : 0
            addInstance(
                `annulus-${ratio}-${DISC_ACCU}`,
                () => getAnnulus(ratio, DISC_ACCU),
                obj.origin,
                [obj.radius, obj.radius, obj.radius],
                obj.orientation,
                colour
            )

        } else if(obj.type==="arc"){
            // Same ratio trick as the torus: the tube thickness is baked in relative to a major
            // radius of 1, so the instance size can carry the major radius. The sweep changes the
            // geometry too, so it is part of the key.
            const ratio = obj.major_radius !== 0 ? obj.minor_radius / obj.major_radius : 0
            const sweep = (obj.sweep_angle * Math.PI) / 180
            addInstance(
                `arc-${ratio}-${obj.sweep_angle}`,
                () => getArc(ratio, sweep, TORUS_MAJOR_ACCU, TORUS_MINOR_ACCU),
                obj.origin,
                [obj.major_radius, obj.major_radius, obj.major_radius],
                obj.orientation,
                colour
            )

        } else if(obj.type==="capsule"){
            // Baked as a length-to-radius ratio and scaled uniformly: a [r, r, h] instance size
            // would squash the hemispherical ends into ellipsoid caps.
            const ratio = obj.radius !== 0 ? obj.height / obj.radius : 2
            addInstance(
                `capsule-${ratio}`,
                () => getCapsule(ratio, CAPSULE_SLICES, CAPSULE_CAP_STACKS),
                obj.origin,
                [obj.radius, obj.radius, obj.radius],
                obj.orientation,
                colour
            )

        } else if(obj.type==="helix"){
            // Tube thickness and rise are both baked relative to a major radius of 1, so the
            // instance size carries the coil radius.
            const minorRatio = obj.major_radius !== 0 ? obj.minor_radius / obj.major_radius : 0
            const heightRatio = obj.major_radius !== 0 ? obj.height / obj.major_radius : 0
            const sweep = (obj.sweep_angle * Math.PI) / 180
            addInstance(
                `helix-${minorRatio}-${heightRatio}-${obj.sweep_angle}`,
                () => getHelix(minorRatio, heightRatio, sweep, TORUS_MAJOR_ACCU, TORUS_MINOR_ACCU),
                obj.origin,
                [obj.major_radius, obj.major_radius, obj.major_radius],
                obj.orientation,
                colour
            )

        } else if(obj.type==="sphere"){
            // Drawn as an isotropic ellipsoid rather than a PERFECT_SPHERES impostor, because the
            // impostor path has its own shaders with no vHighlight and so cannot be highlighted.
            //
            // The key must describe the *mesh*, not the instance: a unit sphere is the same mesh
            // wherever it sits and whatever its radius, so every sphere - and any isotropic
            // ellipsoid, which produces this same key - shares one mesh and one draw call. Keying
            // on the origin would give each sphere its own buffer, and worse, would mint a new key
            // and rebuild the mesh every time one moved, which during a drag is once a frame.
            addInstance(
                "ellipsoid-1-1-1",
                () => getEllipsoid(1.0, 1.0, 1.0, ELLIPSOID_SLICES, ELLIPSOID_STACKS),
                obj.origin,
                [obj.radius, obj.radius, obj.radius],
                IDENTITY_ORIENTATION,
                colour
            )

        } else if(obj.type==="ellipsoid"){
            // The shader rotates normals but does not scale them, so a non-uniform instance size
            // would leave a squashed sphere lit as a round one. Bake the shape into the mesh as a
            // ratio and scale uniformly instead - the same trick the torus and frustum use. A cube
            // gets away with non-uniform scaling only because its normals are axis-aligned.
            const largest = Math.max(...obj.scalexyz.map(Math.abs)) || 1
            const [rx, ry, rz] = obj.scalexyz.map(s => s / largest)
            addInstance(
                `ellipsoid-${rx}-${ry}-${rz}`,
                () => getEllipsoid(rx, ry, rz, ELLIPSOID_SLICES, ELLIPSOID_STACKS),
                obj.origin,
                [largest, largest, largest],
                obj.orientation,
                colour
            )

        } else if(obj.type==="tetrahedron"){
            addInstance("tetrahedron", getTetrahedron, obj.origin, [obj.scale, obj.scale, obj.scale], obj.orientation, colour)

        } else if(obj.type==="octahedron"){
            addInstance("octahedron", getOctahedron, obj.origin, [obj.scale, obj.scale, obj.scale], obj.orientation, colour)

        } else if(obj.type==="dodecahedron"){
            addInstance("dodecahedron", getDodecahedron, obj.origin, [obj.scale, obj.scale, obj.scale], obj.orientation, colour)

        } else if(obj.type==="icosahedron"){
            addInstance("icosahedron", getIcosahedron, obj.origin, [obj.scale, obj.scale, obj.scale], obj.orientation, colour)

        } else if(obj.type==="truncatedoctahedron"){
            addInstance("truncatedoctahedron", getTruncatedOctahedron, obj.origin, [obj.scale, obj.scale, obj.scale], obj.orientation, colour)

        } else if(obj.type==="cuboctahedron"){
            addInstance("cuboctahedron", getCuboctahedron, obj.origin, [obj.scale, obj.scale, obj.scale], obj.orientation, colour)

        } else if(obj.type==="rhombicdodecahedron"){
            addInstance("rhombicdodecahedron", getRhombicDodecahedron, obj.origin, [obj.scale, obj.scale, obj.scale], obj.orientation, colour)

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
        // Pick points are what make these shapes hoverable: the ray test in getAtomFomMouseXY
        // walks pick_points on every visible buffer and is otherwise indifferent to the geometry.
        //
        // Several points per instance - its centre plus a sample of its surface - so that a long
        // or hollow shape is hoverable over its whole extent. That means the reported index is no
        // longer the instance index, so pick_point_instances carries the mapping the shader needs
        // to compare against gl_InstanceID.
        //
        // No influence weights or triangle lists: a whole instance highlights at once, so there
        // is no per-vertex weight field to supply and nothing needs uploading as a texture.
        const localPoints = [[0, 0, 0], ...sampleMeshPoints(group.mesh, PICK_POINTS_PER_INSTANCE)]
        const pick_points: number[][] = []
        const pick_point_instances: number[] = []
        for (let instance = 0; instance < group.origins.length / 3; instance++) {
            const origin = group.origins.slice(3 * instance, 3 * instance + 3)
            const size = group.sizes.slice(3 * instance, 3 * instance + 3)
            const orientation = group.orientations.slice(16 * instance, 16 * instance + 16)
            localPoints.forEach(local => {
                pick_points.push(placeLocalPoint(local, origin, size, orientation))
                pick_point_instances.push(instance)
            })
        }

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
            pick_info: { pick_points: pick_points, pick_point_instances: pick_point_instances },
        })
    })

    axialGroups.forEach(group => {
        const cylinderInfo = gemmiAtomPairsToCylindersInfo(
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

        // Pick points along each axis, as for the mesh shapes above, so these are hoverable too.
        //
        // Spread from end to end rather than placed at the instance origin:
        // gemmiAtomPairsToCylindersInfo puts the origin at the start of the pair, so a single
        // point there would mean having to hover a cylinder's end cap rather than its body - and
        // one point anywhere would leave a long cylinder hoverable only near that point.
        //
        // The instance index comes from the pair index because that function emits one instance
        // per pair, in order. It can skip a pair whose length falls outside minDist..maxDist, but
        // only when NEF is passed as false, and it is not - which is what keeps these aligned.
        const pick_points: number[][] = []
        const pick_point_instances: number[] = []
        group.pairs.forEach(([from, to], instance) => {
            for (let i = 0; i <= PICK_POINTS_PER_INSTANCE; i++) {
                const t = i / PICK_POINTS_PER_INSTANCE
                pick_points.push([
                    from.x + t * (to.x - from.x),
                    from.y + t * (to.y - from.y),
                    from.z + t * (to.z - from.z),
                ])
                pick_point_instances.push(instance)
            }
        })

        objects.push({
            ...cylinderInfo,
            pick_info: { pick_points: pick_points, pick_point_instances: pick_point_instances },
        })
    })

    return objects

}

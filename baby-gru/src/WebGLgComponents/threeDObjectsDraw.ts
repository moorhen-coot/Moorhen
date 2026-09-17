import { gemmiAtomPairsToCylindersInfo, getCube, getHexForCanvasColourName, hexToRGBA } from '../utils/utils'
import {
    ShapeMesh,
    getAnnulus,
    getAnnulusWireframe,
    getArc,
    getCapsule,
    getCapsuleWireframe,
    getCuboctahedron,
    getDisc,
    getDodecahedron,
    getEllipsoid,
    getEllipsoidWireframe,
    getFootball,
    getFrustum,
    getFrustumWireframe,
    getHelix,
    getHelixWireframe,
    getPlane,
    getRhombicDodecahedron,
    getTruncatedOctahedron,
    getWireframe,
    stretchedMesh,
    getIcosahedron,
    getOctahedron,
    getTetrahedron,
    getTorus,
    getTorusWireframe,
} from './shapeGeometry'
import { DEFAULT_WIREFRAME_RADIUS } from '../store/threeDObjectsSlice'
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
// Wireframe density for the curved shapes. Coarse on purpose: these count hoops, not mesh
// sections, so the wires stay smooth however few of them there are. An odd latitude count puts
// one ring on the equator.
const ELLIPSOID_WIRE_MERIDIANS = 8
const ELLIPSOID_WIRE_LATITUDES = 5
// Lines up the slant of a cylinder, cone or frustum. Its two rims are drawn at CYLINDER_ACCU,
// since they have to read as circles rather than as a count of wires.
const FRUSTUM_WIRE_VERTICALS = 8
// Rings around the tube and circles the long way round, for a torus or arc. Four of the latter
// gives the outer equator, the crown, the inner equator and the underside.
const TORUS_WIRE_CROSS_SECTIONS = 12
const TORUS_WIRE_LONGITUDES = 4
// The same two for a helix, per full turn, so a longer coil gets proportionally more rings.
const HELIX_WIRE_CROSS_SECTIONS = 8
const HELIX_WIRE_LONGITUDES = 4
const CAPSULE_WIRE_MERIDIANS = 8
const ANNULUS_WIRE_SPOKES = 8
// Samples per full turn of a wire path. A meridian is half a turn, so it takes half as many.
const WIRE_PATH_SEGMENTS = 32

/**
 * The instance orientation that takes a z-aligned mesh onto the direction from `from` to `to`.
 *
 * instanceOrientation is a mat4 vertex attribute, and a mat4 attribute takes consecutive vec4s as
 * its columns, so putting the axis in the third column is what rotates z onto it. Either of the
 * other two columns can be any perpendicular, because the wire sets are symmetric about z - only
 * the phase of the slant lines changes, which is not observable.
 *
 * Built directly from an orthonormal frame rather than through utils' getAxisOrientationMatrix,
 * whose Rodrigues form is singular for an axis antiparallel to z and needs a special case there.
 */
const axisOrientation = (from: number[], to: number[]): number[] => {
    const axis = [to[0] - from[0], to[1] - from[1], to[2] - from[2]]
    const norm = Math.hypot(axis[0], axis[1], axis[2]) || 1
    const a = axis.map(c => c / norm)
    // Any reference not parallel to the axis; the swap keeps the cross product well conditioned.
    const r = Math.abs(a[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0]
    const ux = r[1] * a[2] - r[2] * a[1]
    const uy = r[2] * a[0] - r[0] * a[2]
    const uz = r[0] * a[1] - r[1] * a[0]
    const ul = Math.hypot(ux, uy, uz) || 1
    const u = [ux / ul, uy / ul, uz / ul]
    // w = axis x u, so that (u, w, axis) is right-handed and the matrix is a rotation: the shader
    // rotates normals with it, so a reflection here would turn the lighting inside out.
    const w = [
        a[1] * u[2] - a[2] * u[1],
        a[2] * u[0] - a[0] * u[2],
        a[0] * u[1] - a[1] * u[0],
    ]
    return [u[0], u[1], u[2], 0, w[0], w[1], w[2], 0, a[0], a[1], a[2], 0, 0, 0, 0, 1]
}

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
     * A flat-sided solid, which may be drawn either solid or as a wireframe.
     *
     * The wireframe is just a different mesh derived from the same solid one, so it slots into the
     * instancing exactly as the solid does - same origin, size and orientation. It is keyed
     * separately, so a scene holding both a solid and a wireframe cube builds and draws two
     * meshes rather than one.
     */
    const addFlatSidedInstance = (
        key: string,
        buildMesh: () => ShapeMesh,
        origin: number[],
        size: number[],
        orientation: number[],
        colour: number[],
        wireframe: boolean,
        wireRadius: number
    ) => {
        if (wireframe) {
            // A wireframe is always scaled uniformly, whatever the solid does. An uneven instance
            // size would flatten its round tubes into ellipses, and the thickness asked for would
            // not be the thickness drawn - so uneven proportions are baked into the mesh instead
            // and the instance scales by the largest component. That is what lets a cuboid, a
            // prism or a truncated pyramid keep one pen width all the way round.
            //
            // The thickness is part of the key because it is absolute: two objects of different
            // sizes need different meshes to end up with the same wires, so they no longer share
            // one. Objects of the same size and thickness still do.
            const largest = Math.max(...size.map(Math.abs)) || 1
            const ratios = size.map(s => s / largest)
            const meshRadius = wireRadius / largest
            addInstance(
                `${key}-wireframe-${ratios.join("-")}-${meshRadius}`,
                () => getWireframe(stretchedMesh(buildMesh(), ratios), meshRadius),
                origin,
                [largest, largest, largest],
                orientation,
                colour
            )
        } else {
            addInstance(key, buildMesh, origin, size, orientation, colour)
        }
    }

    /**
     * A wireframe cylinder or cone. Unlike their solids, these are instanced meshes.
     *
     * The solids go through gemmiAtomPairsToCylindersInfo, which places a unit cylinder or cone
     * along the two points itself. A wireframe cannot use that: its tubes have to stay circular,
     * which rules out the [radius, radius, length] instance size that comes with it. So the length
     * is baked into the mesh as a ratio, the instance is scaled uniformly by the radius, and the
     * rotation onto the axis is supplied here - the one thing the point-to-point shapes lack,
     * having no orientation of their own.
     */
    const addAxialWireframe = (
        bottomRatio: number,
        topRatio: number,
        from: number[],
        to: number[],
        radius: number,
        colour: number[],
        wireRadius: number
    ) => {
        const span = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2])
        // Nothing to draw, and both would be a division by zero.
        if (span < 1e-9 || radius <= 0) return
        const heightRatio = span / radius
        const meshRadius = wireRadius / radius
        addInstance(
            `axial-wire-${bottomRatio}-${topRatio}-${heightRatio}-${meshRadius}`,
            () => getFrustumWireframe(
                bottomRatio, topRatio, heightRatio, CYLINDER_ACCU, FRUSTUM_WIRE_VERTICALS,
                meshRadius
            ),
            [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2],
            [radius, radius, radius],
            axisOrientation(from, to),
            colour
        )
    }

    /**
     * Sphere and ellipsoid, either as a surface or as a cage of hoops.
     *
     * Unlike the flat-sided solids, the wireframe is not derived from the solid mesh - a curved
     * surface has no creases to recover - so the two are separate generators rather than one
     * feeding the other.
     *
     * The key describes the mesh alone, so an isotropic ellipsoid shares a mesh and a draw call
     * with every sphere, and a wireframe can never collide with a solid of the same proportions.
     */
    const addEllipsoidInstance = (
        rx: number, ry: number, rz: number,
        origin: number[], size: number[], orientation: number[], colour: number[],
        wireframe: boolean, wireRadius: number
    ) => {
        if (wireframe) {
            // The thickness is wanted in scene units but the mesh is built at unit size, so it has
            // to be divided by the uniform scale the instance will apply. Every curved wireframe
            // below does the same.
            const meshRadius = wireRadius / (Math.max(...size.map(Math.abs)) || 1)
            addInstance(
                `ellipsoid-wire-${rx}-${ry}-${rz}-${meshRadius}`,
                () => getEllipsoidWireframe(
                    rx, ry, rz,
                    ELLIPSOID_WIRE_MERIDIANS, ELLIPSOID_WIRE_LATITUDES, WIRE_PATH_SEGMENTS,
                    meshRadius
                ),
                origin, size, orientation, colour
            )
        } else {
            addInstance(
                `ellipsoid-${rx}-${ry}-${rz}`,
                () => getEllipsoid(rx, ry, rz, ELLIPSOID_SLICES, ELLIPSOID_STACKS),
                origin, size, orientation, colour
            )
        }
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
        colour: number[],
        wireframe: boolean = false,
        wireRadius: number = DEFAULT_WIREFRAME_RADIUS
    ) => {
        addFlatSidedInstance(
            `frustum-${nSides}-${ratio}-${flat}`,
            () => getFrustum(nSides, ratio, flat),
            origin,
            [radius, radius, height],
            orientation,
            colour,
            wireframe,
            wireRadius
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
        // Absent on the shapes that cannot be wireframed, and on anything restored from a session
        // saved before the field existed.
        const wireRadius = "wireframe_radius" in obj && obj.wireframe_radius !== undefined
            ? obj.wireframe_radius
            : DEFAULT_WIREFRAME_RADIUS

        if(obj.type==="cube"){
            addFlatSidedInstance("cube", getCube, obj.origin, [obj.scale, obj.scale, obj.scale], obj.orientation, colour, obj.wireframe, wireRadius)

        } else if(obj.type==="cuboid"){
            addFlatSidedInstance("cube", getCube, obj.origin, obj.scalexyz, obj.orientation, colour, obj.wireframe, wireRadius)

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
            const wire = obj.wireframe === true
            const meshRadius = wireRadius / (obj.radius || 1)
            addInstance(
                wire ? `annulus-wire-${ratio}-${meshRadius}` : `annulus-${ratio}-${DISC_ACCU}`,
                wire
                    ? () => getAnnulusWireframe(
                        ratio, ANNULUS_WIRE_SPOKES, WIRE_PATH_SEGMENTS, meshRadius
                    )
                    : () => getAnnulus(ratio, DISC_ACCU),
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
            const wire = obj.wireframe === true
            const meshRadius = wireRadius / (obj.major_radius || 1)
            addInstance(
                wire
                    ? `arc-wire-${ratio}-${obj.sweep_angle}-${meshRadius}`
                    : `arc-${ratio}-${obj.sweep_angle}`,
                wire
                    ? () => getTorusWireframe(
                        ratio, sweep,
                        TORUS_WIRE_CROSS_SECTIONS, TORUS_WIRE_LONGITUDES, WIRE_PATH_SEGMENTS,
                        meshRadius
                    )
                    : () => getArc(ratio, sweep, TORUS_MAJOR_ACCU, TORUS_MINOR_ACCU),
                obj.origin,
                [obj.major_radius, obj.major_radius, obj.major_radius],
                obj.orientation,
                colour
            )

        } else if(obj.type==="capsule"){
            // Baked as a length-to-radius ratio and scaled uniformly: a [r, r, h] instance size
            // would squash the hemispherical ends into ellipsoid caps.
            const ratio = obj.radius !== 0 ? obj.height / obj.radius : 2
            const wire = obj.wireframe === true
            const meshRadius = wireRadius / (obj.radius || 1)
            addInstance(
                wire ? `capsule-wire-${ratio}-${meshRadius}` : `capsule-${ratio}`,
                wire
                    ? () => getCapsuleWireframe(
                        ratio, CAPSULE_WIRE_MERIDIANS, WIRE_PATH_SEGMENTS, meshRadius
                    )
                    : () => getCapsule(ratio, CAPSULE_SLICES, CAPSULE_CAP_STACKS),
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
            const wire = obj.wireframe === true
            const meshRadius = wireRadius / (obj.major_radius || 1)
            addInstance(
                wire
                    ? `helix-wire-${minorRatio}-${heightRatio}-${obj.sweep_angle}-${meshRadius}`
                    : `helix-${minorRatio}-${heightRatio}-${obj.sweep_angle}`,
                wire
                    ? () => getHelixWireframe(
                        minorRatio, heightRatio, sweep,
                        HELIX_WIRE_CROSS_SECTIONS, HELIX_WIRE_LONGITUDES, WIRE_PATH_SEGMENTS,
                        meshRadius
                    )
                    : () => getHelix(minorRatio, heightRatio, sweep, TORUS_MAJOR_ACCU, TORUS_MINOR_ACCU),
                obj.origin,
                [obj.major_radius, obj.major_radius, obj.major_radius],
                obj.orientation,
                colour
            )

        } else if(obj.type==="sphere"){
            // Drawn as an isotropic ellipsoid rather than a PERFECT_SPHERES impostor, because the
            // impostor path has its own shaders with no vHighlight and so cannot be highlighted.
            //
            // The radius rides on the instance size rather than on the mesh key, so every sphere
            // shares one mesh and one draw call. Keying on the origin instead would give each
            // sphere its own buffer and, worse, would mint a new key and rebuild the mesh every
            // time one moved - during a drag, once a frame.
            addEllipsoidInstance(
                1, 1, 1,
                obj.origin,
                [obj.radius, obj.radius, obj.radius],
                IDENTITY_ORIENTATION,
                colour,
                obj.wireframe === true,
                wireRadius
            )

        } else if(obj.type==="ellipsoid"){
            // The shader rotates normals but does not scale them, so a non-uniform instance size
            // would leave a squashed sphere lit as a round one. Bake the shape into the mesh as a
            // ratio and scale uniformly instead - the same trick the torus and frustum use. A cube
            // gets away with non-uniform scaling only because its normals are axis-aligned.
            const largest = Math.max(...obj.scalexyz.map(Math.abs)) || 1
            const [rx, ry, rz] = obj.scalexyz.map(s => s / largest)
            addEllipsoidInstance(
                rx, ry, rz,
                obj.origin,
                [largest, largest, largest],
                obj.orientation,
                colour,
                obj.wireframe === true,
                wireRadius
            )

        } else if(obj.type==="tetrahedron"){
            addFlatSidedInstance("tetrahedron", getTetrahedron, obj.origin, [obj.scale, obj.scale, obj.scale], obj.orientation, colour, obj.wireframe, wireRadius)

        } else if(obj.type==="octahedron"){
            addFlatSidedInstance("octahedron", getOctahedron, obj.origin, [obj.scale, obj.scale, obj.scale], obj.orientation, colour, obj.wireframe, wireRadius)

        } else if(obj.type==="dodecahedron"){
            addFlatSidedInstance("dodecahedron", getDodecahedron, obj.origin, [obj.scale, obj.scale, obj.scale], obj.orientation, colour, obj.wireframe, wireRadius)

        } else if(obj.type==="icosahedron"){
            addFlatSidedInstance("icosahedron", getIcosahedron, obj.origin, [obj.scale, obj.scale, obj.scale], obj.orientation, colour, obj.wireframe, wireRadius)

        } else if(obj.type==="truncatedoctahedron"){
            addFlatSidedInstance("truncatedoctahedron", getTruncatedOctahedron, obj.origin, [obj.scale, obj.scale, obj.scale], obj.orientation, colour, obj.wireframe, wireRadius)

        } else if(obj.type==="cuboctahedron"){
            addFlatSidedInstance("cuboctahedron", getCuboctahedron, obj.origin, [obj.scale, obj.scale, obj.scale], obj.orientation, colour, obj.wireframe, wireRadius)

        } else if(obj.type==="rhombicdodecahedron"){
            addFlatSidedInstance("rhombicdodecahedron", getRhombicDodecahedron, obj.origin, [obj.scale, obj.scale, obj.scale], obj.orientation, colour, obj.wireframe, wireRadius)

        } else if(obj.type==="football"){
            addFlatSidedInstance("football", getFootball, obj.origin, [obj.scale, obj.scale, obj.scale], obj.orientation, colour, obj.wireframe, wireRadius)

        } else if(obj.type==="torus"){
            // The mesh has major radius 1, so the instance size is the major radius and the tube
            // thickness has to be baked into the mesh as a ratio.
            const ratio = obj.major_radius !== 0 ? obj.minor_radius / obj.major_radius : 0
            const wire = obj.wireframe === true
            const meshRadius = wireRadius / (obj.major_radius || 1)
            addInstance(
                wire ? `torus-wire-${ratio}-${meshRadius}` : `torus-${ratio}`,
                wire
                    ? () => getTorusWireframe(
                        ratio, 2 * Math.PI,
                        TORUS_WIRE_CROSS_SECTIONS, TORUS_WIRE_LONGITUDES, WIRE_PATH_SEGMENTS,
                        meshRadius
                    )
                    : () => getTorus(ratio, TORUS_MAJOR_ACCU, TORUS_MINOR_ACCU),
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
            if(!flat && obj.wireframe === true){
                // The round frustum's cage is stated parametrically, and so has to be scaled
                // uniformly to keep its tubes circular - hence ratios against the larger rim
                // rather than against the base, which lets a frustum stand on a point.
                const largest = Math.max(obj.bottom_radius, obj.top_radius)
                if(largest > 0){
                    const bottom = obj.bottom_radius / largest
                    const top = obj.top_radius / largest
                    const height = obj.height / largest
                    const meshRadius = wireRadius / largest
                    addInstance(
                        `frustum-wire-${bottom}-${top}-${height}-${meshRadius}`,
                        () => getFrustumWireframe(
                            bottom, top, height, CYLINDER_ACCU, FRUSTUM_WIRE_VERTICALS, meshRadius
                        ),
                        obj.origin,
                        [largest, largest, largest],
                        obj.orientation,
                        colour
                    )
                }
            } else {
                addFrustumInstance(nSides, ratio, flat, obj.origin, obj.orientation, obj.bottom_radius, obj.height, colour,
                                   flat ? obj.wireframe : false, wireRadius)
            }

        } else if(obj.type==="cylinder"){
            if(obj.wireframe === true){
                addAxialWireframe(1, 1, obj.origin, obj.end, obj.radius, colour, wireRadius)
            } else {
                addPair("cylinder", CYLINDER_ACCU, obj.origin, obj.end, obj.radius, colour)
            }

        } else if(obj.type==="cone"){
            // A cone is a frustum whose top has closed up, so its cage is one rim and the slant
            // lines converging on the apex.
            if(obj.wireframe === true){
                addAxialWireframe(1, 0, obj.origin, obj.top, obj.radius, colour, wireRadius)
            } else {
                addPair("cone", CYLINDER_ACCU, obj.origin, obj.top, obj.radius, colour)
            }

        } else if(obj.type==="prism"){
            // A prism is a frustum whose ends are the same size, and a pyramid one whose top has
            // collapsed to a point. Going through the frustum mesh rather than the cylinder path
            // is what gets them flat-lit: getDashedCylinder and getCone give each corner its own
            // radial normal, which is right for a round barrel but smooths away the edges between
            // the flat faces these two are made of.
            addFrustumInstance(obj.n_sides, 1, true, obj.origin, obj.orientation, obj.radius, obj.height, colour, obj.wireframe, wireRadius)

        } else if(obj.type==="pyramid"){
            addFrustumInstance(obj.n_sides, 0, true, obj.origin, obj.orientation, obj.radius, obj.height, colour, obj.wireframe, wireRadius)
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

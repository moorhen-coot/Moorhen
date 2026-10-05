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
    getPathTubes,
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
import { IDENTITY_ORIENTATION, PICK_POINTS_PER_INSTANCE, createMeshInstances } from './meshInstancing'
import { DEFAULT_WIREFRAME_RADIUS, MeshObject, PathObject, ThreeDObject } from '../store/threeDObjectsSlice'
import { MOORHEN_3D_OBJECT_TAG_KIND } from '../utils/enums'
import { wholeMeshPickInfo } from './wholeMeshPick'
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
 * Segments around a path primitive's tube. More than a wireframe wire gets, because a path is the
 * object you are looking at rather than a hairline tracing one, and six sides on something drawn
 * at a radius you can see reads as a hexagonal rod.
 */
const PATH_TUBE_SIDES = 12

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
 * Path tubes kept between rebuilds, so that moving a path does not regenerate it.
 *
 * Every change to any object rebuilds every object, which for a backbone trace means sweeping a
 * tube along thousands of points - tens of milliseconds, once per frame of a drag, to produce
 * the geometry that was already there. Only the points and the tube's own dimensions decide
 * that geometry: where the path sits, which way it faces and what colour it is are all
 * per-instance, applied after the fact.
 *
 * Recognising "the same points" is a reference comparison rather than a scan, because that is
 * exactly what a reducer gives us - `{...object, origin: somewhere}` copies the reference to
 * the points array, so an untouched array is the same array. Comparing contents would cost more
 * than the rebuild it saves.
 *
 * Pruned at the end of every pass to the paths actually drawn, so it holds one entry per path
 * on screen and cannot grow.
 */
type PathMeshEntry = {
    points: number[]
    runStarts: number[] | undefined
    radius: number
    innerRadius: number
    stride: number
    mesh: ReturnType<typeof getPathTubes>
}


/**
 * Per-vertex normals from the faces, for a mesh that brought none of its own.
 *
 * Each vertex takes the sum of the normals of the faces it belongs to, which gives a smooth
 * surface where faces meet at a shallow angle and is the usual thing to do when a file omits
 * them. A vertex no triangle refers to is left pointing up rather than at nothing, so a stray
 * vertex cannot produce a NaN that spreads through the lighting.
 */
const faceNormals = (vertices: number[], indices: number[]): number[] => {
    const count = Math.floor(vertices.length / 3)
    const normals = new Array<number>(count * 3).fill(0)
    for (let t = 0; t + 2 < indices.length; t += 3) {
        const [a, b, c] = [indices[t], indices[t + 1], indices[t + 2]]
        if (a >= count || b >= count || c >= count) continue
        const ab = [0, 1, 2].map(i => vertices[3 * b + i] - vertices[3 * a + i])
        const ac = [0, 1, 2].map(i => vertices[3 * c + i] - vertices[3 * a + i])
        const n = [
            ab[1] * ac[2] - ab[2] * ac[1],
            ab[2] * ac[0] - ab[0] * ac[2],
            ab[0] * ac[1] - ab[1] * ac[0]
        ]
        for (const v of [a, b, c]) {
            for (let i = 0; i < 3; i++) normals[3 * v + i] += n[i]
        }
    }
    for (let v = 0; v < count; v++) {
        const length = Math.hypot(normals[3 * v], normals[3 * v + 1], normals[3 * v + 2])
        if (length > 0) {
            for (let i = 0; i < 3; i++) normals[3 * v + i] /= length
        } else {
            normals[3 * v + 1] = 1
        }
    }
    return normals
}

/**
 * Options for turning shapes into buffers.
 *
 * Both of these exist because the builder is no longer the scene's alone. A molecule
 * representation that draws itself out of cuboids and cylinders wants this machinery without any
 * of the store behind it, and two callers sharing one tag kind and one cache would tread on each
 * other.
 */
export interface ShapeBufferOptions {
    /**
     * What a click on one of these shapes should be reported as.
     *
     * The scene's own objects use MOORHEN_3D_OBJECT_TAG_KIND, so a click resolves to the object
     * that was clicked. A representation drawing shapes per residue wants its own kind, so a
     * click resolves to a residue instead.
     */
    tagKind?: string
    /**
     * Where to keep path tubes between passes.
     *
     * Build a path's tube once and reuse it while its points are unchanged. The cache must
     * belong to the caller: the prune at the end of a pass drops every entry not drawn in THAT
     * pass, so one shared cache between two callers would have each of them continually deleting
     * the other's tubes and rebuilding them next frame.
     *
     * Omit it and a cache is made for this call alone, which is the right thing for shapes that
     * are generated fresh each time and would otherwise accumulate.
     */
    pathCache?: Map<string, PathMeshEntry>
}

/** The cache for the scene's own objects, which persist between passes. */
const scenePathMeshCache = new Map<string, PathMeshEntry>()

/**
 * The scene's 3D objects, as buffers.
 *
 * A thin wrapper over {@link getBuffersForShapes}: all it decides is where the shapes come from.
 */
export const getThreeDObjectsBuffers = async (store: Store<RootState>): Promise<any> =>
    getBuffersForShapes(store.getState().threeDObjects.objects, {
        tagKind: MOORHEN_3D_OBJECT_TAG_KIND,
        pathCache: scenePathMeshCache
    })

/**
 * Shapes to buffers, knowing nothing about where the shapes came from.
 *
 * Takes a plain list, so a caller that generates shapes on the fly - a representation built out
 * of cuboids and cylinders, say - gets the same drawing for free without putting anything in the
 * store or into a saved session.
 *
 * @param threeDObjects - The shapes to draw. Only read; nothing is kept.
 * @param options - See {@link ShapeBufferOptions}.
 */
export const getBuffersForShapes = async (
    threeDObjects: ThreeDObject[],
    options: ShapeBufferOptions = {}
): Promise<any>  => {

    const tagKind = options.tagKind ?? MOORHEN_3D_OBJECT_TAG_KIND
    const pathMeshCache = options.pathCache ?? new Map<string, PathMeshEntry>()

    // Meshes are collected here and emitted as instanced draws at the end.
    //
    // Every instance is labelled with the object it came from, so that a click on one can be
    // traced back to the thing that was clicked. The label is opaque to the instancing code,
    // which is why the scheme has to be named here.
    const meshes = createMeshInstances(tagKind)
    const addInstance = meshes.addInstance

    /**
     * The object currently being turned into instances.
     *
     * The axial shapes do not go through the mesh instancer - they are built by
     * gemmiAtomPairsToCylindersInfo at the end, long after the loop has moved on - so their
     * labels have to be collected as the pairs are, and this is what they read.
     */
    let currentObjectId: string | null = null

    /** The paths drawn this pass, so the cache can drop any that have gone. */
    const pathsSeen = new Set<string>()

    /** A path's tube, built only if this path's geometry is not the one already in hand. */
    const cachedPathTubes = (obj: PathObject) => {
        const radius = obj.radius
        const innerRadius = obj.inner_radius ?? 0
        const stride = Math.max(1, obj.point_stride ?? 1)
        const held = pathMeshCache.get(obj.uniqueId)
        if (
            held
            && held.points === obj.points
            && held.runStarts === obj.run_starts
            && held.radius === radius
            && held.innerRadius === innerRadius
            && held.stride === stride
        ) {
            return held.mesh
        }
        const mesh = getPathTubes(
            obj.points, obj.run_starts ?? [], radius, PATH_TUBE_SIDES, innerRadius, stride
        )
        pathMeshCache.set(obj.uniqueId, {
            points: obj.points,
            runStarts: obj.run_starts,
            radius, innerRadius, stride, mesh,
        })
        return mesh
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
        // Parallel with pairs, because that function emits one instance per pair in order.
        tags: string[]
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
            group = { style, accu, pairs: [], colours: {}, sizes: [], tags: [] }
            axialGroups.set(key, group)
        }
        group.tags.push(currentObjectId ?? "")
        const startPoint = { pos: from, x: from[0], y: from[1], z: from[2], serial: nAtom++, colour }
        const endPoint = { pos: to, x: to[0], y: to[1], z: to[2], serial: nAtom++, colour }
        group.colours[`${startPoint.serial}`] = colour
        group.colours[`${endPoint.serial}`] = colour
        group.sizes.push(radius)
        group.pairs.push([startPoint, endPoint])
    }

    threeDObjects.forEach(obj => {
        // Everything added below belongs to this object, however many instances it turns into.
        currentObjectId = obj.uniqueId
        meshes.setInstanceTag(obj.uniqueId)
        const colour = getObjectColour(obj.colour)
        // The wire thickness every wireframe route below starts from, in scene units. Absent on
        // the shapes that cannot be wireframed, and on anything restored from a session saved
        // before the field existed. Each route divides it by the uniform scale it is about to
        // apply - see the WIREFRAMES note at the top of shapeGeometry.ts for why that scale has
        // to be uniform and why the result belongs in the mesh key.
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
            //
            // The texture is part of the key. A group is one instanced draw call sharing one
            // mesh, so there is nowhere for a second texture to go - planes with different
            // textures have to be different groups, identical geometry notwithstanding.
            addInstance(
                obj.texture ? `plane|${obj.texture}` : "plane",
                getPlane,
                obj.origin,
                [obj.scalexyz[0], obj.scalexyz[1], 1],
                obj.orientation,
                colour,
                obj.texture ? { baseColourTexture: obj.texture } : undefined
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

        } else if(obj.type==="path"){
            // The points are the geometry, already in scene units relative to the origin, so
            // there is no canonical mesh to scale and nothing to share with any other object:
            // one mesh per path, keyed by its id. That costs nothing, because `groups` lives for
            // a single rebuild - every mesh here is built afresh each time the objects change -
            // so the key only has to be unique within one pass, not stable across them.
            //
            // The origin still comes from the instance, so a path can be dragged with the same
            // control as everything else.
            if(obj.points && obj.points.length >= 6){
                pathsSeen.add(obj.uniqueId)
                addInstance(
                    `path-${obj.uniqueId}`,
                    () => cachedPathTubes(obj),
                    obj.origin,
                    [1, 1, 1],
                    // A path has no orientation of its own: its points say where it is.
                    IDENTITY_ORIENTATION,
                    colour
                )
                // Attached after the fact because they belong to the object rather than to its
                // geometry: the mesh generators have no business knowing about them.
                const pathGroup = meshes.group(`path-${obj.uniqueId}`)
                if(pathGroup){
                    pathGroup.tags = obj.section_tags
                    pathGroup.tagKind = obj.tag_kind
                }
            }

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

    meshes.emit(objects)

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
            pick_info: {
                pick_points: pick_points,
                pick_point_instances: pick_point_instances,
                instance_tags: group.tags,
                instance_tag_kind: tagKind,
            },
        })
    })

    // Meshes, which do not go through the instancer at all.
    //
    // Instancing shares one mesh between many placements and gives each a single colour. A mesh
    // object is the opposite case on both counts: its geometry is its own, and its vertices may
    // be individually coloured. So each is emitted as a plain buffer of its own, exactly as a
    // molecular surface or a cavity is, and picked whole by the same means.
    threeDObjects.filter(obj => obj.type === "mesh").forEach(obj => {
        const mesh = obj as MeshObject
        const scale = mesh.scale ?? 1
        const count = Math.floor(mesh.vertices.length / 3)
        if (count === 0 || mesh.indices.length < 3) return

        // Placed here rather than by an instance transform, since there is no instance.
        const vertices = new Array<number>(count * 3)
        for (let v = 0; v < count; v++) {
            for (let c = 0; c < 3; c++) {
                vertices[3 * v + c] = mesh.origin[c] + mesh.vertices[3 * v + c] * scale
            }
        }

        const normals = mesh.normals?.length === count * 3
            ? mesh.normals
            : faceNormals(mesh.vertices, mesh.indices)

        let colours: number[]
        if (mesh.colours?.length === count * 4) {
            colours = mesh.colours
        } else {
            // No colours of its own, so the object's single colour stands for every vertex -
            // which is what keeps a plain mesh recolourable as one thing.
            const [r, g, b, a] = getObjectColour(mesh.colour)
            colours = new Array<number>(count * 4)
            for (let v = 0; v < count; v++) {
                colours[4 * v] = r
                colours[4 * v + 1] = g
                colours[4 * v + 2] = b
                colours[4 * v + 3] = a
            }
        }

        // Texture coordinates and a material, only when the mesh has both and the coordinates
        // describe these vertices. One pair per vertex is the whole requirement; a mismatch means
        // the two disagree, and drawing it untextured is better than reading the attribute past
        // the end of its buffer.
        const hasTexCoords = mesh.texCoords?.length === count * 2
        const textured = hasTexCoords && !!mesh.texture

        const pick_info = wholeMeshPickInfo(vertices)
        objects.push({
            prim_types: [["TRIANGLES"]],
            idx_tri: [[mesh.indices]],
            vert_tri: [[vertices]],
            norm_tri: [[normals]],
            col_tri: [[colours]],
            ...(textured
                ? { tex_tri: [[mesh.texCoords]], materials: [[{ baseColourTexture: mesh.texture }]] }
                : {}),
            ...(pick_info
                ? { pick_info: { ...pick_info, instance_tags: [mesh.uniqueId], instance_tag_kind: tagKind } }
                : {})
        })
    })

    // Forget any path that is no longer drawn, so the cache tracks the scene rather than
    // everything the scene has ever contained.
    pathMeshCache.forEach((_entry, id) => {
        if (!pathsSeen.has(id)) pathMeshCache.delete(id)
    })

    return objects

}

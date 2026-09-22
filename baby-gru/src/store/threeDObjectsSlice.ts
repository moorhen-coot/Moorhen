import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type Position3D = [number, number, number];
export type Scale3D = [number, number, number];
export type Matrix4x4 = [number, number, number, number,
                           number, number, number, number,
                           number, number, number, number,
                           number, number, number, number,
                          ];

interface ThreeDObjectBase {
    uniqueId: string;
    origin: Position3D;
    colour: string;
}

/**
 * Shapes that can be drawn as a wireframe rather than as a surface.
 *
 * How the wires are found differs by shape. A flat-sided solid has real edges, recovered from the
 * mesh as its creases (see getWireframe). A curved shape has no creases to recover - every edge of
 * a sphere's triangulation is one - so its wires are stated parametrically instead, as hoops
 * following the surface (see getEllipsoidWireframe), which also decouples wire density from
 * tessellation.
 *
 * Deliberately not on ThreeDObjectBase: a disc and a plane are the two shapes left out, because
 * each has nothing but an outline, so a wireframe of one would throw the shape away rather than
 * reveal it. An annulus is flat too but has two rims with a surface between them, so it earns a
 * cage of its own.
 */
interface Wireframeable {
    wireframe: boolean;
    /**
     * Tube radius of the wires, in scene units. An absolute thickness rather than a proportion of
     * the shape, so that a large object and a small one wireframed side by side look drawn with
     * the same pen.
     *
     * Optional because an object restored from a session saved before this existed has no value
     * for it, in which case DEFAULT_WIREFRAME_RADIUS stands in.
     */
    wireframe_radius?: number;
}

/**
 * The tube radius used when an object does not give one, in scene units. Chosen to match what the
 * wires of a football of scale 16 came out as when thickness was 2% of the shape's own radius,
 * which is where this started.
 */
export const DEFAULT_WIREFRAME_RADIUS = 0.16;

export interface SphereObject extends ThreeDObjectBase, Wireframeable {
    type: "sphere";
    radius: number;
}

export interface CylinderObject extends ThreeDObjectBase, Wireframeable {
    type: "cylinder";
    end: Position3D;
    radius: number;
}

export interface ConeObject extends ThreeDObjectBase, Wireframeable {
    type: "cone";
    top: Position3D;
    radius: number;
}

// The shapes below are positioned like the closed solids rather than like a cylinder: `origin` is
// the centre of the shape and `orientation` turns it, with `height` giving its extent along the
// shape's own z axis. Defining them by a start and end point would pin down that axis but leave
// the rotation about it unspecified, so there would be no way to turn a square prism on the spot.
export interface FrustumObject extends ThreeDObjectBase, Wireframeable {
    type: "frustum";
    orientation: Matrix4x4;
    bottom_radius: number;
    top_radius: number;
    height: number;
}

export interface FlatSidedFrustumObject extends ThreeDObjectBase, Wireframeable {
    type: "flatfrustum";
    orientation: Matrix4x4;
    bottom_radius: number;
    top_radius: number;
    height: number;
    n_sides: number;
}

export interface PrismObject extends ThreeDObjectBase, Wireframeable {
    type: "prism";
    orientation: Matrix4x4;
    radius: number;
    height: number;
    n_sides: number;
}

export interface PyramidObject extends ThreeDObjectBase, Wireframeable {
    type: "pyramid";
    orientation: Matrix4x4;
    radius: number;
    height: number;
    n_sides: number;
}

export interface CubeObject extends ThreeDObjectBase, Wireframeable {
    type: "cube";
    orientation: Matrix4x4;
    scale: number;
}

export interface CuboidObject extends ThreeDObjectBase, Wireframeable {
    type: "cuboid";
    orientation: Matrix4x4;
    scalexyz: Scale3D;
}

/** A sphere with independent x, y and z semi-axes; equal axes give a sphere. */
export interface EllipsoidObject extends ThreeDObjectBase, Wireframeable {
    type: "ellipsoid";
    orientation: Matrix4x4;
    scalexyz: Scale3D;
}

/**
 * A flat rectangle. The x and y components of `scalexyz` are its side lengths; z is unused, since
 * the shape has no thickness.
 */
export interface PlaneObject extends ThreeDObjectBase {
    type: "plane";
    orientation: Matrix4x4;
    scalexyz: Scale3D;
}

/** A flat filled circle. */
export interface DiscObject extends ThreeDObjectBase {
    type: "disc";
    orientation: Matrix4x4;
    radius: number;
}

/** A flat ring: a disc with a concentric hole. `radius` is the outer radius. */
export interface AnnulusObject extends ThreeDObjectBase, Wireframeable {
    type: "annulus";
    orientation: Matrix4x4;
    radius: number;
    inner_radius: number;
}

export interface TetrahedronObject extends ThreeDObjectBase, Wireframeable {
    type: "tetrahedron";
    orientation: Matrix4x4;
    scale: number;
}

export interface OctahedronObject extends ThreeDObjectBase, Wireframeable {
    type: "octahedron";
    orientation:Matrix4x4;
    scale: number;
}

export interface DodecahedronObject extends ThreeDObjectBase, Wireframeable {
    type: "dodecahedron";
    orientation: Matrix4x4;
    scale: number;
}

export interface IcosahedronObject extends ThreeDObjectBase, Wireframeable {
    type: "icosahedron";
    orientation: Matrix4x4;
    scale: number;
}

export interface FootballObject extends ThreeDObjectBase, Wireframeable {
    type: "football";
    orientation: Matrix4x4;
    scale: number;
}

/** A truncated octahedron: 8 hexagons and 6 squares. A BCC periodic boundary cell. */
export interface TruncatedOctahedronObject extends ThreeDObjectBase, Wireframeable {
    type: "truncatedoctahedron";
    orientation: Matrix4x4;
    scale: number;
}

/** A cuboctahedron: 8 triangles and 6 squares - a cube with its corners cut back. */
export interface CuboctahedronObject extends ThreeDObjectBase, Wireframeable {
    type: "cuboctahedron";
    orientation: Matrix4x4;
    scale: number;
}

/** A rhombic dodecahedron: 12 rhombic faces. An FCC periodic boundary cell. */
export interface RhombicDodecahedronObject extends ThreeDObjectBase, Wireframeable {
    type: "rhombicdodecahedron";
    orientation: Matrix4x4;
    scale: number;
}

/** A cylinder with hemispherical ends. `height` is the total end-to-end length. */
export interface CapsuleObject extends ThreeDObjectBase, Wireframeable {
    type: "capsule";
    orientation: Matrix4x4;
    radius: number;
    height: number;
}

/**
 * A tube following a helical path - an arc that rises. `major_radius` is the coil radius,
 * `minor_radius` the tube radius, `height` the total rise and `sweep_angle` the total angle in
 * degrees, so 720 is two turns.
 */
export interface HelixObject extends ThreeDObjectBase, Wireframeable {
    type: "helix";
    orientation: Matrix4x4;
    major_radius: number;
    minor_radius: number;
    height: number;
    sweep_angle: number;
}

/**
 * A segment of a torus. `sweep_angle` is in degrees; a full 360 gives a closed ring. The
 * orientation decides where the arc starts, so there is no separate start angle.
 */
export interface ArcObject extends ThreeDObjectBase, Wireframeable {
    type: "arc";
    orientation: Matrix4x4;
    major_radius: number;
    minor_radius: number;
    sweep_angle: number;
}

/**
 * A tube following an explicit list of points - the one shape whose geometry is data rather than
 * parameters, and so the one that can hold anything: a CA trace, a curve through other objects,
 * an imported path.
 *
 * It stores exactly what tubesAlongPaths consumes and nothing more. `points` is flat x, y, z
 * triples relative to `origin`, and `run_starts` the point index at which each separate strand
 * begins, so one path can hold several disconnected runs.
 *
 * Deliberately has no orientation, unlike every other shape here. A rotation is already
 * expressible in the points, so storing one as well would be two ways of saying where the
 * geometry is, and every consumer would have to remember to combine them - the sort of
 * redundancy that is only ever noticed when one of them forgets. How the points were arrived at - from
 * which molecule, smoothed or raw - is deliberately not recorded: that belongs to whatever
 * generated them, and baking it in here would make the primitive about CA traces instead of
 * about paths.
 *
 * Not Wireframeable: a path is already a line, so there is nothing to reduce it to.
 */
export interface PathObject extends ThreeDObjectBase {
    type: "path";
    points: number[];
    run_starts: number[];
    radius: number;
    /**
     * Bore radius. Zero draws a solid rod; anything between zero and `radius` makes it a pipe,
     * with a lit surface down the inside and flat rings closing the ends. Shares the protobuf
     * field the annulus uses, since it means the same thing.
     */
    inner_radius: number;
    /**
     * How many stored points make up one hoverable section, so that smoothing does not change
     * what a section means: a CA trace splined four ways still highlights one residue at a time,
     * while a hand-built path highlights point to point at a stride of 1.
     */
    point_stride: number;
    /**
     * One opaque label per section, and what scheme they are written in.
     *
     * Nothing in the 3D object code reads these - not the geometry, not the draw path, not the
     * pick test. They are carried from whatever generated the path through to whatever consumes
     * a hover, and only the two ends agree on what they mean. That is what keeps a path a path:
     * the CA generator can label its sections with atom identifiers without the primitive
     * acquiring any notion of an atom.
     *
     * `tag_kind` names the scheme so a consumer can recognise its own and ignore the rest.
     */
    section_tags: string[];
    tag_kind: string;
}

export interface TorusObject extends ThreeDObjectBase, Wireframeable {
    type: "torus";
    orientation: Matrix4x4;
    major_radius: number;
    minor_radius: number;
}

/**
 * The types that extend Wireframeable. Kept as a runtime list as well as a type so that the UI
 * and the draw code can ask "does this shape take a wireframe?" without relying on the field
 * being present on the object: objects restored from a session saved before `wireframe` existed
 * have no such key, and a `"wireframe" in obj` test would exclude them for ever.
 */
export const WIREFRAMEABLE_TYPES = [
    "sphere",
    "ellipsoid",
    "cylinder",
    "cone",
    "frustum",
    "torus",
    "arc",
    "helix",
    "capsule",
    "annulus",
    "flatfrustum",
    "prism",
    "pyramid",
    "cube",
    "cuboid",
    "tetrahedron",
    "octahedron",
    "dodecahedron",
    "icosahedron",
    "football",
    "truncatedoctahedron",
    "cuboctahedron",
    "rhombicdodecahedron"
] as const;

export type WireframeableObjectType = typeof WIREFRAMEABLE_TYPES[number];

export const isWireframeableType = (type: string): type is WireframeableObjectType =>
    (WIREFRAMEABLE_TYPES as readonly string[]).includes(type);

export type ThreeDObject =
            | SphereObject
            | CylinderObject
            | ConeObject
            | FrustumObject
            | FlatSidedFrustumObject
            | PrismObject
            | PyramidObject
            | CubeObject
            | CuboidObject
            | EllipsoidObject
            | PlaneObject
            | DiscObject
            | AnnulusObject
            | ArcObject
            | CapsuleObject
            | HelixObject
            | TetrahedronObject
            | OctahedronObject
            | DodecahedronObject
            | IcosahedronObject
            | FootballObject
            | TruncatedOctahedronObject
            | CuboctahedronObject
            | RhombicDodecahedronObject
            | TorusObject
            | PathObject;

/**
 * Where an object sits, for centring the view on it or hanging handles off it.
 *
 * Every shape carries an origin, and for all but three that is its centre by construction. A
 * cylinder and a cone are pinned by their two end points instead, and a path's points are spread
 * around its origin and have to be averaged. No rotation enters into it: a path has no
 * orientation, its points being the whole of where it is.
 */
export const centreOfObject = (obj: ThreeDObject): [number, number, number] => {
    const midpoint = (a: number[], b: number[]): [number, number, number] =>
        [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];

    if (obj.type === "cylinder") return midpoint(obj.origin, obj.end);
    if (obj.type === "cone") return midpoint(obj.origin, obj.top);
    if (obj.type === "path" && obj.points.length >= 3) {
        const count = obj.points.length / 3;
        const mean = [0, 1, 2].map(
            c => obj.points.reduce((total, x, i) => (i % 3 === c ? total + x : total), 0) / count
        );
        return [0, 1, 2].map(i => obj.origin[i] + mean[i]) as [number, number, number];
    }
    return [...obj.origin];
};

/**
 * Roughly how far an object reaches from its centre.
 *
 * Only ever used to keep something else clear of it - the manipulation handles - so it errs
 * generously and does not trouble itself with exact bounds. A closed polyhedron is normalised to
 * a circumradius of half its scale; a box reaches to its corner, which is further than its face.
 */
export const extentOfObject = (obj: ThreeDObject): number => {
    const largest = (values: number[]) => Math.max(...values.map(Math.abs));
    const CORNER = Math.sqrt(3) / 2;

    switch (obj.type) {
        case "sphere":
        case "disc":
            return obj.radius;
        case "annulus":
            return obj.radius;
        case "cylinder":
            return Math.hypot(...obj.end.map((c, i) => (c - obj.origin[i]) / 2)) + obj.radius;
        case "cone":
            return Math.hypot(...obj.top.map((c, i) => (c - obj.origin[i]) / 2)) + obj.radius;
        case "frustum":
        case "flatfrustum":
            return Math.max(obj.bottom_radius, obj.top_radius, obj.height / 2);
        case "prism":
        case "pyramid":
            return Math.max(obj.radius, obj.height / 2);
        case "capsule":
            return Math.max(obj.height / 2, obj.radius);
        case "torus":
        case "arc":
            return obj.major_radius + obj.minor_radius;
        case "helix":
            return Math.max(obj.major_radius + obj.minor_radius, obj.height / 2);
        case "cube":
            return obj.scale * CORNER;
        case "cuboid":
            return largest(obj.scalexyz) * CORNER;
        case "ellipsoid":
        case "plane":
            return largest(obj.scalexyz);
        case "path": {
            const centre = centreOfObject(obj);
            let furthest = 0;
            for (let i = 0; i + 2 < obj.points.length; i += 3) {
                furthest = Math.max(furthest, Math.hypot(
                    obj.origin[0] + obj.points[i] - centre[0],
                    obj.origin[1] + obj.points[i + 1] - centre[1],
                    obj.origin[2] + obj.points[i + 2] - centre[2]
                ));
            }
            return furthest + obj.radius;
        }
        default:
            // The closed polyhedra, all normalised to a circumradius of half their scale.
            return ("scale" in obj ? obj.scale : 1) / 2;
    }
};

/**
 * The shapes that have no orientation, because something else already says which way they face.
 *
 * A sphere looks the same whichever way it is turned; a cylinder and a cone are pinned by their
 * two end points; a path's points are the whole of where it is and how it lies.
 *
 * Kept as the short list rather than the long one, since almost everything does have an
 * orientation and a list of twenty-odd would be the easier of the two to let fall out of date.
 */
const UNORIENTED_TYPES = ["sphere", "cylinder", "cone", "path"] as const;

/**
 * Whether a shape has an orientation to turn, and so is worth giving rotation handles.
 *
 * Decided by the type, not by whether the object happens to carry the field - the same reason
 * `wireframe` is decided by WIREFRAMEABLE_TYPES. An object restored from a session saved before
 * a field was removed still has it, and `"orientation" in obj` believed it: a path from an old
 * session came back with rotation rings that turned an orientation nothing reads, since the path
 * branch of the draw code passes the identity regardless. Asking the type cannot be fooled by
 * stale data in either direction.
 */
export const hasOrientation = (obj: ThreeDObject): boolean =>
    !(UNORIENTED_TYPES as readonly string[]).includes(obj.type);

const initialState: {
    objects: ThreeDObject[];

} = {
    objects: []
};

const threeDObjectsSlice = createSlice({
    name: "threeDObjects",
    initialState: initialState,
    reducers: {

        addObject: (state, action: PayloadAction<ThreeDObject>) => {
            state.objects.push(action.payload);
        },
        removeObject: (state, action: PayloadAction<ThreeDObject>) => {
            state.objects = state.objects.filter(
                item => item.uniqueId !== action.payload.uniqueId
            );
        },
        updateObject: (state, action: PayloadAction<ThreeDObject>) => {
            const index = state.objects.findIndex(
                obj => obj.uniqueId === action.payload.uniqueId
            );
            if (index !== -1) {
                state.objects[index] = action.payload;
            }
        },
        removeObjectById: (state, action: PayloadAction<string>) => {
            state.objects = state.objects.filter(
                item => item.uniqueId !== action.payload
            );
        },
        emptyObjects: state => {
            state.objects = []
        },
    }
});

export const {
    addObject,
    removeObject,
    removeObjectById,
    updateObject,
    emptyObjects,

} = threeDObjectsSlice.actions;

export default threeDObjectsSlice.reducer;

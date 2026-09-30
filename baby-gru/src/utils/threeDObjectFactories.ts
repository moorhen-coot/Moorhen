import { v4 as uuidv4 } from "uuid";
import {
    DEFAULT_WIREFRAME_RADIUS,
    Matrix4x4,
    ThreeDObject,
    AnnulusObject,
    ArcObject,
    CapsuleObject,
    ConeObject,
    CubeObject,
    CuboctahedronObject,
    CuboidObject,
    CylinderObject,
    DiscObject,
    DodecahedronObject,
    EllipsoidObject,
    FlatSidedFrustumObject,
    FootballObject,
    FrustumObject,
    HelixObject,
    IcosahedronObject,
    OctahedronObject,
    PathObject,
    PlaneObject,
    PrismObject,
    PyramidObject,
    RhombicDodecahedronObject,
    SphereObject,
    TetrahedronObject,
    TorusObject,
    TruncatedOctahedronObject,
} from "../store/threeDObjectsSlice";

/**
 * A default object of each shape, in one place.
 *
 * These were declared inside Moorhen3DObjectsModal, which made them unreachable from anywhere
 * else - the public API needs the same defaults, and a second copy of "what a plain sphere is"
 * would drift from this one. They are unchanged by the move: same fields, same values, a fresh
 * uuid per call.
 *
 * Each returns a complete, drawable object, so a caller that wants a sphere of radius 5 can take
 * one of these and overwrite the radius rather than having to know that a sphere also needs an
 * origin, a colour and two wireframe fields.
 */
export const IDENTITY_MATRIX: Matrix4x4 = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
];

export const newSphereObject = (): SphereObject => ({
    uniqueId: uuidv4(),
    type: "sphere",
    wireframe: false,
    wireframe_radius: DEFAULT_WIREFRAME_RADIUS,
    colour: "#ff0000ff",
    origin: [0, 0, 0],
    radius: 1.0
})

export const newCylinderObject = (): CylinderObject => ({
    uniqueId: uuidv4(),
    type: "cylinder",
    wireframe: false,
    wireframe_radius: DEFAULT_WIREFRAME_RADIUS,
    colour: "#ff0000ff",
    origin: [0, 0, 0],
    end: [0, 0, 5],
    radius: 1.0
});

export const newConeObject = (): ConeObject => ({
    uniqueId: uuidv4(),
    type: "cone",
    wireframe: false,
    wireframe_radius: DEFAULT_WIREFRAME_RADIUS,
    colour: "#ff0000ff",
    origin: [0, 0, 0],
    top: [0, 0, 5],
    radius: 1.0
});

export const newFrustumObject = (): FrustumObject => ({
    uniqueId: uuidv4(),
    type: "frustum",
    wireframe: false,
    wireframe_radius: DEFAULT_WIREFRAME_RADIUS,
    colour: "#ff0000ff",
    origin: [0, 0, 0],
    orientation: IDENTITY_MATRIX,
    bottom_radius: 1.0,
    top_radius: 0.5,
    height: 5.0
});

export const newFlatSidedFrustumObject = (): FlatSidedFrustumObject => ({
    uniqueId: uuidv4(),
    type: "flatfrustum",
    wireframe: false,
    wireframe_radius: DEFAULT_WIREFRAME_RADIUS,
    colour: "#ff0000ff",
    origin: [0, 0, 0],
    orientation: IDENTITY_MATRIX,
    bottom_radius: 1.0,
    top_radius: 0.5,
    height: 5.0,
    n_sides: 4
});

export const newPrismObject = (): PrismObject => ({
    uniqueId: uuidv4(),
    type: "prism",
    wireframe: false,
    wireframe_radius: DEFAULT_WIREFRAME_RADIUS,
    colour: "#ff0000ff",
    origin: [0, 0, 0],
    orientation: IDENTITY_MATRIX,
    radius: 1.0,
    height: 5.0,
    n_sides: 4
});

export const newPyramidObject = (): PyramidObject => ({
    uniqueId: uuidv4(),
    type: "pyramid",
    wireframe: false,
    wireframe_radius: DEFAULT_WIREFRAME_RADIUS,
    colour: "#ff0000ff",
    origin: [0, 0, 0],
    orientation: IDENTITY_MATRIX,
    radius: 1.0,
    height: 5.0,
    n_sides: 4
});

export const newCubeObject = (): CubeObject => ({
    uniqueId: uuidv4(),
    type: "cube",
    wireframe: false,
    wireframe_radius: DEFAULT_WIREFRAME_RADIUS,
    colour: "#ff0000ff",
    origin: [0, 0, 0],
    orientation: IDENTITY_MATRIX,
    scale: 1.0
});

export const newCuboidObject = (): CuboidObject => ({
    uniqueId: uuidv4(),
    type: "cuboid",
    wireframe: false,
    wireframe_radius: DEFAULT_WIREFRAME_RADIUS,
    colour: "#ff0000ff",
    origin: [0, 0, 0],
    orientation: IDENTITY_MATRIX,
    scalexyz: [1.0, 1.0, 1.0]
});

export const newEllipsoidObject = (): EllipsoidObject => ({
    uniqueId: uuidv4(),
    type: "ellipsoid",
    wireframe: false,
    wireframe_radius: DEFAULT_WIREFRAME_RADIUS,
    colour: "#ff0000ff",
    origin: [0, 0, 0],
    orientation: IDENTITY_MATRIX,
    scalexyz: [1.0, 1.0, 1.0]
});

export const newPlaneObject = (): PlaneObject => ({
    uniqueId: uuidv4(),
    type: "plane",
    colour: "#ff0000ff",
    origin: [0, 0, 0],
    orientation: IDENTITY_MATRIX,
    // x and y are the side lengths; z is unused, a plane has no thickness
    scalexyz: [5.0, 5.0, 1.0]
});

export const newDiscObject = (): DiscObject => ({
    uniqueId: uuidv4(),
    type: "disc",
    colour: "#ff0000ff",
    origin: [0, 0, 0],
    orientation: IDENTITY_MATRIX,
    radius: 2.5
});

export const newAnnulusObject = (): AnnulusObject => ({
    uniqueId: uuidv4(),
    type: "annulus",
    wireframe: false,
    wireframe_radius: DEFAULT_WIREFRAME_RADIUS,
    colour: "#ff0000ff",
    origin: [0, 0, 0],
    orientation: IDENTITY_MATRIX,
    radius: 2.5,
    inner_radius: 1.5
});

export const newTetrahedronObject = (): TetrahedronObject => ({
    uniqueId: uuidv4(),
    type: "tetrahedron",
    wireframe: false,
    wireframe_radius: DEFAULT_WIREFRAME_RADIUS,
    colour: "#ff0000ff",
    origin: [0, 0, 0],
    orientation: IDENTITY_MATRIX,
    scale: 1.0
});

export const newOctahedronObject = (): OctahedronObject => ({
    uniqueId: uuidv4(),
    type: "octahedron",
    wireframe: false,
    wireframe_radius: DEFAULT_WIREFRAME_RADIUS,
    colour: "#ff0000ff",
    origin: [0, 0, 0],
    orientation: IDENTITY_MATRIX,
    scale: 1.0
});

export const newDodecahedronObject = (): DodecahedronObject => ({
    uniqueId: uuidv4(),
    type: "dodecahedron",
    wireframe: false,
    wireframe_radius: DEFAULT_WIREFRAME_RADIUS,
    colour: "#ff0000ff",
    origin: [0, 0, 0],
    orientation: IDENTITY_MATRIX,
    scale: 1.0
});

export const newIcosahedronObject = (): IcosahedronObject => ({
    uniqueId: uuidv4(),
    type: "icosahedron",
    wireframe: false,
    wireframe_radius: DEFAULT_WIREFRAME_RADIUS,
    colour: "#ff0000ff",
    origin: [0, 0, 0],
    orientation: IDENTITY_MATRIX,
    scale: 1.0
});

export const newFootballObject = (): FootballObject => ({
    uniqueId: uuidv4(),
    type: "football",
    wireframe: false,
    wireframe_radius: DEFAULT_WIREFRAME_RADIUS,
    colour: "#ff0000ff",
    origin: [0, 0, 0],
    orientation: IDENTITY_MATRIX,
    scale: 1.0
});

export const newTruncatedOctahedronObject = (): TruncatedOctahedronObject => ({
    uniqueId: uuidv4(),
    type: "truncatedoctahedron",
    wireframe: false,
    wireframe_radius: DEFAULT_WIREFRAME_RADIUS,
    colour: "#ff0000ff",
    origin: [0, 0, 0],
    orientation: IDENTITY_MATRIX,
    scale: 1.0
});

export const newCuboctahedronObject = (): CuboctahedronObject => ({
    uniqueId: uuidv4(),
    type: "cuboctahedron",
    wireframe: false,
    wireframe_radius: DEFAULT_WIREFRAME_RADIUS,
    colour: "#ff0000ff",
    origin: [0, 0, 0],
    orientation: IDENTITY_MATRIX,
    scale: 1.0
});

export const newRhombicDodecahedronObject = (): RhombicDodecahedronObject => ({
    uniqueId: uuidv4(),
    type: "rhombicdodecahedron",
    wireframe: false,
    wireframe_radius: DEFAULT_WIREFRAME_RADIUS,
    colour: "#ff0000ff",
    origin: [0, 0, 0],
    orientation: IDENTITY_MATRIX,
    scale: 1.0
});

export const newArcObject = (): ArcObject => ({
    uniqueId: uuidv4(),
    type: "arc",
    wireframe: false,
    wireframe_radius: DEFAULT_WIREFRAME_RADIUS,
    colour: "#ff0000ff",
    origin: [0, 0, 0],
    orientation: IDENTITY_MATRIX,
    major_radius: 2.0,
    minor_radius: 0.2,
    sweep_angle: 90.0
});

export const newCapsuleObject = (): CapsuleObject => ({
    uniqueId: uuidv4(),
    type: "capsule",
    wireframe: false,
    wireframe_radius: DEFAULT_WIREFRAME_RADIUS,
    colour: "#ff0000ff",
    origin: [0, 0, 0],
    orientation: IDENTITY_MATRIX,
    radius: 1.0,
    height: 5.0
});

export const newHelixObject = (): HelixObject => ({
    uniqueId: uuidv4(),
    type: "helix",
    wireframe: false,
    wireframe_radius: DEFAULT_WIREFRAME_RADIUS,
    colour: "#ff0000ff",
    origin: [0, 0, 0],
    orientation: IDENTITY_MATRIX,
    major_radius: 2.0,
    minor_radius: 0.3,
    height: 5.0,
    sweep_angle: 720.0
});

export const newPathObject = (): PathObject => ({
    uniqueId: uuidv4(),
    type: "path",
    colour: "#ff0000ff",
    origin: [0, 0, 0],
    // Two points to begin with, so a new path is something you can see and then edit rather
    // than an invisible object waiting for a generator.
    points: [0, 0, 0, 5, 0, 0],
    run_starts: [0],
    radius: 0.3,
    inner_radius: 0,
    // Hand-built paths highlight point to point; the CA generator raises this when it splines.
    point_stride: 1,
    // Nothing to say about the sections until a generator labels them.
    section_tags: [],
    tag_kind: ""
});

export const newTorusObject = (): TorusObject => ({
    uniqueId: uuidv4(),
    type: "torus",
    wireframe: false,
    wireframe_radius: DEFAULT_WIREFRAME_RADIUS,
    colour: "#ff0000ff",
    origin: [0, 0, 0],
    orientation: IDENTITY_MATRIX,
    major_radius: 1.0,
    minor_radius: 0.2
});
/**
 * The factories by shape name, so a caller holding a `type` string can make one without a
 * 26-way switch.
 *
 * Typed as a total map over ThreeDObject["type"], which is the point: add a member to the union
 * without a factory for it and this stops compiling, rather than returning undefined at runtime
 * to whoever asked for the new shape.
 */
export const OBJECT_FACTORIES: { [K in ThreeDObject["type"]]: () => Extract<ThreeDObject, { type: K }> } = {
    sphere: newSphereObject,
    cylinder: newCylinderObject,
    cone: newConeObject,
    frustum: newFrustumObject,
    flatfrustum: newFlatSidedFrustumObject,
    prism: newPrismObject,
    pyramid: newPyramidObject,
    cube: newCubeObject,
    cuboid: newCuboidObject,
    ellipsoid: newEllipsoidObject,
    plane: newPlaneObject,
    disc: newDiscObject,
    annulus: newAnnulusObject,
    tetrahedron: newTetrahedronObject,
    octahedron: newOctahedronObject,
    dodecahedron: newDodecahedronObject,
    icosahedron: newIcosahedronObject,
    football: newFootballObject,
    truncatedoctahedron: newTruncatedOctahedronObject,
    cuboctahedron: newCuboctahedronObject,
    rhombicdodecahedron: newRhombicDodecahedronObject,
    arc: newArcObject,
    capsule: newCapsuleObject,
    helix: newHelixObject,
    path: newPathObject,
    torus: newTorusObject,
};

/** The shape names, for validating input and for listing what can be made. */
export const OBJECT_TYPES = Object.keys(OBJECT_FACTORIES) as ThreeDObject["type"][];

/**
 * A default object of the given shape, with a fresh uniqueId.
 *
 * @param type - The shape to make, one of OBJECT_TYPES.
 */
export const newObjectOfType = <K extends ThreeDObject["type"]>(type: K): Extract<ThreeDObject, { type: K }> =>
    OBJECT_FACTORIES[type]();

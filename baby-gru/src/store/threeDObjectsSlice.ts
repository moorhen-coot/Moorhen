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

export interface SphereObject extends ThreeDObjectBase {
    type: "sphere";
    radius: number;
}

export interface CylinderObject extends ThreeDObjectBase {
    type: "cylinder";
    end: Position3D;
    radius: number;
}

export interface ConeObject extends ThreeDObjectBase {
    type: "cone";
    top: Position3D;
    radius: number;
}

// The shapes below are positioned like the closed solids rather than like a cylinder: `origin` is
// the centre of the shape and `orientation` turns it, with `height` giving its extent along the
// shape's own z axis. Defining them by a start and end point would pin down that axis but leave
// the rotation about it unspecified, so there would be no way to turn a square prism on the spot.
export interface FrustumObject extends ThreeDObjectBase {
    type: "frustum";
    orientation: Matrix4x4;
    bottom_radius: number;
    top_radius: number;
    height: number;
}

export interface FlatSidedFrustumObject extends ThreeDObjectBase {
    type: "flatfrustum";
    orientation: Matrix4x4;
    bottom_radius: number;
    top_radius: number;
    height: number;
    n_sides: number;
}

export interface PrismObject extends ThreeDObjectBase {
    type: "prism";
    orientation: Matrix4x4;
    radius: number;
    height: number;
    n_sides: number;
}

export interface PyramidObject extends ThreeDObjectBase {
    type: "pyramid";
    orientation: Matrix4x4;
    radius: number;
    height: number;
    n_sides: number;
}

export interface CubeObject extends ThreeDObjectBase {
    type: "cube";
    orientation: Matrix4x4;
    scale: number;
}

export interface CuboidObject extends ThreeDObjectBase {
    type: "cuboid";
    orientation: Matrix4x4;
    scalexyz: Scale3D;
}

/** A sphere with independent x, y and z semi-axes; equal axes give a sphere. */
export interface EllipsoidObject extends ThreeDObjectBase {
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
export interface AnnulusObject extends ThreeDObjectBase {
    type: "annulus";
    orientation: Matrix4x4;
    radius: number;
    inner_radius: number;
}

export interface TetrahedronObject extends ThreeDObjectBase {
    type: "tetrahedron";
    orientation: Matrix4x4;
    scale: number;
}

export interface OctahedronObject extends ThreeDObjectBase {
    type: "octahedron";
    orientation:Matrix4x4;
    scale: number;
}

export interface DodecahedronObject extends ThreeDObjectBase {
    type: "dodecahedron";
    orientation: Matrix4x4;
    scale: number;
}

export interface IcosahedronObject extends ThreeDObjectBase {
    type: "icosahedron";
    orientation: Matrix4x4;
    scale: number;
}

export interface FootballObject extends ThreeDObjectBase {
    type: "football";
    orientation: Matrix4x4;
    scale: number;
}

/** A cylinder with hemispherical ends. `height` is the total end-to-end length. */
export interface CapsuleObject extends ThreeDObjectBase {
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
export interface HelixObject extends ThreeDObjectBase {
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
export interface ArcObject extends ThreeDObjectBase {
    type: "arc";
    orientation: Matrix4x4;
    major_radius: number;
    minor_radius: number;
    sweep_angle: number;
}

export interface TorusObject extends ThreeDObjectBase {
    type: "torus";
    orientation: Matrix4x4;
    major_radius: number;
    minor_radius: number;
}

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
            | TorusObject;

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

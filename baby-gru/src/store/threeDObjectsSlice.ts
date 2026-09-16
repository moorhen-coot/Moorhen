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

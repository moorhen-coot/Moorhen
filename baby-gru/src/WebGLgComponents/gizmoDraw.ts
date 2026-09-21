import { combineIntoSections, getFrustum, getTorus, mergeMeshes, placedMesh } from './shapeGeometry'
import { IDENTITY_ORIENTATION, createMeshInstances } from './meshInstancing'
import { centreOfObject, extentOfObject, hasOrientation } from '../store/threeDObjectsSlice'
import { MOORHEN_GIZMO_TAG_KIND } from '../utils/enums'
import { RootState } from '@/store'
import { Store } from '@reduxjs/toolkit'

/**
 * The manipulation handles: an arrow along each axis to move an object, and a ring about each to
 * turn it.
 *
 * Deliberately not part of the 3D objects themselves. Handles are interface, not data: they must
 * not be saved into a session, appear in the object list, or make the scene rebuild every time
 * one is dragged. So they are built here from the same mesh machinery, published as their own
 * buffers, and driven by a selection that lives in interface state.
 *
 * Only one object has handles at a time. With a scene of any size, handles on everything would
 * be a thicket in which nothing could be told apart from anything else.
 */

/** Proportions, in units where 1.0 is the tip of an arrow. */
const SHAFT_FROM = 0.12
const SHAFT_TO = 0.76
const SHAFT_RADIUS = 0.028
const HEAD_RADIUS = 0.085
const RING_RADIUS = 0.62
const RING_THICKNESS = 0.022
const ARROW_SIDES = 12
const RING_MAJOR_ACCU = 48
const RING_MINOR_ACCU = 6
/** Points around a ring offered to the pick test as its centre line. */
const RING_SPAN_POINTS = 24

/**
 * How close to a handle counts as being on it. Generous next to the geometry, because a handle is
 * thin and has to be easy to hit; the depth preference sorts out any overlap between them.
 */
const PICK_RADIUS = 0.1

/**
 * World size per unit of zoom, so that the handles stay the same size on screen however far in
 * or out you are. Moorhen's zoom is world units per screen unit - clickTol scales with it the
 * same way - so a world size proportional to zoom is a constant size to look at.
 */
const SIZE_PER_ZOOM = 7.0

/**
 * ...but never smaller than this much more than the object itself.
 *
 * A constant size on screen is the right behaviour while the object is small in view, and the
 * wrong one as soon as you zoom into a large object: the handles stay put while the object grows
 * around them until it has swallowed them, and there is nothing left to grab. Taking whichever
 * is larger keeps them reachable at every zoom, at the cost of handles that grow with the object
 * once you are close enough for that to matter.
 */
const CLEARANCE = 1.3

/**
 * The rotation taking a mesh built along z onto each axis, as column-major [u, w, axis].
 *
 * Written out rather than derived: there are three of them, they never change, and the reader
 * can check them by eye.
 */
const AXES: { name: string; direction: number[]; orientation: number[]; colour: number[] }[] = [
    {
        name: "x",
        direction: [1, 0, 0],
        orientation: [0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1],
        colour: [0.95, 0.26, 0.26, 1.0],
    },
    {
        name: "y",
        direction: [0, 1, 0],
        orientation: [0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
        colour: [0.30, 0.80, 0.33, 1.0],
    },
    {
        name: "z",
        direction: [0, 0, 1],
        orientation: IDENTITY_ORIENTATION,
        colour: [0.31, 0.51, 0.96, 1.0],
    },
]

/** An arrow along the axis: a shaft with a cone on the end, as one mesh. */
const arrowMesh = (orientation: number[], scale: number) => {
    const shaftLength = SHAFT_TO - SHAFT_FROM
    const shaft = placedMesh(
        getFrustum(ARROW_SIDES, 1, false),
        [SHAFT_RADIUS * scale, SHAFT_RADIUS * scale, shaftLength * scale],
        orientation,
        [0, 0, 0]
    )
    const head = placedMesh(
        getFrustum(ARROW_SIDES, 0, false),
        [HEAD_RADIUS * scale, HEAD_RADIUS * scale, (1 - SHAFT_TO) * scale],
        orientation,
        [0, 0, 0]
    )
    // getFrustum is centred on the origin, so each piece is slid along the axis to sit where it
    // belongs: the shaft spanning SHAFT_FROM..SHAFT_TO and the head from there to the tip.
    const along = (mesh: typeof shaft, distance: number) =>
        placedMesh(mesh, [1, 1, 1], IDENTITY_ORIENTATION, [
            orientation[8] * distance * scale,
            orientation[9] * distance * scale,
            orientation[10] * distance * scale,
        ])
    return mergeMeshes(
        along(shaft, (SHAFT_FROM + SHAFT_TO) / 2),
        along(head, (SHAFT_TO + 1) / 2)
    )
}

/** A ring about the axis, for turning. */
const ringMesh = (orientation: number[], scale: number) =>
    placedMesh(
        getTorus(RING_THICKNESS / RING_RADIUS, RING_MAJOR_ACCU, RING_MINOR_ACCU),
        [RING_RADIUS * scale, RING_RADIUS * scale, RING_RADIUS * scale],
        orientation,
        [0, 0, 0]
    )

/** The ring's own circle, as the centre line the pick test measures against. */
const ringSpan = (orientation: number[], scale: number) => {
    const span: number[] = []
    for (let i = 0; i <= RING_SPAN_POINTS; i++) {
        const angle = (2 * Math.PI * i) / RING_SPAN_POINTS
        const local = [Math.cos(angle) * RING_RADIUS * scale, Math.sin(angle) * RING_RADIUS * scale, 0]
        span.push(
            orientation[0] * local[0] + orientation[4] * local[1] + orientation[8] * local[2],
            orientation[1] * local[0] + orientation[5] * local[1] + orientation[9] * local[2],
            orientation[2] * local[0] + orientation[6] * local[1] + orientation[10] * local[2]
        )
    }
    return span
}

/**
 * The handles for one object.
 *
 * One buffer per axis rather than one for the whole gizmo, because colour is a per-instance
 * attribute: three buffers is what lets x, y and z be told apart. Within each, the arrow and the
 * ring are sections, so hovering lights the one under the pointer and its label says which it is.
 */
export const getGizmoBuffers = async (store: Store<RootState>): Promise<any> => {
    const state = store.getState()
    const selectedId = state.generalStates.selectedThreeDObjectId
    if (!selectedId) {
        return []
    }
    const object = state.threeDObjects.objects.find(item => item.uniqueId === selectedId)
    if (!object) {
        return []
    }

    const centre = centreOfObject(object)
    const scale = Math.max(SIZE_PER_ZOOM * state.sceneSettings.zoom, extentOfObject(object) * CLEARANCE)
    const turnable = hasOrientation(object)

    const meshes = createMeshInstances()
    AXES.forEach(axis => {
        const parts = [
            {
                mesh: arrowMesh(axis.orientation, scale),
                span: [
                    axis.direction[0] * SHAFT_FROM * scale,
                    axis.direction[1] * SHAFT_FROM * scale,
                    axis.direction[2] * SHAFT_FROM * scale,
                    axis.direction[0] * scale,
                    axis.direction[1] * scale,
                    axis.direction[2] * scale,
                ],
            },
        ]
        const tags = [`translate|${axis.name}`]
        if (turnable) {
            parts.push({ mesh: ringMesh(axis.orientation, scale), span: ringSpan(axis.orientation, scale) })
            tags.push(`rotate|${axis.name}`)
        }

        const key = `gizmo-${axis.name}`
        // Placement is baked into the mesh, so the instance only has to put it at the object and
        // everything - spans, pick radius - is already in world units.
        meshes.addInstance(
            key,
            () => combineIntoSections(parts, PICK_RADIUS * scale),
            centre,
            [1, 1, 1],
            IDENTITY_ORIENTATION,
            axis.colour
        )
        const group = meshes.group(key)
        if (group) {
            group.tags = tags
            group.tagKind = MOORHEN_GIZMO_TAG_KIND
        }
    })

    const objects: any[] = []
    meshes.emit(objects)
    // Dragging a handle must not also spin the camera, and alt-clicking one must not centre the
    // view on it. The renderer knows nothing of handles, only that a buffer may take the pointer
    // for itself.
    objects.forEach(object => { object.pick_info.claims_pointer = true })
    return objects
}

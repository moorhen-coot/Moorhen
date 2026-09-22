/**
 * Turning meshes into instanced draw buffers, with the pick information that makes them
 * hoverable.
 *
 * Extracted from the 3D object producer so that anything else wanting to draw with these meshes -
 * the manipulation handles, for one - can do so without going through the object store. Nothing
 * here knows what a 3D object is, what a molecule is, or where the meshes came from: it deals in
 * meshes, placements and colours.
 */

import type { ShapeMesh } from './shapeGeometry'

/**
 * The identity orientation, used by primitives that are not rotated.
 */
export const IDENTITY_ORIENTATION = [1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0]

/**
 * How many points on each instance are offered to the hover test, beyond its centre.
 *
 * One point per object only makes a shape hoverable near that point, which is fine for a compact
 * solid and poor for anything long or hollow - a helix, a long cylinder, a torus whose centre is
 * empty space. Several points spread over the shape make all of it hoverable.
 */
export const PICK_POINTS_PER_INSTANCE = 16

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
export type InstanceGroup = {
    // A generator may return more than a bare mesh: a path reports how it is divided into
    // separately hoverable sections.
    mesh: ShapeMesh & {
        sectionRanges?: number[][];
        sectionPoints?: number[][];
        sectionSpans?: number[][];
        sectionRadius?: number;
        // Coarser answers to the same question, each still indexed by section. Passed through
        // untouched; what they mean and when to use one is decided where they are read.
        sectionLevelRanges?: number[][][];
        sectionLevelPoints?: number[][][];
    }
    // Opaque labels for this group's sections, and the scheme they are in. Set by whichever
    // branch built the group; never read here.
    tags?: string[]
    tagKind?: string
    // Opaque labels for this group's whole instances - a different question from the one above,
    // and so a separate channel. A path answers both at once: its sections say which residue,
    // while the instance says which object the whole thing belongs to, in another scheme
    // entirely. One kind field could not carry both.
    instanceTags?: string[]
    // Which of two overlapping claimed hits should be taken. Meaningless on its own; the pick
    // test only consults it when two things that both want the pointer are both under it.
    pickPriority?: number
    origins: number[]
    sizes: number[]
    orientations: number[]
    colours: number[]
}

/**
 * Collects meshes and their placements, and emits them as instanced draw buffers.
 *
 * Shapes drawn from a mesh are grouped by that mesh, so that everything sharing one can be drawn
 * in a single instanced call.
 */
export const createMeshInstances = (instanceTagKind?: string) => {
    // Shapes whose geometry depends on a parameter - the number of sides of a prism, the taper
    // of a frustum, the tube thickness of a torus - cannot be expressed by the per-instance size
    // alone, so the parameter forms part of the key and each distinct value gets its own mesh.
    // The mesh is only built when a key is first seen.
    const groups = new Map<string, InstanceGroup>()

    /**
     * The label every instance added from now on carries.
     *
     * Set once per thing being drawn rather than passed with each instance, because one thing
     * may add several: a solid and its wireframe, or the two halves of a cylinder. All of them
     * belong to it, and this is what saves every call site from having to remember that.
     */
    let currentTag: string | null = null
    const setInstanceTag = (tag: string | null) => { currentTag = tag }

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
        if (instanceTagKind) {
            if (!group.instanceTags) group.instanceTags = []
            // Kept parallel with the instances whether or not a tag was set, so that an untagged
            // instance is a gap in the list rather than a shift of everything after it.
            group.instanceTags.push(currentTag ?? "")
        }
    }

    /** The group under a key, for a caller that needs to attach section labels to it. */
    const group = (key: string): InstanceGroup | undefined => groups.get(key)

    /** Append one draw buffer per group to `objects`. */
    const emit = (objects: any[]) => {
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
            // A sectioned mesh is hoverable in pieces instead of all at once: each section offers one
            // pick point at its middle, and pick_point_sections maps the reported index to the
            // section, whose vertex range the shader then lights.
            //
            // This works only because such a mesh has a single instance - a path is keyed by its own
            // id, so nothing else shares it. The shader test is on gl_VertexID, which says nothing
            // about which instance is being drawn, so a sectioned mesh shared between instances would
            // light the same section in every one of them.
            const sectioned = !!(group.mesh.sectionRanges && group.mesh.sectionPoints)
            const localPoints = sectioned
                ? group.mesh.sectionPoints
                : [[0, 0, 0], ...sampleMeshPoints(group.mesh, PICK_POINTS_PER_INSTANCE)]
            const pick_points: number[][] = []
            const pick_point_instances: number[] = []
            const pick_point_sections: number[] = []
            // The section's centre line, in world space. Measuring the pick ray against this rather
            // than against the single point above is what stops a section being picked from the far
            // side of the object: a point is only a fair stand-in for a shape that is small.
            const pick_spans: number[][] = []
            const pick_point_tags: string[] = []
            for (let instance = 0; instance < group.origins.length / 3; instance++) {
                const origin = group.origins.slice(3 * instance, 3 * instance + 3)
                const size = group.sizes.slice(3 * instance, 3 * instance + 3)
                const orientation = group.orientations.slice(16 * instance, 16 * instance + 16)
                localPoints.forEach((local, section) => {
                    pick_points.push(placeLocalPoint(local, origin, size, orientation))
                    pick_point_instances.push(instance)
                    if (!sectioned) return
                    pick_point_sections.push(section)
                    const span = group.mesh.sectionSpans?.[section] ?? []
                    const placed: number[] = []
                    for (let k = 0; k + 2 < span.length; k += 3) {
                        placed.push(...placeLocalPoint(
                            [span[k], span[k + 1], span[k + 2]], origin, size, orientation
                        ))
                    }
                    pick_spans.push(placed)
                    // Aligned with pick_points, so a hover can look its label up by the same index
                    // the pick test reports.
                    pick_point_tags.push(group.tags?.[section] ?? "")
                })
            }

            // The coarser aim points have to be placed into the world exactly as the pick points
            // above were: a level's point is a position, in the mesh's own space, and a path in
            // particular keeps its points relative to its origin - a backbone trace stores the
            // centroid as the origin and everything else as an offset from it. Handing the raw
            // point to whatever centres the view sends it to the offset instead of the place,
            // which is most of a molecule away.
            //
            // Vertex ranges need none of this: an index into the mesh means the same wherever
            // the mesh is put.
            //
            // Instance zero because a sectioned mesh is the only instance of itself, as the note
            // above on gl_VertexID explains.
            const placedLevelPoints = group.mesh.sectionLevelPoints?.map(level =>
                level.map(local => placeLocalPoint(
                    local,
                    group.origins.slice(0, 3),
                    group.sizes.slice(0, 3),
                    group.orientations.slice(0, 16)
                ))
            )

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
                pick_info: {
                    ...(sectioned
                        ? {
                            pick_points: pick_points,
                            pick_point_instances: pick_point_instances,
                            pick_point_sections: pick_point_sections,
                            pick_spans: pick_spans,
                            pick_radius: group.mesh.sectionRadius,
                            pick_point_tags: pick_point_tags,
                            pick_tag_kind: group.tagKind,
                            section_ranges: group.mesh.sectionRanges,
                            section_level_ranges: group.mesh.sectionLevelRanges,
                            section_level_points: placedLevelPoints,
                        }
                        : { pick_points: pick_points, pick_point_instances: pick_point_instances }),
                    // One label per instance, not per pick point: pick_point_instances already
                    // maps one to the other, and a shape offers seventeen pick points.
                    ...(group.instanceTags && {
                        instance_tags: group.instanceTags,
                        instance_tag_kind: instanceTagKind,
                    }),
                    ...(group.pickPriority !== undefined && { pick_priority: group.pickPriority }),
                },
            })
        })
    }

    return { addInstance, group, emit, setInstanceTag }
}

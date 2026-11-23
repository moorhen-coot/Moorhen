/**
 * What the hover lights this frame, worked out as drawCore works it out for WebGL, so that the
 * WebGPU renderer lights the same things. No GPU here.
 *
 * MGWebGL keeps the hover state whoever draws: the pick (doHover in eventHandlers.ts) writes
 * state.hoveridx (an index into glRef.displayBuffers) and state.hover_point (an index into that
 * buffer's pick_points); the sequence viewer names a residue as hoveringStates.hoveredSection;
 * and pickLevel is the grain the zoom has chosen (utils/pickLevel.ts). WebGL lights three ways:
 *
 * - **A section of a mesh** (a ribbon's residue): during the main draw, the instanced vertex
 *   shader lightens the vertices [from, to) of the hovered section halfway to white
 *   (uHighlightFrom, uHighlightTo). The range comes from the buffer's section ranges at the
 *   current level, for the pointer's pick point or for the section the sequence viewer asks for.
 * - **A whole instance** (instanced shapes without sections): the same, for gl_InstanceID equal
 *   to the hovered instance (uHoveredInstance).
 * - **A smooth mesh** (MetaBalls, molecular surfaces): an overlay, the hovered mesh drawn again
 *   in orange, blended, each vertex as opaque as the share of it the hovered point has - summed
 *   from its influence list over the points whose owner code matches the hovered one under the
 *   level's mask - with a green ring where the share is 0.45. A mesh that is one whole thing (a
 *   cavity, `highlight_whole`) lights solid. Meshes of one highlight group (a nucleic acid's
 *   backbone and base sticks: highlightGroup.ts) light together.
 *
 * The fourth, triangles of `point_triangles` drawn in black, is left out: nothing makes them.
 */
import type { DisplayBuffer } from '../WebGLgComponents/displayBuffer';
import { type InfluenceData, influenceOf } from '../WebGLgComponents/glResources';
import { ownerMaskForLevel } from '../utils/pickLevel';
import { highlightSiblings } from '../WebGLgComponents/highlightGroup';

/** What a renderer's camera source carries of the hover: MGWebGL has all of it. */
export interface HoverSource {
    state?: { hoveridx?: number; hover_point?: number };
    pickLevel?: number;
    store?: { getState(): { hoveringStates?: { hoveredSection?: { bufferId: string; section: number } | null } } };
}

/** The hovered point's code that matches every vertex: drawCore's sentinel for "the whole mesh". */
export const WHOLE_MESH = 0xFFFFFFFF;

/** The smooth mesh overlay: which buffer (its first sub-buffer), and which points light. */
export interface HoverOverlay {
    buffer: DisplayBuffer;
    /** The hovered point's owner code (or index, for a mesh without codes); WHOLE_MESH for a whole mesh. */
    point: number;
    /** Which bits of a code must match; all ones for one point. */
    mask: number;
    /** Light every vertex fully: a mesh that is one whole thing. */
    whole: boolean;
    /** The influence lists; null for a whole mesh. */
    influence: InfluenceData | null;
}

/** For an instanced sub-buffer: the instance lit whole, and the vertices [from, to) lit; -1 for none. */
export interface SubBufferHighlight {
    instance: number;
    from: number;
    to: number;
}

export const NO_HIGHLIGHT: SubBufferHighlight = Object.freeze({ instance: -1, from: -1, to: -1 });

export interface HoverHighlight {
    /**
     * The smooth mesh overlays: the hovered mesh first, then the others of its highlight group
     * (highlightGroup.ts), all with its point and mask. Empty for none.
     */
    overlays: HoverOverlay[];
    /** What to light in sub-buffers of `buffer` that are drawn instanced (the others: nothing). */
    forBuffer(buffer: DisplayBuffer): SubBufferHighlight;
}

export const NO_HOVER: HoverHighlight = Object.freeze({ overlays: [], forBuffer: () => NO_HIGHLIGHT });

/**
 * The hover highlight for a frame of `displayBuffers` (the store's glRef.displayBuffers, which
 * hoveridx indexes) as `source` has it. Mirrors drawTriangles' instanced loop and the overlay at
 * the end of drawCore's GLrender, condition for condition.
 */
export function hoverHighlight(source: HoverSource, displayBuffers: readonly DisplayBuffer[]): HoverHighlight {
    const hoveridx = source.state?.hoveridx ?? -1;
    const hoverPoint = source.state?.hover_point ?? -1;
    const level = source.pickLevel ?? 0;
    const hoveredSection = source.store?.getState().hoveringStates?.hoveredSection ?? null;
    if (hoveridx < 0 && !hoveredSection) return NO_HOVER;

    // hoveridx can outlive the array it indexed (drawCore says so too): a stale one finds nothing.
    const hovered = hoveridx > -1 ? displayBuffers[hoveridx] : undefined;

    const forBuffer = (buffer: DisplayBuffer): SubBufferHighlight => {
        const pickInfo = buffer.pick_info;
        const sectionRanges = pickInfo?.section_level_ranges?.[level] ?? pickInfo?.section_ranges;
        const isHovered = !!hovered && buffer === hovered && hoverPoint > -1;
        let instance = -1, from = -1, to = -1;
        if (!sectionRanges && isHovered) {
            const pickPointInstances = pickInfo?.pick_point_instances;
            instance = pickPointInstances ? pickPointInstances[hoverPoint] ?? -1 : hoverPoint;
        }
        if (sectionRanges && isHovered) {
            const section = pickInfo?.pick_point_sections?.[hoverPoint] ?? -1;
            if (section > -1 && sectionRanges[section]) [from, to] = sectionRanges[section];
        } else if (sectionRanges && hoveredSection && buffer.id === hoveredSection.bufferId
                   && sectionRanges[hoveredSection.section]) {
            // The mouse is not on this buffer, but the sequence viewer asks for one of its sections.
            [from, to] = sectionRanges[hoveredSection.section];
        }
        return instance < 0 && from < 0 ? NO_HIGHLIGHT : { instance, from, to };
    };

    // The overlay: the pointer's buffer and point; or, with the pointer on nothing, a smooth mesh
    // the sequence viewer names, lit by the section it names (a surface's owner code).
    let overlayBuffer = hovered;
    let overlayPoint = hoverPoint;
    if (!(overlayBuffer && overlayPoint > -1) && hoveredSection) {
        const asked = displayBuffers.find(buffer => buffer?.id === hoveredSection.bufferId);
        if (asked && influenceOf(asked.pick_info)) {
            overlayBuffer = asked;
            overlayPoint = hoveredSection.section;
        }
    }
    const overlays: HoverOverlay[] = [];
    if (overlayBuffer && overlayPoint > -1 && overlayBuffer.bufferTypes?.[0] === "TRIANGLES") {
        const pickInfo = overlayBuffer.pick_info;
        const influence = influenceOf(pickInfo);
        const whole = !influence && !!pickInfo?.highlight_whole;
        if (influence || whole) {
            const codes = pickInfo?.owner_codes;
            const point = whole ? WHOLE_MESH : codes && overlayPoint < codes.length ? codes[overlayPoint] : overlayPoint;
            const mask = whole ? WHOLE_MESH : codes ? ownerMaskForLevel(level) >>> 0 : WHOLE_MESH;
            overlays.push({ buffer: overlayBuffer, point, mask, whole, influence });
            // Its highlight group lights with it, by the same code: one numbering, so the code
            // names the same residue in each. Only meshes with lists, and only for a hovered
            // mesh with lists - a whole mesh (a cavity) is in no group.
            if (influence) {
                for (const idx of highlightSiblings(displayBuffers, displayBuffers.indexOf(overlayBuffer))) {
                    const sibling = displayBuffers[idx];
                    const siblingInfluence = influenceOf(sibling.pick_info);
                    if (siblingInfluence && sibling.bufferTypes?.[0] === "TRIANGLES") {
                        overlays.push({ buffer: sibling, point, mask, whole: false, influence: siblingInfluence });
                    }
                }
            }
        }
    }
    return { overlays, forBuffer };
}

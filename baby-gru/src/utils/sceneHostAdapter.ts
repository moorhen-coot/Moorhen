/**
 * The live scene, as the shape sceneKeyframe wants to see it.
 *
 * sceneKeyframe takes a SceneHost - the camera, the fadeable objects, and the scene's animatable
 * quantities - and knows nothing about MGWebGL, Redux or molecules. This is where those three
 * become that one, and it is deliberately the only file in the movie work that touches all of
 * them.
 *
 * WHAT COUNTS AS FADEABLE, AND WHY NOT EVERYTHING DOES
 *
 * A molecule representation and a `mesh`-type 3D object each own their display buffers, so fading
 * one is a uniform per buffer and no geometry moves. Everything else in the scene either cannot
 * be faded or should not be:
 *
 *  - 3D primitives (spheres, cylinders, and the rest) are batched across objects into shared
 *    instanced buffers. Fading one would mean splitting a batch, which is the opposite of what
 *    the instancer is for.
 *  - maps are left out for now. Their contours are rebuilt as the view moves, so a fade would
 *    have to survive a rebuild; worth doing, not worth doing first.
 *  - in a WebGL1 context nothing is fadeable, because the shaders have no fade uniform. The list
 *    comes back empty rather than full of controls that would do nothing.
 */

import type { webGL } from "../types/mgWebGL";
import type { moorhen } from "../types/moorhen";
import { MOORHEN_3D_OBJECT_TAG_KIND } from "./enums";
import type { FadeableObject, SceneHost, SceneQuantities } from "./sceneKeyframe";
import type { SceneKeyframe, Vec4 } from "./cameraPath";

/** A fadeable object, with the label a picker needs. Not part of SceneHost; the panel's business. */
export interface NamedFadeable extends FadeableObject {
    label: string;
    kind: "representation" | "mesh";
}

/** Just enough of the store's scene settings for the quantities a keyframe animates. */
interface SceneSettingsForMovie {
    backgroundColor: Vec4;
    lightPosition: Vec4;
    ambient: Vec4;
    diffuse: Vec4;
    specular: Vec4;
    specularPower: number;
    depthBlurDepth: number;
}

/** What the adapter needs from its surroundings, so the dependencies are visible in one place. */
export interface SceneHostInputs {
    glRef: React.RefObject<webGL.MGWebGL>;
    molecules: moorhen.Molecule[];
    /** The 3D objects slice's list. Only `mesh` entries are fadeable. */
    threeDObjects: { uniqueId: string; type: string; name?: string }[];
    /**
     * The scene's display buffers, from the glRef slice rather than the renderer.
     *
     * The renderer does not own them either - drawScene reads them from the store on every frame -
     * so taking them from anywhere else would be reading a copy.
     */
    displayBuffers: {
        alphaMultiplier?: number;
        setAlphaMultiplier?: (value: number) => void;
        pick_info?: { instance_tags?: string[]; instance_tag_kind?: string };
    }[];
    sceneSettings: SceneSettingsForMovie;
    /** Writing a scene quantity. The panel supplies a dispatch; a test supplies a spy. */
    writeScene: (scene: SceneKeyframe) => void;
    /** Ask for a redraw once something has changed. */
    redraw: () => void;
}

/**
 * Every representation of every molecule, and every mesh object, that can actually be faded.
 *
 * Exported separately from the host because the panel wants the labels for its picker, and the
 * host deliberately does not carry them - a label is a thing to show a person, not a thing a
 * movie records.
 */
export function fadeableObjects(inputs: SceneHostInputs): NamedFadeable[] {
    const gl = inputs.glRef?.current;
    if (!gl?.supportsObjectFading) return [];

    const objects: NamedFadeable[] = [];

    inputs.molecules.forEach(molecule => {
        molecule.representations?.forEach(representation => {
            const buffers = representation.buffers;
            if (!buffers?.length) return;
            objects.push({
                id: representation.uniqueId,
                label: `${molecule.name} · ${representation.style}`,
                kind: "representation",
                // One buffer speaks for the representation: they are set together and never
                // separately, so reading the first is reading all of them.
                get opacity() { return buffers[0]?.alphaMultiplier ?? 1; },
                setOpacity(value: number) {
                    buffers.forEach((buffer: { setAlphaMultiplier?: (v: number) => void }) =>
                        buffer.setAlphaMultiplier?.(value));
                    inputs.redraw();
                },
            });
        });
    });

    // A mesh object's buffer is found by the tag it was labelled with when it was drawn, which is
    // the same tag a click resolves through. Primitives carry tags too, but many objects share
    // one instanced buffer, so matching one would fade all of them.
    const meshIds = new Set(
        inputs.threeDObjects.filter(object => object.type === "mesh").map(object => object.uniqueId));
    if (meshIds.size > 0) {
        const displayBuffers = inputs.displayBuffers ?? [];
        meshIds.forEach(id => {
            const buffers = displayBuffers.filter(buffer =>
                buffer.pick_info?.instance_tag_kind === MOORHEN_3D_OBJECT_TAG_KIND
                && buffer.pick_info?.instance_tags?.length === 1
                && buffer.pick_info.instance_tags[0] === id);
            if (!buffers.length) return;

            const named = inputs.threeDObjects.find(object => object.uniqueId === id);
            objects.push({
                id,
                label: named?.name ? `${named.name} (mesh)` : `Mesh ${id.slice(0, 8)}`,
                kind: "mesh",
                get opacity() { return buffers[0]?.alphaMultiplier ?? 1; },
                setOpacity(value: number) {
                    buffers.forEach(buffer => buffer.setAlphaMultiplier?.(value));
                    inputs.redraw();
                },
            });
        });
    }

    return objects;
}

/** The scene's animatable quantities, read from the store and written back through it. */
const quantitiesFrom = (inputs: SceneHostInputs): SceneQuantities => ({
    read: () => ({
        backgroundColor: [...inputs.sceneSettings.backgroundColor] as Vec4,
        lightPosition: [...inputs.sceneSettings.lightPosition] as Vec4,
        ambient: [...inputs.sceneSettings.ambient] as Vec4,
        diffuse: [...inputs.sceneSettings.diffuse] as Vec4,
        specular: [...inputs.sceneSettings.specular] as Vec4,
        specularPower: inputs.sceneSettings.specularPower,
        // The store's name for where the focal plane sits. A keyframe calls it blurDepth.
        blurDepth: inputs.sceneSettings.depthBlurDepth,
    }),
    write: scene => inputs.writeScene(scene),
});

/** The live scene, as a SceneHost. */
export const sceneHostFrom = (inputs: SceneHostInputs): SceneHost => ({
    cameraState: () => inputs.glRef.current.cameraController.state,
    fadeable: () => fadeableObjects(inputs),
    scene: quantitiesFrom(inputs),
});

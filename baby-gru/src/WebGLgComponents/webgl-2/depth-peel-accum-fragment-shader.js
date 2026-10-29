var depth_peel_accum_fragment_shader_source = `#version 300 es\n

precision mediump float;

vec4 fxaa(sampler2D tex, vec2 fragCoord, vec2 resolution);

in lowp vec2 vTexture;

uniform int peelNumber;
uniform sampler2D depthPeelSamplers;
uniform sampler2D colorPeelSamplers;

uniform float xSSAOScaling;
uniform float ySSAOScaling;

// True for the opaque layer when it was drawn multisampled and resolved: draw it exactly as it is.
uniform bool resolvedLayer;

/**
 * Whether to run FXAA over this layer.
 *
 * False for a layer that holds only transparent geometry, because such a layer is mostly empty
 * and FXAA is a neighbourhood filter: its taps near a silhouette land in the texels the layer was
 * cleared to, which are the *background colour*, and average them in at full weight. The result is
 * a faint outline of the background inside the edge of every transparent object - white on a white
 * background, black on a black one, which is how it was eventually identified.
 *
 * THIS IS NEW, AND SO IS THE CONDITION THAT CAUSED IT
 *
 * The filter and the clear colour are both unchanged since 1.1.x, where there is no fringe. What
 * changed is what a layer contains. Peeling used to put the whole scene in every layer, so the
 * taps around a transparent silhouette landed on the *opaque geometry behind it* and averaging
 * them in was roughly right. Drawing the opaque scene once into its own layer - the optimisation
 * that stopped most of the triangles being rendered four times over - left the transparent layers
 * holding nothing but the transparent surface, surrounded by cleared background on every side.
 * The bug was always there; it had nothing to sample until the layers became sparse.
 *
 * Little is lost by switching it off there. The opaque layer, which holds the high-contrast
 * geometry FXAA was added for, is separately multisampled and already takes the branch above.
 * What remains is the silhouette of a see-through surface, which is low contrast by definition.
 */
uniform bool filterEdges;

out vec4 fragColor;

void main(void) {

    if(resolvedLayer) {
        fragColor = texture(colorPeelSamplers, gl_FragCoord.xy * vec2(xSSAOScaling, ySSAOScaling));
        return;
    }

    float depth;
    depth = texture(depthPeelSamplers,vTexture).r;
    if(depth<1.0) {
        if(filterEdges) {
            vec2 resolution;
            resolution.x = 1.0/xSSAOScaling;
            resolution.y = 1.0/ySSAOScaling;
            fragColor = fxaa(colorPeelSamplers, gl_FragCoord.xy, resolution);
        } else {
            fragColor = texture(colorPeelSamplers, vTexture);
        }
    } else {
        discard;
    }

}
`;

export {depth_peel_accum_fragment_shader_source};

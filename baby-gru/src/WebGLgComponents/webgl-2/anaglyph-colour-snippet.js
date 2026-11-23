// Anaglyph stereo (drawCore, anaglyph.ts), for the fragment shaders that draw the scene: while an
// eye is drawn (anaglyphGrey 1) its colour is made grey - its brightest channel, at most 1 -
// before the fog, as the WebGPU renderer greys an eye. Each fragment shader ends
// mix(anaglyphColour(colour), fogColour, fogFactor).
// A snippet, not a whole shader, so it has no #version line (shaderSources.test.ts lets it off).
var anaglyph_colour_snippet = `
    uniform float anaglyphGrey;
    vec4 anaglyphColour(vec4 c) {
        if(anaglyphGrey > 0.5) return vec4(vec3(min(max(c.r, max(c.g, c.b)), 1.0)), c.a);
        return c;
    }
`;

export {anaglyph_colour_snippet};

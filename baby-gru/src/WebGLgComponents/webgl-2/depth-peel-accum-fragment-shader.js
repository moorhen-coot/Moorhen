var depth_peel_accum_fragment_shader_source = `#version 300 es\n

precision mediump float;
in lowp vec2 vTexture;

uniform int peelNumber;
uniform sampler2D depthPeelSamplers;
uniform sampler2D colorPeelSamplers;

out vec4 fragColor;

void main(void) {

    float depth;
    depth = texture(depthPeelSamplers,vTexture).r;
    if(depth<1.0) {
        vec4 color = texture(colorPeelSamplers, vTexture);
        fragColor = color;
    } else {
        discard;
    }

}
`;

export {depth_peel_accum_fragment_shader_source};

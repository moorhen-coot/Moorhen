var depth_peel_accum_fragment_shader_source = `#version 300 es\n

precision mediump float;

vec4 fxaa(sampler2D tex, vec2 fragCoord, vec2 resolution);

in lowp vec2 vTexture;

uniform int peelNumber;
uniform sampler2D depthPeelSamplers;
uniform sampler2D colorPeelSamplers;

uniform float xSSAOScaling;
uniform float ySSAOScaling;

out vec4 fragColor;

void main(void) {

    float depth;
    depth = texture(depthPeelSamplers,vTexture).r;
    if(depth<1.0) {
        /*
        vec4 color = texture(colorPeelSamplers, vTexture);
        */

        vec2 resolution;
        resolution.x = 1.0/xSSAOScaling;
        resolution.y = 1.0/ySSAOScaling;
        vec4 color = fxaa(colorPeelSamplers, gl_FragCoord.xy, resolution);
        fragColor = color;
    } else {
        discard;
    }

}
`;

export {depth_peel_accum_fragment_shader_source};

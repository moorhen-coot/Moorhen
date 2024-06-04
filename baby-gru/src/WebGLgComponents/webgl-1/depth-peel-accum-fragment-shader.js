var depth_peel_accum_fragment_shader_source = `

precision mediump float;
varying lowp vec2 vTexture;

uniform int peelNumber;
uniform sampler2D depthPeelSamplers;
uniform sampler2D colorPeelSamplers;

void main(void) {

    float depth;
    depth = texture2D(depthPeelSamplers,vTexture).r;
    if(depth<1.0) {
        vec4 color = texture2D(colorPeelSamplers, vTexture);
        gl_FragColor = color;
    } else {
        discard;
    }

}
`;

export {depth_peel_accum_fragment_shader_source};

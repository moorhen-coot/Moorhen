var depth_peel_accum_fragment_shader_source = `

precision mediump float;
varying lowp vec2 vTexture;

uniform int peelNumber;
uniform sampler2D depthPeelSamplers[4];
uniform sampler2D colorPeelSamplers[4];

void main(void) {

    if(peelNumber>-1) {
        float depth;
        if(peelNumber==0){
            depth = texture2D(depthPeelSamplers[0],vTexture).r;
            if(depth<1.0) {
                vec4 color = texture2D(colorPeelSamplers[0], vTexture);
                gl_FragColor = color;
            } else {
                discard;
            }
        } else if(peelNumber==1){
            depth = texture2D(depthPeelSamplers[1],vTexture).r;
            if(depth<1.0) {
                vec4 color = texture2D(colorPeelSamplers[1], vTexture);
                gl_FragColor = color;
            } else {
                discard;
            }
        } else if(peelNumber==2){
            depth = texture2D(depthPeelSamplers[2],vTexture).r;
            if(depth<1.0) {
                vec4 color = texture2D(colorPeelSamplers[2], vTexture);
                gl_FragColor = color;
            } else {
                discard;
            }
        } else if(peelNumber==3){
            depth = texture2D(depthPeelSamplers[3],vTexture).r;
            if(depth<1.0) {
                vec4 color = texture2D(colorPeelSamplers[3], vTexture);
                gl_FragColor = color;
            } else {
                discard;
            }
        }
    }

}
`;

export {depth_peel_accum_fragment_shader_source};

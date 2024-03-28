var edge_detect_fragment_shader_source = `
precision mediump float;

uniform sampler2D gPosition;
uniform sampler2D gNormal;

uniform float zoom;

varying mediump mat4 pMatrix;
varying vec2 out_TexCoord0;

void main() {
    gl_FragColor = vec4(1.0,0.1,1.0,1.0);
}
`;

export {edge_detect_fragment_shader_source};

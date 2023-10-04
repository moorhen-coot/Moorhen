var ssao_fragment_shader_source = `
precision mediump float;

uniform sampler2D gPosition;
uniform sampler2D gNormal;
uniform sampler2D texNoise;

uniform float zoom;

varying vec2 out_TexCoord0;

// parameters (you'd probably want to use them as uniforms to more easily tweak the effect)
int kernelSize = 64;

uniform float radius;// = 2.5;
uniform float bias;// = 0.025;

// tile noise texture over screen based on screen dimensions divided by noise size
vec2 noiseScale = vec2(1024.0/4.0, 1024.0/4.0); 

varying mediump mat4 pMatrix;


void main() {
    gl_FragColor = vec4(1.0,0.1,1.0,1.0);
}
`;

export {ssao_fragment_shader_source};

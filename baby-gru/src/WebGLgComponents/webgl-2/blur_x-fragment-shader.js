var blur_x_fragment_shader_source = `#version 300 es\n
precision mediump float;

out vec4 fragColor;
uniform sampler2D shader0;
uniform sampler2D depth;
uniform float blurSize;
uniform float blurDepth;

uniform coeffBuffer {
    vec4 row0;
    vec4 row1;
    vec4 row2;
    vec4 row3;
    vec4 row4;
    vec4 row5;
    vec4 row6;
    vec4 row7;
    vec4 row8;
    int nsteps;
};

in vec2 out_TexCoord0;

void main() {

    int M = nsteps;
    int N = 2 * M + 1;

    // The depth as the buffer holds it, with no curve applied.
    //
    // This was smoothstep(0.0, 1.0, depth), while blurDepth - the threshold it is compared
    // against - is a plain linear fraction of the slab. Comparing a curved value against a
    // straight one puts the focal plane somewhere other than where it was asked for: the error is
    // zero at the middle of the slab and grows towards either end, reaching about 0.09 of the
    // slab, which on a 135 angstrom slab is some 12 angstroms. Worse, the sign is unhelpful - a
    // plane set in front of the scene is pushed backwards, so the frontmost geometry stayed sharp
    // when all of it should have blurred.
    //
    // smoothstep also flattens at both ends, so near the clip planes the value barely responds to
    // depth at all, which is where a user puts the plane when they want everything blurred.

    vec2 u_direction = vec2(blurSize*.5,0.0);

    vec4 sum = vec4(0.0);

    vec2 tcn = out_TexCoord0;

    for (int i = 0; i < N && i < 4; i++) {
        vec2 tc = out_TexCoord0 + u_direction * float(i - M);
        vec4 position = texture(depth, tc);
        float blur = min(position.x,1.0);
        if(blur>blurDepth){
            sum += row0[i] * texture(shader0, tc);
        } else {
            sum += row0[i] * texture(shader0, tcn);
        }
    }
    for (int i = 4; i < N && i < 8; i++) {
        vec2 tc = out_TexCoord0 + u_direction * float(i - M);
        vec4 position = texture(depth, tc);
        float blur = min(position.x,1.0);
        if(blur>blurDepth){
            sum += row1[i-4] * texture(shader0, tc);
        } else {
            sum += row1[i-4] * texture(shader0, tcn);
        }
    }
    for (int i = 8; i < N && i < 12; i++) {
        vec2 tc = out_TexCoord0 + u_direction * float(i - M);
        vec4 position = texture(depth, tc);
        float blur = min(position.x,1.0);
        if(blur>blurDepth){
            sum += row2[i-8] * texture(shader0, tc);
        } else {
            sum += row2[i-8] * texture(shader0, tcn);
        }
    }
    for (int i = 12; i < N && i < 16; i++) {
        vec2 tc = out_TexCoord0 + u_direction * float(i - M);
        vec4 position = texture(depth, tc);
        float blur = min(position.x,1.0);
        if(blur>blurDepth){
            sum += row3[i-12] * texture(shader0, tc);
        } else {
            sum += row3[i-12] * texture(shader0, tcn);
        }
    }
    for (int i = 16; i < N && i < 20; i++) {
        vec2 tc = out_TexCoord0 + u_direction * float(i - M);
        vec4 position = texture(depth, tc);
        float blur = min(position.x,1.0);
        if(blur>blurDepth){
            sum += row4[i-16] * texture(shader0, tc);
        } else {
            sum += row4[i-16] * texture(shader0, tcn);
        }
    }
    for (int i = 20; i < N && i < 24; i++) {
        vec2 tc = out_TexCoord0 + u_direction * float(i - M);
        vec4 position = texture(depth, tc);
        float blur = min(position.x,1.0);
        if(blur>blurDepth){
            sum += row5[i-20] * texture(shader0, tc);
        } else {
            sum += row5[i-20] * texture(shader0, tcn);
        }
    }
    for (int i = 24; i < N && i < 28; i++) {
        vec2 tc = out_TexCoord0 + u_direction * float(i - M);
        vec4 position = texture(depth, tc);
        float blur = min(position.x,1.0);
        if(blur>blurDepth){
            sum += row6[i-24] * texture(shader0, tc);
        } else {
            sum += row6[i-24] * texture(shader0, tcn);
        }
    }
    for (int i = 28; i < N && i < 32; i++) {
        vec2 tc = out_TexCoord0 + u_direction * float(i - M);
        vec4 position = texture(depth, tc);
        float blur = min(position.x,1.0);
        if(blur>blurDepth){
            sum += row7[i-28] * texture(shader0, tc);
        } else {
            sum += row7[i-28] * texture(shader0, tcn);
        }
    }
    for (int i = 32; i < N && i < 36; i++) {
        vec2 tc = out_TexCoord0 + u_direction * float(i - M);
        vec4 position = texture(depth, tc);
        float blur = min(position.x,1.0);
        if(blur>blurDepth){
            sum += row8[i-32] * texture(shader0, tc);
        } else {
            sum += row8[i-32] * texture(shader0, tcn);
        }
    }

    fragColor = sum;
}
`;

export {blur_x_fragment_shader_source};

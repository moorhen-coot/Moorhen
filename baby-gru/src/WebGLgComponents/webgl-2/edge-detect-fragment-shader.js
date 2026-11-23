var edge_detect_fragment_shader_source = `#version 300 es\n
precision mediump float;

out vec4 fragColor;

uniform sampler2D gPosition;
uniform sampler2D gNormal;

uniform float zoom;

uniform float depthThreshold;
uniform float normalThreshold;
uniform float scaleDepth;
uniform float scaleNormal;

/** The slab, so clip-space depth can be turned back into a distance in angstroms. */
uniform float clipNear;
uniform float clipFar;
uniform bool perspectiveProjection;

in mediump mat4 pMatrix;
in vec2 out_TexCoord0;

/**
 * How far in front of the eye a g-buffer sample is, in angstroms.
 *
 * The g-buffer holds clip-space position, which is what made the depth threshold so hard to
 * set: a clip-space gradient depends on the slab, the zoom and the projection all at once, and
 * the three constants that used to follow it here were an attempt to divide those back out.
 * Working in eye distance instead gives the threshold a meaning that holds still - a jump of so
 * many angstroms is a jump of so many angstroms whatever the view is doing.
 *
 * Under perspective the clip w component is already the eye distance, which is what a
 * projection matrix's third row is for. Under orthographic w is 1 and clip z is the normalised
 * depth, mapping linearly onto the slab.
 */
float eyeDistance(vec4 clipPos) {
    if (perspectiveProjection) {
        return clipPos.w;
    }
    return 0.5 * (clipFar + clipNear + clipPos.z * (clipFar - clipNear));
}

void main() {

    // Compute pixel step from texture dimensions — zoom invariant
    vec2 texelSize = 1.0 / vec2(textureSize(gPosition, 0));

    mat3 Sx;
    mat3 Sy;
    Sx[0].xyz = vec3( -1, 0 , 1);
    Sx[1].xyz = vec3( -2, 0,  2);
    Sx[2].xyz = vec3( -1, 0,  1);

    Sy[0].xyz = vec3( -1, -2, -1);
    Sy[1].xyz = vec3(  0,  0,  0);
    Sy[2].xyz = vec3(  1,  2,  1);

    float tl  = eyeDistance(texture(gPosition, out_TexCoord0 - scaleDepth*vec2(texelSize.x,   texelSize.y)));
    float br  = eyeDistance(texture(gPosition, out_TexCoord0 + scaleDepth*vec2(texelSize.x,   texelSize.y)));
    float tr  = eyeDistance(texture(gPosition, out_TexCoord0 + scaleDepth*vec2( texelSize.x, -texelSize.y)));
    float bl  = eyeDistance(texture(gPosition, out_TexCoord0 + scaleDepth*vec2(-texelSize.x,  texelSize.y)));
    float t   = eyeDistance(texture(gPosition, out_TexCoord0 - scaleDepth*vec2(0 , texelSize.y)));
    float b   = eyeDistance(texture(gPosition, out_TexCoord0 + scaleDepth*vec2(0 , texelSize.y)));
    float l   = eyeDistance(texture(gPosition, out_TexCoord0 - scaleDepth*vec2(texelSize.x , 0)));
    float r   = eyeDistance(texture(gPosition, out_TexCoord0 + scaleDepth*vec2(texelSize.x , 0)));
    float pix = eyeDistance(texture(gPosition, out_TexCoord0));

    float Gx = Sx[0][0] * tl + Sx[0][1] *   t + Sx[0][2] * tr +
               Sx[1][0] *  l + Sx[1][1] * pix + Sx[1][2] *  r +
               Sx[2][0] * bl + Sx[2][1] *   b + Sx[2][2] * br;
    float Gy = Sy[0][0] * tl + Sy[0][1] *   t + Sy[0][2] * tr +
               Sy[1][0] *  l + Sy[1][1] * pix + Sy[1][2] *  r +
               Sy[2][0] * bl + Sy[2][1] *   b + Sy[2][2] * br;

    // In angstroms, so depthThreshold is a distance. The depthFactor, the bare 10.0 and the
    // depthBufferSize/60.0 that used to be here were all trying to normalise a clip-space
    // gradient back to something comparable; with the taps already in eye distance there is
    // nothing left to normalise.
    //
    // Divided by four because that is what a Sobel kernel returns for a step: the three taps on
    // each side carry weights 1, 2, 1, so a jump of d angstroms across the centre comes out as
    // 4d. Dividing it back out makes depthThreshold the size of the jump itself, so "1.5" on
    // the slider means an edge wherever the depth steps by about one and a half angstroms.
    float diff = sqrt(Gx*Gx + Gy*Gy) * 0.25;

    diff = diff > depthThreshold ? 1.0 : 0.0;
    diff = 1.0 - diff;

    // But normals are vec3 xyz's not floats ...
    vec3 ntl  = normalize(texture(gNormal, out_TexCoord0 - scaleNormal*vec2(texelSize.x,   texelSize.y))).xyz;
    vec3 nbr  = normalize(texture(gNormal, out_TexCoord0 + scaleNormal*vec2(texelSize.x,   texelSize.y))).xyz;
    vec3 ntr  = normalize(texture(gNormal, out_TexCoord0 + scaleNormal*vec2( texelSize.x, -texelSize.y))).xyz;
    vec3 nbl  = normalize(texture(gNormal, out_TexCoord0 + scaleNormal*vec2(-texelSize.x,  texelSize.y))).xyz;
    vec3 nt   = normalize(texture(gNormal, out_TexCoord0 - scaleNormal*vec2(0 , texelSize.y))).xyz;
    vec3 nb   = normalize(texture(gNormal, out_TexCoord0 + scaleNormal*vec2(0 , texelSize.y))).xyz;
    vec3 nl   = normalize(texture(gNormal, out_TexCoord0 - scaleNormal*vec2(texelSize.x , 0))).xyz;
    vec3 nr   = normalize(texture(gNormal, out_TexCoord0 + scaleNormal*vec2(texelSize.x , 0))).xyz;
    vec3 npix = normalize(texture(gNormal, out_TexCoord0)).xyz;

    float Gx_n = Sx[0][0] * dot(npix,ntl) + Sx[0][1] *  dot(npix, nt) + Sx[0][2] * dot(npix,ntr) +
                 Sx[1][0] *  dot(npix,nl) + Sx[1][1] +                  Sx[1][2] *  dot(npix,nr) +
                 Sx[2][0] * dot(npix,nbl) + Sx[2][1] *   dot(npix,nb) + Sx[2][2] * dot(npix,nbr);
    float Gy_n = Sy[0][0] * dot(npix,ntl) + Sy[0][1] *   dot(npix,nt) + Sy[0][2] * dot(npix,ntr) +
                 Sy[1][0] *  dot(npix,nl) + Sy[1][1] +                  Sy[1][2] *  dot(npix,nr) +
                 Sy[2][0] * dot(npix,nbl) + Sy[2][1] *   dot(npix,nb) + Sy[2][2] * dot(npix,nbr);

    // Not scaled by depthFactor. Normals are unit vectors, so the dot products above are
    // already dimensionless and this gradient means the same thing whatever the projection -
    // whereas depthFactor is 1/80 under perspective and 1 under orthographic, which made the
    // normal threshold mean something eighty times different between the two for no reason.
    float ndiff = sqrt(Gx_n*Gx_n + Gy_n*Gy_n);

    ndiff = ndiff > normalThreshold ? 1.0 : 0.0;
    ndiff = 1.0 - ndiff;

    float edgeVal = min(diff,ndiff);

    fragColor = vec4(edgeVal,edgeVal,edgeVal,1.0);

}
`;

export {edge_detect_fragment_shader_source};

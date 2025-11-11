var edge_detect_fragment_shader_source = `#version 300 es\n
precision mediump float;

out vec4 fragColor;

uniform sampler2D gPosition;
uniform sampler2D gNormal;

uniform float zoom;
uniform float depthBufferSize;

uniform float depthThreshold;
uniform float normalThreshold;
uniform float scaleDepth;
uniform float scaleNormal;
uniform float xPixelOffset;
uniform float yPixelOffset;
uniform float depthFactor;

in mediump mat4 pMatrix;
in vec2 out_TexCoord0;

void main() {

    mat3 Sx;
    mat3 Sy;
    Sx[0].xyz = vec3( -1, 0 , 1);
    Sx[1].xyz = vec3( -2, 0,  2);
    Sx[2].xyz = vec3( -1, 0,  1);

    Sy[0].xyz = vec3( -1, -2, -1);
    Sy[1].xyz = vec3(  0,  0,  0);
    Sy[2].xyz = vec3(  1,  2,  1);

    float tl  = texture(gPosition, out_TexCoord0 - scaleDepth*vec2(xPixelOffset,   yPixelOffset)).z;
    float br  = texture(gPosition, out_TexCoord0 + scaleDepth*vec2(xPixelOffset,   yPixelOffset)).z;
    float tr  = texture(gPosition, out_TexCoord0 + scaleDepth*vec2( xPixelOffset, -yPixelOffset)).z;
    float bl  = texture(gPosition, out_TexCoord0 + scaleDepth*vec2(-xPixelOffset,  yPixelOffset)).z;
    float t   = texture(gPosition, out_TexCoord0 - scaleDepth*vec2(0 , yPixelOffset)).z;
    float b   = texture(gPosition, out_TexCoord0 + scaleDepth*vec2(0 , yPixelOffset)).z;
    float l   = texture(gPosition, out_TexCoord0 - scaleDepth*vec2(xPixelOffset , 0)).z;
    float r   = texture(gPosition, out_TexCoord0 + scaleDepth*vec2(xPixelOffset , 0)).z;
    float pix = texture(gPosition, out_TexCoord0).z;

    float Gx = Sx[0][0] * tl + Sx[0][1] *   t + Sx[0][2] * tr +
               Sx[1][0] *  l + Sx[1][1] * pix + Sx[1][2] *  r +
               Sx[2][0] * bl + Sx[2][1] *   b + Sx[2][2] * br;
    float Gy = Sy[0][0] * tl + Sy[0][1] *   t + Sy[0][2] * tr +
               Sy[1][0] *  l + Sy[1][1] * pix + Sy[1][2] *  r +
               Sy[2][0] * bl + Sy[2][1] *   b + Sy[2][2] * br;

    float diff = depthFactor*sqrt(Gx*Gx + Gy*Gy) * 10.0 * depthBufferSize/60.0;

    diff = diff > depthThreshold ? 1.0 : 0.0;
    diff = 1.0 - diff;

    // But normals are vec3 xyz's not floats ...
    vec3 ntl  = normalize(texture(gNormal, out_TexCoord0 - scaleNormal*vec2(xPixelOffset,   yPixelOffset))).xyz;
    vec3 nbr  = normalize(texture(gNormal, out_TexCoord0 + scaleNormal*vec2(xPixelOffset,   yPixelOffset))).xyz;
    vec3 ntr  = normalize(texture(gNormal, out_TexCoord0 + scaleNormal*vec2( xPixelOffset, -yPixelOffset))).xyz;
    vec3 nbl  = normalize(texture(gNormal, out_TexCoord0 + scaleNormal*vec2(-xPixelOffset,  yPixelOffset))).xyz;
    vec3 nt   = normalize(texture(gNormal, out_TexCoord0 - scaleNormal*vec2(0 , yPixelOffset))).xyz;
    vec3 nb   = normalize(texture(gNormal, out_TexCoord0 + scaleNormal*vec2(0 , yPixelOffset))).xyz;
    vec3 nl   = normalize(texture(gNormal, out_TexCoord0 - scaleNormal*vec2(xPixelOffset , 0))).xyz;
    vec3 nr   = normalize(texture(gNormal, out_TexCoord0 + scaleNormal*vec2(xPixelOffset , 0))).xyz;
    vec3 npix = normalize(texture(gNormal, out_TexCoord0)).xyz;

    float Gx_n = Sx[0][0] * dot(npix,ntl) + Sx[0][1] *  dot(npix, nt) + Sx[0][2] * dot(npix,ntr) +
                 Sx[1][0] *  dot(npix,nl) + Sx[1][1] +                  Sx[1][2] *  dot(npix,nr) +
                 Sx[2][0] * dot(npix,nbl) + Sx[2][1] *   dot(npix,nb) + Sx[2][2] * dot(npix,nbr);
    float Gy_n = Sy[0][0] * dot(npix,ntl) + Sy[0][1] *   dot(npix,nt) + Sy[0][2] * dot(npix,ntr) +
                 Sy[1][0] *  dot(npix,nl) + Sy[1][1] +                  Sy[1][2] *  dot(npix,nr) +
                 Sy[2][0] * dot(npix,nbl) + Sy[2][1] *   dot(npix,nb) + Sy[2][2] * dot(npix,nbr);

    float ndiff = depthFactor*sqrt(Gx_n*Gx_n + Gy_n*Gy_n);

    ndiff = ndiff > normalThreshold ? 1.0 : 0.0;
    ndiff = 1.0 - ndiff;

    float edgeVal = min(diff,ndiff);

    fragColor = vec4(edgeVal,edgeVal,edgeVal,1.0);

}
`;

export {edge_detect_fragment_shader_source};

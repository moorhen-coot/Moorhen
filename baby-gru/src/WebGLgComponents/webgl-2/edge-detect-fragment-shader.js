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

in mediump mat4 pMatrix;
in vec2 out_TexCoord0;

void main() {

    float halfScaleFloorDepth = scaleDepth - 0.0625;
    float halfScaleCeilDepth = scaleDepth + 0.0625;
    float halfScaleFloorNormal = scaleNormal*.5 - 0.0625;
    float halfScaleCeilNormal = scaleNormal*.5 + 0.0625;
    /*
    float halfScaleFloorDepth = floor(scaleDepth * 0.5);
    float halfScaleCeilDepth = ceil(scaleDepth * 0.5);
    float halfScaleFloorNormal = floor(scaleNormal * 0.5);
    float halfScaleCeilNormal = ceil(scaleNormal * 0.5);
    */
    
    float depth0 = texture(gPosition, out_TexCoord0 - vec2(xPixelOffset,yPixelOffset)*halfScaleFloorDepth).z;
    float depth1 = texture(gPosition, out_TexCoord0 + vec2(xPixelOffset,yPixelOffset)*halfScaleCeilDepth).z;
    float depth2 = texture(gPosition, out_TexCoord0 + vec2( xPixelOffset * halfScaleCeilDepth, -yPixelOffset * halfScaleFloorDepth)).z;
    float depth3 = texture(gPosition, out_TexCoord0 + vec2(-xPixelOffset * halfScaleFloorDepth, yPixelOffset * halfScaleCeilDepth)).z;
    float depth4 = texture(gPosition, out_TexCoord0).z;

    vec3 normal0 = normalize(texture(gNormal, out_TexCoord0 - vec2(xPixelOffset,yPixelOffset)*halfScaleFloorNormal)).xyz;
    vec3 normal1 = normalize(texture(gNormal, out_TexCoord0 + vec2(xPixelOffset,yPixelOffset)*halfScaleCeilNormal)).xyz;
    vec3 normal2 = normalize(texture(gNormal, out_TexCoord0 + vec2( xPixelOffset * halfScaleCeilNormal, -yPixelOffset * halfScaleFloorNormal))).xyz;
    vec3 normal3 = normalize(texture(gNormal, out_TexCoord0 + vec2(-xPixelOffset * halfScaleFloorNormal, yPixelOffset * halfScaleCeilNormal))).xyz;

    float depthFiniteDifference0 = depth1 - depth0;
    float depthFiniteDifference1 = depth3 - depth2;

    float diff = sqrt(pow(depthFiniteDifference0, 2.0) + pow(depthFiniteDifference1, 2.0)) * 10.0 * depthBufferSize/60.;

    fragColor = vec4(depth0,depth0,depth0,1.0);

    diff = diff > depthThreshold ? 1.0 : 0.0;

    diff = 1.0 - diff;

    vec3 normalFiniteDifference0 = normal1 - normal0;
    vec3 normalFiniteDifference1 = normal3 - normal2;

    float edgeNormal = sqrt(dot(normalFiniteDifference0, normalFiniteDifference0) + dot(normalFiniteDifference1, normalFiniteDifference1));
    edgeNormal = edgeNormal > normalThreshold ? 1.0 : 0.0;
    edgeNormal = 1.0 - edgeNormal;

    float edgeVal = min(edgeNormal,diff);
    fragColor = vec4(edgeVal,edgeVal,edgeVal,1.0);
}
`;

export {edge_detect_fragment_shader_source};

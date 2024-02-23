var edge_detect_fragment_shader_source = `#version 300 es\n
precision mediump float;

out vec4 fragColor;

uniform sampler2D gPosition;
uniform sampler2D gNormal;

uniform float zoom;
uniform float depthBufferSize;

in mediump mat4 pMatrix;
in vec2 out_TexCoord0;

void main() {

    float depthThreshold = 0.3;
    float _NormalThreshold = 0.4;
    float scaleDepth = 1.0;
    float scaleNormal = 1.0;

    float pixelFrac = 2.0 / 1024.0;

    float halfScaleFloorDepth = floor(scaleDepth * 0.5);
    float halfScaleCeilDepth = ceil(scaleDepth * 0.5);
    
    float halfScaleFloorNormal = floor(scaleNormal * 0.5);
    float halfScaleCeilNormal = ceil(scaleNormal * 0.5);
    
    float depth0 = texture(gPosition, out_TexCoord0 - vec2(pixelFrac,pixelFrac)*halfScaleFloorDepth).z;
    float depth1 = texture(gPosition, out_TexCoord0 + vec2(pixelFrac,pixelFrac)*halfScaleCeilDepth).z;
    float depth2 = texture(gPosition, out_TexCoord0 + vec2( pixelFrac * halfScaleCeilDepth, -pixelFrac * halfScaleFloorDepth)).z;
    float depth3 = texture(gPosition, out_TexCoord0 + vec2(-pixelFrac * halfScaleFloorDepth, pixelFrac * halfScaleCeilDepth)).z;

    vec3 normal0 = normalize(texture(gNormal, out_TexCoord0 - vec2(pixelFrac,pixelFrac)*halfScaleFloorNormal)).xyz;
    vec3 normal1 = normalize(texture(gNormal, out_TexCoord0 + vec2(pixelFrac,pixelFrac)*halfScaleCeilNormal)).xyz;
    vec3 normal2 = normalize(texture(gNormal, out_TexCoord0 + vec2( pixelFrac * halfScaleCeilNormal, -pixelFrac * halfScaleFloorNormal))).xyz;
    vec3 normal3 = normalize(texture(gNormal, out_TexCoord0 + vec2(-pixelFrac * halfScaleFloorNormal, pixelFrac * halfScaleCeilNormal))).xyz;

    float depthFiniteDifference0 = depth1 - depth0;
    float depthFiniteDifference1 = depth3 - depth2;

    float diff = 1.0 - sqrt(pow(depthFiniteDifference0, 2.0) + pow(depthFiniteDifference1, 2.0)) * 10.0 * depthBufferSize/60.;

    fragColor = vec4(depth0,depth0,depth0,1.0);

    if(diff>depthThreshold) diff = 1.0;

    vec3 normalFiniteDifference0 = normal1 - normal0;
    vec3 normalFiniteDifference1 = normal3 - normal2;

    float edgeNormal = sqrt(dot(normalFiniteDifference0, normalFiniteDifference0) + dot(normalFiniteDifference1, normalFiniteDifference1));
    edgeNormal = edgeNormal > _NormalThreshold ? 1.0 : 0.0;
    edgeNormal = 1.0 - edgeNormal;

    fragColor = vec4(diff,diff,diff,1.0);
    fragColor = vec4(edgeNormal,edgeNormal,edgeNormal,1.0);

    float edgeVal = min(edgeNormal,diff);
    fragColor = vec4(edgeVal,edgeVal,edgeVal,1.0);
}
`;

export {edge_detect_fragment_shader_source};

var ssao_fragment_shader_source = `#version 300 es\n
precision mediump float;

out vec4 fragColor;

uniform sampler2D gPosition;
uniform sampler2D gNormal;
uniform sampler2D texNoise;

uniform float radius;
uniform float bias;          // AO effect intensity (0 = off, 1 = full)
uniform float depthFactor;
uniform vec2  noiseScale;    // ssaoFramebufferSize / noiseTextureSize (4)

// Kept for backward-compat with uniform-location lookups; unused.
uniform float zoom;
uniform float depthBufferSize;

in vec2 out_TexCoord0;
in mediump mat4 pMatrix;

const int KERNEL_SIZE = 32;

uniform sampleBuffer {
    vec4 samples[32];
};

void main() {
    vec4 normal_all = texture(gNormal, out_TexCoord0);

    // Background pixels (alpha < 0.9) get no occlusion
    if (normal_all.a < 0.9) {
        fragColor = vec4(1.0, 1.0, 1.0, 1.0);
        return;
    }

    vec3 normal  = normalize(normal_all.rgb);
    vec3 fragPos = depthFactor * texture(gPosition, out_TexCoord0).xyz;

    // Construct TBN basis via Gram-Schmidt from random rotation vector
    vec3 randomVec = normalize(texture(texNoise, out_TexCoord0 * noiseScale).xyz);
    vec3 tangent   = normalize(randomVec - normal * dot(randomVec, normal));
    vec3 bitangent = cross(normal, tangent);
    mat3 TBN       = mat3(tangent, bitangent, normal);

    float occlusion    = 0.0;
    float geometricBias = 0.025 * radius;  // fixed self-occlusion prevention

    for (int i = 0; i < KERNEL_SIZE; ++i) {
        // Transform sample from tangent-space hemisphere to view space
        vec3 samplePos = fragPos + TBN * samples[i].xyz * radius;

        // Project to screen coordinates for G-buffer lookup
        vec4 offset = pMatrix * vec4(samplePos, 1.0);
        offset.xyz /= offset.w;
        offset.xyz  = offset.xyz * 0.5 + 0.5;

        // Depth of actual geometry at the projected position
        float sampleDepth = depthFactor * texture(gPosition, offset.xy).z;

        // Range check: suppress occlusion at depth discontinuities.
        // This prevents dark halos on silhouette edges where samples
        // land on distant background geometry.
        float rangeCheck = smoothstep(0.0, 1.0,
                               radius / (abs(fragPos.z - sampleDepth) + 0.0001));

        // Binary occlusion test (positive Z into screen in this engine):
        // Occluded when the actual geometry is closer to camera (smaller Z)
        // than the sample point, with geometric bias to prevent self-occlusion.
        occlusion += step(sampleDepth + geometricBias, samplePos.z) * rangeCheck;
    }

    // 1.0 = fully unoccluded,  0.0 = fully occluded
    float result = 1.0 - (occlusion / float(KERNEL_SIZE));

    // Power curve for visual contrast
    result = pow(clamp(result, 0.0, 1.0), 1.5);

    // bias uniform controls effect intensity: 0 = no AO, 1 = full AO
    result = mix(1.0, result, clamp(bias, 0.0, 1.0));

    fragColor = vec4(result, result, result, 1.0);
}
`;

export {ssao_fragment_shader_source};

var ssao_fragment_shader_source = `#version 300 es\n
precision mediump float;

out vec4 fragColor;

uniform sampler2D gPosition;
uniform sampler2D gNormal;
uniform sampler2D texNoise;
uniform float zoom;
uniform float depthBufferSize;

// For multiview, the x,y scaling.
uniform float tileScale_x;
uniform float tileScale_y;
uniform float tileScaleBase_x;
uniform float tileScaleBase_y;

in vec2 out_TexCoord0;

int kernelSize = 32;

uniform float radius;
uniform float bias; // AO intensity: 1.0 = full, 0.0 = none
uniform float depthFactor;

in mediump mat4 pMatrix;

uniform sampleBuffer {
    vec4 samples[32];
};

void main() {

    vec4 normal_all = texture(gNormal, out_TexCoord0);
    float occlusion;

    float nTiles_x = 1.0 / tileScale_x;
    float nTiles_y = 1.0 / tileScale_y;

    if(normal_all.a > 0.9) {
        vec3 normal = normalize(normal_all.rgb);
        vec3 fragPos = depthFactor * texture(gPosition, out_TexCoord0).xyz;
        vec3 randomVec = texture(texNoise, gl_FragCoord.xy / vec2(4.0)).xyz;

        // TBN change-of-basis matrix: tangent-space to view-space
        vec3 tangent = normalize(randomVec - normal * dot(randomVec, normal));
        vec3 bitangent = cross(normal, tangent);
        mat3 TBN = mat3(tangent, bitangent, normal);

        // Soft depth-difference scale factor
        float diffMult = 0.5 * depthBufferSize;

        occlusion = 0.0;
        for(int i = 0; i < kernelSize; ++i)
        {
            // get sample position
            vec3 samplePos = TBN * samples[i].xyz; // from tangent to view-space
            samplePos = fragPos + samplePos * radius;

            // project sample position to screen/texture coordinates
            vec4 offset = vec4(samplePos, 1.0);
            offset = pMatrix * offset; // from view to clip-space
            offset.xyz /= offset.w; // perspective divide
            offset.xyz = offset.xyz * 0.5 + 0.5; // transform to range 0.0 - 1.0

            // Work out base of our current multiview tile.
            float tileOffset_x = tileScaleBase_x + tileScale_x * floor(out_TexCoord0.x * nTiles_x);
            float tileOffset_y = tileScaleBase_y + tileScale_y * floor(out_TexCoord0.y * nTiles_y);
            vec2 tileOffset = vec2(tileOffset_x, tileOffset_y);

            // get depth value of kernel sample
            float sampleDepth = depthFactor * texture(gPosition,
                vec2(tileScale_x * offset.x, tileScale_y * offset.y) + tileOffset).z;

            // Soft occlusion: smooth falloff based on depth difference
            // Robust with clip-space g-buffer data — no sign/threshold issues
            float dz = max(fragPos.z - sampleDepth, 0.0) * diffMult;
            occlusion += 1.0 / (1.0 + dz * dz);
        }

        // Normalize and sharpen
        occlusion = pow(occlusion / float(kernelSize), 1.5);
        // bias as intensity control: 1.0 = full AO, 0.0 = no AO
        occlusion += (1.0 - bias);
        occlusion = clamp(occlusion, 0.0, 1.0);
    } else {
        occlusion = 1.0;
    }

    fragColor = vec4(occlusion, occlusion, occlusion, 1.0);

}
`;

export {ssao_fragment_shader_source};

// Horizon-Based Ambient Occlusion (HBAO) fragment shader.
//
// Prototype replacement for the classic hemisphere-kernel SSAO in
// ssao-fragment-shader.js. It reads the SAME G-buffer inputs (gPosition,
// gNormal) and the SAME per-pixel rotation noise (texNoise), and writes the
// same single-channel occlusion result, so it drops into the existing AO pass
// in drawScene with only the shader program + a few uniforms swapped.
//
// Instead of scattering point samples through a hemisphere, HBAO marches along
// `numDirections` screen-space directions, taking `numSteps` steps along each,
// and tracks the largest horizon (elevation) angle it can see. The occlusion is
// the integral of that horizon against the surface tangent - which is why it
// looks much cleaner per sample than sampled SSAO, and why quality scales simply
// with numDirections x numSteps (the Low/Med/High tiers).
//
// Parameters (see the AO pass in drawCore.ts):
//   radius        - view-space search radius (from ssaoRadius, same as SSAO)
//   strength      - darkening amount 0..1 (the honest version of SSAO's "bias")
//   numDirections - directions to march (quality tier)
//   numSteps      - steps per direction (quality tier)
//   angleBias     - rejects near-tangent self-occlusion on low-tessellation
//                   surfaces; a fixed constant, not user-exposed.

var hbao_fragment_shader_source = `#version 300 es\n
precision mediump float;

out vec4 fragColor;

uniform sampler2D gPosition;
uniform sampler2D gNormal;
uniform sampler2D texNoise;

uniform float radius;
uniform float strength;      // AO intensity: 1.0 = full, 0.0 = none
uniform float depthFactor;
uniform float depthBufferSize;

// Quality dial (directions x steps). Set from the Low/Med/High tier.
uniform int numDirections;
uniform int numSteps;
uniform float angleBias;     // radians; fixed constant from the app

// For multiview, the x,y scaling (identical to the SSAO shader).
uniform float tileScale_x;
uniform float tileScale_y;
uniform float tileScaleBase_x;
uniform float tileScaleBase_y;

in vec2 out_TexCoord0;
in mediump mat4 pMatrix;

const float PI = 3.14159265;
const int MAX_DIRECTIONS = 12;
const int MAX_STEPS = 12;

void main() {

    vec4 normal_all = texture(gNormal, out_TexCoord0);

    // Background / empty texels: fully lit, exactly like the SSAO shader.
    if (normal_all.a <= 0.9) {
        fragColor = vec4(1.0, 1.0, 1.0, 1.0);
        return;
    }

    vec3 normal  = normalize(normal_all.rgb);
    vec3 fragPos = depthFactor * texture(gPosition, out_TexCoord0).xyz;

    // Per-pixel rotation + step jitter so the few directions don't band. The
    // 4x4 texNoise alone repeats on a regular grid (visible diagonal streaks);
    // mixing it with a per-fragment hash breaks that up, and the blur pass then
    // resolves the resulting fine noise into smooth gradients.
    vec3 randomVec = texture(texNoise, gl_FragCoord.xy / vec2(4.0)).xyz;
    float hash = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    float rndAngle = (randomVec.x + hash) * 2.0 * PI;
    float stepJitter = 0.5 + 0.5 * hash;   // 0.5..1.0, offsets where each ray starts

    float nTiles_x = 1.0 / tileScale_x;
    float nTiles_y = 1.0 / tileScale_y;
    float tileOffset_x = tileScaleBase_x + tileScale_x * floor(out_TexCoord0.x * nTiles_x);
    float tileOffset_y = tileScaleBase_y + tileScale_y * floor(out_TexCoord0.y * nTiles_y);
    vec2 tileOffset = vec2(tileOffset_x, tileOffset_y);

    // March in SCREEN space. The search reach is a fraction of the screen
    // (texture-coord units, so resolution-aware), NOT the view-space radius
    // directly - mixing those spaces was the bug that made occlusion ~0.
    // The view-space radius only scales how big that screen reach is, softly.
    // Wider screen reach so deeper crevices are actually sampled.
    float screenReach = 0.15 * clamp(radius, 0.05, 4.0);   // ~15% of screen at radius 1
    float stepUV = screenReach / float(max(numSteps, 1));

    // World-space falloff distance: occluders beyond this stop counting.
    float worldRadius = max(radius, 1e-3);
    float biasSin = sin(angleBias);

    float occlusion = 0.0;
    float dirCount = 0.0;

    for (int d = 0; d < MAX_DIRECTIONS; ++d) {
        if (d >= numDirections) break;
        dirCount += 1.0;

        float theta = (float(d) / float(numDirections)) * 2.0 * PI + rndAngle;
        vec2 dir = vec2(cos(theta), sin(theta));

        // Combine the horizon (highest occluder) with an accumulated contribution
        // so broad shallow concavities darken too, not just sharp pits.
        float maxSin = biasSin;
        float accum = 0.0;
        float accumW = 0.0;

        for (int s = 1; s <= MAX_STEPS; ++s) {
            if (s > numSteps) break;

            vec2 sampleUV = out_TexCoord0 + dir * stepUV * (float(s) - 1.0 + stepJitter);
            vec2 tiledUV = vec2(tileScale_x * sampleUV.x, tileScale_y * sampleUV.y) + tileOffset;

            vec3 samplePos = depthFactor * texture(gPosition, tiledUV).xyz;
            vec3 diff = samplePos - fragPos;
            float dist = length(diff);

            if (dist < 1e-4) continue;

            // How far above the tangent plane this neighbour sits.
            float sinElevation = dot(diff, normal) / dist;

            // Distance falloff: neighbours beyond worldRadius fade to nothing.
            float falloff = clamp(1.0 - dist / worldRadius, 0.0, 1.0);

            maxSin = max(maxSin, sinElevation);            // horizon (not falloff-weighted)
            accum += max(sinElevation - biasSin, 0.0) * falloff;
            accumW += 1.0;
        }

        // Horizon rise above the tangent, plus the averaged shallow contribution.
        float horizon = clamp(maxSin - biasSin, 0.0, 1.0);
        float broad = accumW > 0.0 ? accum / accumW : 0.0;
        occlusion += 0.5 * horizon + 0.5 * broad;
    }

    occlusion = occlusion / max(dirCount, 1.0);

    // Gain lifts the raw horizon occlusion into a visible range; strength then
    // scales it 0..1 as the user control. (Gain is a fixed shaping constant.)
    float gain = 4.0;
    float ao = 1.0 - clamp(occlusion * gain, 0.0, 1.0) * strength;
    ao = clamp(ao, 0.0, 1.0);

    fragColor = vec4(ao, ao, ao, 1.0);
}
`;

export {hbao_fragment_shader_source};

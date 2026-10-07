var ssao_fragment_shader_source = `#version 300 es\n
precision mediump float;

out vec4 fragColor;

uniform sampler2D gPosition;
uniform sampler2D gNormal;
uniform sampler2D texNoise;

// For multiview, the x,y scaling.
uniform float tileScale_x;
uniform float tileScale_y;
uniform float tileScaleBase_x;
uniform float tileScaleBase_y;

in vec2 out_TexCoord0;

int kernelSize = 32;

/** How far occlusion reaches, in angstroms. */
uniform float radius;

/**
 * How strongly occlusion darkens, as an exponent on the visibility.
 *
 * 0.0 is no occlusion at all and 1.0 is the plain fraction of the hemisphere that is blocked, so
 * both ends mean what they did when this was a linear multiplier. Above 1.0 it keeps darkening,
 * which a multiplier could not: 1.0 - occlusion * k clamps to flat black over whole regions as soon
 * as k occlusion exceeds one, losing the shape inside them, whereas an exponent approaches black
 * without ever flattening.
 */
uniform float occlusionStrength;

/** The scene's own projection, and its inverse. Not the fullscreen quad's. */
uniform mat4 sceneProjection;
uniform mat4 sceneProjectionInverse;

uniform sampleBuffer {
    vec4 samples[32];
};

/**
 * How far in front of a sample geometry must sit before it counts as occluding, in angstroms.
 *
 * Without it a flat surface shadows itself: half the hemisphere's samples land fractionally
 * behind the surface they came from, and the result is a uniform grey wash with banding where
 * the depth buffer quantises.
 *
 * An absolute distance rather than a fraction of the radius, so that turning the radius up
 * always means more occlusion. Scaling it with the radius makes the two controls fight: a
 * larger radius reaches further, but also rejects more, and the slider stops behaving
 * monotonically.
 */
const float SELF_OCCLUSION_BIAS = 0.05;

/**
 * The eye-space position a g-buffer sample came from.
 *
 * The g-buffer stores clip-space position - gl_Position straight out of the vertex shader -
 * which is why this pass needs the projection's inverse to say anything geometric. Clip space
 * is not a space you can measure distances in: it is scaled by the projection and, under
 * perspective, divided by depth. Eye space is in angstroms, which is what makes the radius
 * below mean something.
 */
vec3 eyeFromClip(vec4 clipPos) {
    vec4 eye = sceneProjectionInverse * clipPos;
    return eye.xyz / eye.w;
}

void main() {

    vec4 normal_all = texture(gNormal, out_TexCoord0);

    // Alpha marks where geometry was drawn. Background gets no occlusion at all.
    if(normal_all.a <= 0.9) {
        fragColor = vec4(1.0, 1.0, 1.0, 1.0);
        return;
    }

    float nTiles_x = 1.0 / tileScale_x;
    float nTiles_y = 1.0 / tileScale_y;

    // The tile this fragment belongs to, so samples stay inside the same view.
    float tileOffset_x = tileScaleBase_x + tileScale_x * floor(out_TexCoord0.x * nTiles_x);
    float tileOffset_y = tileScaleBase_y + tileScale_y * floor(out_TexCoord0.y * nTiles_y);
    vec2 tileOffset = vec2(tileOffset_x, tileOffset_y);

    // Negated, because the g-buffer's is. triangle-gbuffer-vertex-shader.js writes
    // vNormal = -(rotMat * aVertexNormal), so what it stores points away from the viewer,
    // into the surface. The hemisphere has to be built on the outward normal or every sample
    // starts inside the geometry and the whole image comes out black - which is exactly what it
    // did. Nothing else reading this buffer notices: edge detection only compares neighbouring
    // normals to each other, where a global sign flip cancels.
    vec3 normal = normalize(-normal_all.rgb);
    vec3 fragPos = eyeFromClip(texture(gPosition, out_TexCoord0));
    vec3 randomVec = texture(texNoise, gl_FragCoord.xy / vec2(4.0)).xyz;

    // TBN change-of-basis matrix: tangent-space to view-space. The kernel is a hemisphere
    // about +z, so this turns it to face along the surface normal.
    vec3 tangent = normalize(randomVec - normal * dot(randomVec, normal));
    vec3 bitangent = cross(normal, tangent);
    mat3 TBN = mat3(tangent, bitangent, normal);

    float occlusion = 0.0;
    for(int i = 0; i < kernelSize; ++i)
    {
        // A point in the hemisphere above this fragment, radius angstroms across.
        vec3 samplePos = fragPos + (TBN * samples[i].xyz) * radius;

        // Where that point lands on screen, through the projection the scene was drawn with.
        // The old code projected with the fullscreen quad's own orthographic matrix, which
        // happened to be close to the identity for an orthographic scene and was simply wrong
        // under perspective.
        vec4 clipPos = sceneProjection * vec4(samplePos, 1.0);
        vec2 sampleUV = (clipPos.xy / clipPos.w) * 0.5 + 0.5;
        sampleUV = vec2(tileScale_x * sampleUV.x, tileScale_y * sampleUV.y) + tileOffset;

        // What is actually drawn there, in eye space.
        vec4 sampleNormal = texture(gNormal, sampleUV);
        vec3 sampleEye = eyeFromClip(texture(gPosition, sampleUV));

        // Occluded when real geometry sits in front of the sample point. Eye space looks down
        // -z, so nearer the viewer is the greater z. This is a visibility question - is
        // something in the way - where the old code asked only whether the depths were similar,
        // which darkens wherever neighbours happen to lie at a comparable distance and is why
        // it read as smudge rather than contact shading.
        bool occluded = sampleEye.z >= samplePos.z + SELF_OCCLUSION_BIAS;

        // Geometry far behind the fragment is not occluding it, it is merely behind it. Without
        // this, a surface in front of a distant one draws a halo around itself.
        float rangeCheck = smoothstep(0.0, 1.0, radius / max(abs(fragPos.z - sampleEye.z), 1e-4));

        // And nothing drawn at all means background: open sky, no occlusion.
        float drawn = sampleNormal.a > 0.9 ? 1.0 : 0.0;

        occlusion += (occluded ? 1.0 : 0.0) * rangeCheck * drawn;
    }

    // 0 where nothing blocks the hemisphere, 1 where everything does.
    occlusion /= float(kernelSize);

    // Visibility, then the strength curve. An unoccluded fragment has visibility 1.0, and 1.0 to
    // any power is 1.0, so turning the strength up never dirties the lit faces - it only deepens
    // what is already in shadow.
    float visibility = clamp(1.0 - occlusion, 0.0, 1.0);
    float ao = pow(visibility, occlusionStrength);
    fragColor = vec4(ao, ao, ao, 1.0);

}
`;

export {ssao_fragment_shader_source};

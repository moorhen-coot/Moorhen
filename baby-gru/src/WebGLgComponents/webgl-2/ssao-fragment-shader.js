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

// parameters (you'd probably want to use them as uniforms to more easily tweak the effect)
int kernelSize = 16;

uniform float radius;// = 0.4;
uniform float bias;// = 1.0;
uniform float depthFactor;

// tile noise texture over screen based on screen dimensions divided by noise size

in mediump mat4 pMatrix;

uniform sampleBuffer {
    vec4 samples[16];
};

void main() {

    // get input for SSAO algorithm

    vec4 normal_all = texture(gNormal, out_TexCoord0);
    vec3 tangent;
    vec3 bitangent;
    float occlusion;

    float nTiles_x = 1.0 / tileScale_x;
    float nTiles_y = 1.0 / tileScale_y;

    vec3 fragPos;

    float diffMult = 0.5 * depthBufferSize;
    if(normal_all.a>0.9){
        vec3 normal = normalize(normal_all.rgb);

        fragPos = depthFactor*texture(gPosition, out_TexCoord0).xyz;
        vec3 randomVec = texture(texNoise, gl_FragCoord.xy / vec2(4.0)).xyz;
        // create TBN change-of-basis matrix: from tangent-space to view-space
        tangent = normalize(randomVec - normal * dot(randomVec, normal));
        bitangent = cross(normal, tangent);
        mat3 TBN = mat3(tangent, bitangent, normal);
        // iterate over the sample kernel and calculate occlusion factor
        occlusion = 0.0;
        for(int i = 0; i < kernelSize; ++i)
        {
            // get sample position
            vec3 samplePos = TBN * samples[i].xyz; // from tangent to view-space
            samplePos = fragPos + samplePos * radius; 

            // project sample position (to sample texture) (to get position on screen/texture)
            vec4 offset = vec4(samplePos, 1.0);
            offset = pMatrix * offset; // from view to clip-space
            offset.xyz /= offset.w; // perspective divide
            offset.xyz = offset.xyz * 0.5 + 0.5; // transform to range 0.0 - 1.0

            // Work out base of our current multiview tile.
            float tileOffset_x = tileScaleBase_x+tileScale_x*floor(out_TexCoord0.x*nTiles_x);
            float tileOffset_y = tileScaleBase_y+tileScale_y*floor(out_TexCoord0.y*nTiles_y);
            vec2 tileOffset = vec2(tileOffset_x,tileOffset_y);
            // get depth value of kernel sample
            float sampleDepth = depthFactor*texture(gPosition, vec2(tileScale_x*offset.x,tileScale_y*offset.y)+tileOffset).z;
            float   dz = max ( fragPos.z - sampleDepth, 0.0 ) * diffMult;
            occlusion += 1.0 / ( 1.0 + dz*dz );

        }
        occlusion = pow(occlusion / float(kernelSize),1.5);
        occlusion += (1.0 - bias);
        if(occlusion>1.0) occlusion = 1.0;
    } else {
        occlusion = 1.0;
    }

    fragColor = vec4(occlusion,occlusion,occlusion,1.0);
    //fragColor = texture(gNormal,out_TexCoord0);
    //fragColor = vec4(fragPos.z,fragPos.z,fragPos.z,1.0);
    //fragColor = texture(texNoise,out_TexCoord0);
    //fragColor = vec4(bitangent,1.0);
    //fragColor = vec4(1.0);

}
`;

export {ssao_fragment_shader_source};

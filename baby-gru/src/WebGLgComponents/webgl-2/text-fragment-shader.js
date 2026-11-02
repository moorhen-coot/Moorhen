var text_fragment_shader_source = `#version 300 es\n
    precision mediump float;
    in lowp vec4 eyePos;
    in highp vec2 vTexture;

    uniform float fog_end;
    uniform float fog_start;

    uniform sampler2D uSampler;

    uniform vec4 clipPlane0;
    uniform vec4 clipPlane1;
    uniform vec4 clipPlane2;
    uniform vec4 clipPlane3;
    uniform vec4 clipPlane4;
    uniform vec4 clipPlane5;
    uniform vec4 clipPlane6;
    uniform vec4 clipPlane7;
    uniform int nClipPlanes;

    uniform int peelNumber;
    uniform highp sampler2D depthPeelSamplers;
    uniform bool haveOpaqueDepth;
    uniform highp sampler2D opaqueDepthSampler;
    uniform float xSSAOScaling;
    uniform float ySSAOScaling;

    out vec4 fragColor;

    void main(void) {

      if(dot(eyePos, clipPlane0)<0.0){
       discard;
      }
      if(dot(eyePos, clipPlane1)<0.0){
       discard;
      }
      if(haveOpaqueDepth) {
          vec2 opaque_coord = vec2(gl_FragCoord.x*xSSAOScaling,gl_FragCoord.y*ySSAOScaling);
          if(gl_FragCoord.z > texture(opaqueDepthSampler,opaque_coord).r) {
              discard;
          }
      }


      if(peelNumber>0) {
          vec2 tex_coord = vec2(gl_FragCoord.x*xSSAOScaling,gl_FragCoord.y*ySSAOScaling);
          highp float max_depth;
          max_depth = texture(depthPeelSamplers,tex_coord).r;
          // No gl_FrontFacing test. There used to be one here, and only here: the first transparent
          // layer runs without this block, so it kept back faces and every later layer threw them
          // away. Whether a back-facing surface showed therefore depended on whether anything
          // transparent was in front of it - the far inside wall of a clipped-open surface vanished
          // behind a hover ball, which was then blended over the bare background and came out
          // cream. Every layer now keeps every face, as a see-through surface really looks.
          if(gl_FragCoord.z <= max_depth || abs(gl_FragCoord.z - max_depth)<1e-6 ) {
              discard;
          }
      }

      float FogFragCoord = abs(eyePos.z/eyePos.w);
      float fogFactor = (fog_end - FogFragCoord)/(fog_end - fog_start);
      fogFactor = 1.0 - clamp(fogFactor,0.0,1.0);
      fragColor = texture(uSampler, vec2(vTexture.s, vTexture.t));
    }
`;

export {text_fragment_shader_source};

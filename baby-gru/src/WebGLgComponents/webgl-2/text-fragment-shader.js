var text_fragment_shader_source = `#version 300 es\n
    precision mediump float;
    in lowp vec4 eyePos;
    in lowp vec2 vTexture;

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
    uniform sampler2D depthPeelSamplers;
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

      if(peelNumber>0) {
          vec2 tex_coord = vec2(gl_FragCoord.x*xSSAOScaling,gl_FragCoord.y*xSSAOScaling);
          float max_depth;
          max_depth = texture(depthPeelSamplers,tex_coord).r;
          if(gl_FragCoord.z <= max_depth || abs(gl_FragCoord.z - max_depth)<1e-6 || gl_FrontFacing!=true ) {
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

var depth_peel_accum_fragment_shader_source = `#version 300 es\n

    precision mediump float;
    in lowp vec2 vTexture;

    uniform int peelNumber;
    uniform sampler2D depthPeelSamplers[4];
    uniform sampler2D colorPeelSamplers[4];
    
    out vec4 fragColor;

    void main(void) {


        if(peelNumber>-1) {
          float depth;
          switch(peelNumber){
              case 0:
                  depth = texture(depthPeelSamplers[0],vTexture).r;
                  if(depth<1.0) {
                      vec4 color = texture(colorPeelSamplers[0], vTexture);
                      fragColor = color;
                  } else {
                      discard;
                  }
                  break;
              case 1:
                  depth = texture(depthPeelSamplers[1],vTexture).r;
                  if(depth<1.0) {
                      vec4 color = texture(colorPeelSamplers[1], vTexture);
                      fragColor = color;
                  } else {
                      discard;
                  }
                  break;
              case 2:
                  depth = texture(depthPeelSamplers[2],vTexture).r;
                  if(depth<1.0) {
                      vec4 color = texture(colorPeelSamplers[2], vTexture);
                      fragColor = color;
                  } else {
                      discard;
                  }
                  break;
              case 3:
                  depth = texture(depthPeelSamplers[3],vTexture).r;
                  if(depth<1.0) {
                      vec4 color = texture(colorPeelSamplers[3], vTexture);
                      fragColor = color;
                  } else {
                      discard;
                  }
                  break;
          }
      }

    }
`;

export {depth_peel_accum_fragment_shader_source};

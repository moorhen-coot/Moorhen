var triangle_texture_fragment_shader_source = `#version 300 es\n
    precision mediump float;
    in lowp vec2 vTexture;
    in lowp vec4 eyePos;

    uniform sampler2D valueMap;
    uniform sampler2D colorMap;

    uniform vec4 fogColour;

    uniform float fog_end;
    uniform float fog_start;

    uniform vec4 clipPlane0;
    uniform vec4 clipPlane1;
    uniform vec4 clipPlane2;
    uniform vec4 clipPlane3;
    uniform vec4 clipPlane4;
    uniform vec4 clipPlane5;
    uniform vec4 clipPlane6;
    uniform vec4 clipPlane7;
    uniform int nClipPlanes;

    out vec4 fragColor;

    void main(void) {

      if(dot(eyePos, clipPlane0)<0.0){
       discard;
      }
      if(dot(eyePos, clipPlane1)<0.0){
       discard;
      }

      float FogFragCoord = abs(eyePos.z/eyePos.w);
      float fogFactor = (fog_end - FogFragCoord)/(fog_end - fog_start);
      fogFactor = 1.0 - clamp(fogFactor,0.0,1.0);

      float edge = texture(valueMap, vTexture).x;
      vec4 color = texture(colorMap,vec2(edge, 0.5) );
      //vec4 color = vec4(edge,edge,edge,1.0);

      fragColor = mix(color, fogColour, fogFactor );
    }
`;

export {triangle_texture_fragment_shader_source};

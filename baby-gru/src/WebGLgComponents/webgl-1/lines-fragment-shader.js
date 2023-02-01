var lines_fragment_shader_source = `
#extension GL_OES_element_index : enable
    precision mediump float;
    varying lowp vec4 vColor;
    varying lowp vec4 eyePos;

    uniform float fog_end;
    uniform float fog_start;

    uniform vec4 fogColour;

    uniform vec4 clipPlane0;
    uniform vec4 clipPlane1;
    uniform vec4 clipPlane2;
    uniform vec4 clipPlane3;
    uniform vec4 clipPlane4;
    uniform vec4 clipPlane5;
    uniform vec4 clipPlane6;
    uniform vec4 clipPlane7;
    uniform int nClipPlanes;

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
      gl_FragColor = mix(vColor, fogColour, fogFactor );
    }
`;

export {lines_fragment_shader_source};
